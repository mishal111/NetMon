import asyncio
import sqlite3
import logging
from typing import List, Optional

from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from influxdb import InfluxDBClient
import uvicorn

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(
    title="Network Security Monitoring Dashboard",
    description="Real-time network packet monitoring and anomaly detection",
    version="1.0"
)

# Enable CORS (Cross-Origin Resource Sharing) for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# InfluxDB Connection
# ==========================================
try:
    influx = InfluxDBClient(host='localhost', port=8086, username='admin', password='admin', database='network_security')
except Exception as e:
    logger.error(f"Error connecting to InfluxDB on startup: {e}")
    influx = None

def query_influx(query_string):
    """Execute InfluxDB query"""
    if not influx:
        return []
    try:
        results = influx.query(query_string)
        return list(results.get_points())
    except Exception as e:
        logger.error(f"InfluxDB query error: {e}")
        return []

# ==========================================
# Database Connection Helpers
# ==========================================
def get_db_connection():
    conn = sqlite3.connect("network_packets.db")
    conn.row_factory = sqlite3.Row  # Return rows as dictionaries
    return conn

def get_packets(limit: int = 100, protocol: Optional[int] = None):
    """Query packets from database"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if protocol is None:
        cursor.execute("SELECT * FROM packets ORDER BY id DESC LIMIT ?", (limit,))
    else:
        cursor.execute(
            "SELECT * FROM packets WHERE protocol = ? ORDER BY id DESC LIMIT ?",
            (protocol, limit)
        )
    
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

def get_protocol_stats():
    """Get count of packets by protocol"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT protocol, COUNT(*) as count
        FROM packets
        GROUP BY protocol
    """)
    
    stats = {}
    protocol_names = {6: "TCP", 17: "UDP", 1: "ICMP"}
    
    for row in cursor.fetchall():
        proto_name = protocol_names.get(row["protocol"], f"Other({row['protocol']})")
        stats[proto_name] = row["count"]
    
    conn.close()
    return stats

def get_top_ips(limit: int = 10):
    """Get top source IPs by packet count"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT src_ip, COUNT(*) as count
        FROM packets
        GROUP BY src_ip
        ORDER BY count DESC
        LIMIT ?
    """, (limit,))
    
    results = [{"ip": row["src_ip"], "count": row["count"]} for row in cursor.fetchall()]
    conn.close()
    return results

def get_top_ports(limit: int = 10):
    """Get top destination ports"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT port, COUNT(*) as count
        FROM packets
        WHERE port IS NOT NULL
        GROUP BY port
        ORDER BY count DESC
        LIMIT ?
    """, (limit,))
    
    results = [{"port": row["port"], "count": row["count"]} for row in cursor.fetchall()]
    conn.close()
    return results

# ==========================================
# Alerts Database Helpers
# ==========================================
def get_alerts(limit: int = 100):
    """Query alerts from database"""
    try:
        conn = get_db_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM alerts ORDER BY id DESC LIMIT ?", (limit,))
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    except sqlite3.OperationalError:
        return []

def get_alerts_summary():
    """Get alert counts by severity and type"""
    try:
        conn = get_db_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT severity, COUNT(*) as count FROM alerts GROUP BY severity")
        by_severity = {row["severity"]: row["count"] for row in cursor.fetchall()}
        
        cursor.execute("SELECT alert_type, COUNT(*) as count FROM alerts GROUP BY alert_type")
        by_type = {row["alert_type"]: row["count"] for row in cursor.fetchall()}
        
        conn.close()
        return {"by_severity": by_severity, "by_type": by_type}
    except sqlite3.OperationalError:
        return {"by_severity": {}, "by_type": {}}

# ==========================================
# WebSocket Manager & Broadcaster
# ==========================================
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"[+] Client connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        logger.info(f"[-] Client disconnected. Total connections: {len(self.active_connections)}")
    
    async def broadcast(self, message: dict):
        """Send message to all connected clients"""
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"[!] Error sending to client: {e}")

manager = ConnectionManager()

async def packet_broadcaster():
    """Continuously broadcast new packets to WebSocket clients"""
    last_id = 0
    
    # Initialize last_id to the max ID in the db so we don't dump everything on startup
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT MAX(id) as max_id FROM packets")
        row = cursor.fetchone()
        if row and row["max_id"] is not None:
            last_id = row["max_id"]
        conn.close()
    except Exception as e:
        logger.warning(f"Could not initialize last_id for broadcaster: {e}")

    while True:
        try:
            # Query for new packets since last check
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute("SELECT * FROM packets WHERE id > ? ORDER BY id", (last_id,))
            new_packets = cursor.fetchall()
            conn.close()
            
            if new_packets:
                for packet in new_packets:
                    await manager.broadcast({
                        "type": "new_packet",
                        "packet": dict(packet)
                    })
                    last_id = packet["id"]
            
            # Check every 1 second
            await asyncio.sleep(1)
        
        except sqlite3.OperationalError:
            # Table might not exist yet
            await asyncio.sleep(2)
        except Exception as e:
            logger.error(f"[!] Error in packet broadcaster: {e}")
            await asyncio.sleep(1)

async def alert_broadcaster():
    """Continuously broadcast new alerts to WebSocket clients"""
    last_id = 0
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT MAX(id) as max_id FROM alerts")
        row = cursor.fetchone()
        if row and row["max_id"] is not None:
            last_id = row["max_id"]
        conn.close()
    except Exception:
        pass

    while True:
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM alerts WHERE id > ? ORDER BY id", (last_id,))
            new_alerts = cursor.fetchall()
            conn.close()
            
            if new_alerts:
                for alert in new_alerts:
                    await manager.broadcast({
                        "type": "new_alert",
                        "alert": dict(alert)
                    })
                    last_id = alert["id"]
            
            await asyncio.sleep(2)
        
        except sqlite3.OperationalError:
            await asyncio.sleep(5)
        except Exception as e:
            logger.error(f"[!] Error in alert broadcaster: {e}")
            await asyncio.sleep(2)

# ==========================================
# REST API Endpoints
# ==========================================
@app.on_event("startup")
async def startup_event():
    logger.info("[+] FastAPI server started")
    # Start packet broadcaster in background
    asyncio.create_task(packet_broadcaster())
    # Start alert broadcaster in background
    asyncio.create_task(alert_broadcaster())

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("[+] FastAPI server stopped")

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/packets")
async def fetch_packets(limit: int = Query(100, ge=1, le=1000)):
    """Get recent captured packets"""
    try:
        packets = get_packets(limit=limit)
        return {
            "count": len(packets),
            "packets": packets
        }
    except sqlite3.OperationalError as e:
        logger.error(f"Error fetching packets: {e}")
        return {"error": "Database not initialized. Please run capture.py first.", "count": 0, "packets": []}
    except Exception as e:
        logger.error(f"Error fetching packets: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/packets/protocol/{protocol}")
async def fetch_packets_by_protocol(protocol: int, limit: int = Query(100, ge=1, le=1000)):
    """Get packets filtered by protocol"""
    valid_protocols = {1: "ICMP", 6: "TCP", 17: "UDP"}
    
    if protocol not in valid_protocols:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid protocol. Must be one of: {list(valid_protocols.values())}"
        )
    
    try:
        packets = get_packets(limit=limit, protocol=protocol)
        return {
            "protocol": valid_protocols[protocol],
            "count": len(packets),
            "packets": packets
        }
    except sqlite3.OperationalError:
        return {"protocol": valid_protocols[protocol], "count": 0, "packets": []}
    except Exception as e:
        logger.error(f"Error fetching packets by protocol: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/stats/protocols")
async def get_protocol_statistics():
    """Get packet count breakdown by protocol"""
    try:
        stats = get_protocol_stats()
        total = sum(stats.values())
        return {
            "total_packets": total,
            "by_protocol": stats
        }
    except sqlite3.OperationalError:
        return {"total_packets": 0, "by_protocol": {}}

@app.get("/stats/top-ips")
async def get_top_source_ips(limit: int = Query(10, ge=1, le=100)):
    """Get top source IPs by packet count"""
    try:
        top_ips = get_top_ips(limit=limit)
        return {
            "limit": limit,
            "count": len(top_ips),
            "ips": top_ips
        }
    except sqlite3.OperationalError:
        return {"limit": limit, "count": 0, "ips": []}

@app.get("/stats/top-ports")
async def get_top_destination_ports(limit: int = Query(10, ge=1, le=100)):
    """Get top destination ports"""
    try:
        top_ports = get_top_ports(limit=limit)
        return {
            "limit": limit,
            "count": len(top_ports),
            "ports": top_ports
        }
    except sqlite3.OperationalError:
         return {"limit": limit, "count": 0, "ports": []}

@app.get("/stats/summary")
async def get_summary_statistics():
    """Get overall summary of captured traffic"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Total packets
        cursor.execute("SELECT COUNT(*) as total FROM packets")
        total_packets = cursor.fetchone()["total"]
        
        # Total bytes
        cursor.execute("SELECT SUM(size) as total_bytes FROM packets")
        total_bytes = cursor.fetchone()["total_bytes"] or 0
        
        # Unique IPs
        cursor.execute("SELECT COUNT(DISTINCT src_ip) as unique_ips FROM packets")
        unique_ips = cursor.fetchone()["unique_ips"]
        
        conn.close()
        
        return {
            "total_packets": total_packets,
            "total_bytes": total_bytes,
            "unique_source_ips": unique_ips,
            "protocols": get_protocol_stats(),
            "top_ips": get_top_ips(limit=5),
            "top_ports": get_top_ports(limit=5)
        }
    except sqlite3.OperationalError:
        return {
            "total_packets": 0,
            "total_bytes": 0,
            "unique_source_ips": 0,
            "protocols": {},
            "top_ips": [],
            "top_ports": []
        }

# ==========================================
# InfluxDB Metrics Endpoints
# ==========================================
@app.get("/metrics/traffic-last-hour")
async def get_traffic_last_hour():
    """Get traffic metrics for the last hour (5-minute intervals)"""
    query = """
        SELECT 
            MEAN(packet_count) as packets,
            MEAN(byte_count) as bytes,
            MEAN(avg_packet_size) as avg_size
        FROM network_traffic
        WHERE type='overall' AND time > now() - 1h
        GROUP BY time(5m)
    """
    
    data = query_influx(query)
    return {
        "time_range": "last_hour",
        "interval": "5 minutes",
        "points": data,
        "count": len(data)
    }

@app.get("/metrics/protocols-last-hour")
async def get_protocols_last_hour():
    """Get protocol breakdown for the last hour"""
    query = """
        SELECT 
            SUM(count) as total
        FROM network_traffic
        WHERE type='by_protocol' AND time > now() - 1h
        GROUP BY protocol
    """
    
    data = query_influx(query)
    
    # Format as list of {protocol, count} objects
    formatted = [
        {"protocol": point.get("protocol"), "count": point.get("total")}
        for point in data
    ]
    
    return {
        "time_range": "last_hour",
        "protocols": formatted,
        "count": len(formatted)
    }

@app.get("/metrics/top-ips-realtime")
async def get_top_ips_realtime():
    """Get current top IPs from InfluxDB"""
    query = """
        SELECT packet_count, ip
        FROM top_ips
        WHERE time > now() - 1m
    """
    
    data = query_influx(query)
    
    # Sort in python and get top 10 unique IPs (handling multiple snapshots in last min)
    ip_max = {}
    for pt in data:
        ip = pt.get("ip")
        count = pt.get("packet_count", 0)
        if ip and count > ip_max.get(ip, 0):
            ip_max[ip] = count
            
    sorted_ips = sorted([{"ip": k, "count": v} for k, v in ip_max.items()], key=lambda x: x["count"], reverse=True)
    
    return {
        "type": "top_ips",
        "time_range": "last_10_minutes",
        "ips": sorted_ips[:10],
        "count": len(sorted_ips[:10])
    }

@app.get("/metrics/top-ports-realtime")
async def get_top_ports_realtime():
    """Get current top ports from InfluxDB"""
    query = """
        SELECT packet_count, port
        FROM top_ports
        WHERE time > now() - 1m
    """
    
    data = query_influx(query)
    
    port_max = {}
    for pt in data:
        port = pt.get("port")
        count = pt.get("packet_count", 0)
        if port and count > port_max.get(port, 0):
            port_max[port] = count
            
    sorted_ports = sorted([{"port": k, "count": v} for k, v in port_max.items()], key=lambda x: x["count"], reverse=True)
    
    return {
        "type": "top_ports",
        "time_range": "last_10_minutes",
        "ports": sorted_ports[:10],
        "count": len(sorted_ports[:10])
    }

# ==========================================
# Alerts Endpoints
# ==========================================
@app.get("/alerts")
async def fetch_alerts(limit: int = Query(50, ge=1, le=500)):
    """Get recent alerts"""
    alerts = get_alerts(limit=limit)
    return {
        "count": len(alerts),
        "alerts": alerts
    }

@app.get("/alerts/summary")
async def fetch_alerts_summary():
    """Get summary of alerts"""
    return get_alerts_summary()

# ==========================================
# Forensics & PCAP Recording Endpoints
# ==========================================
import os
import glob
from datetime import datetime
from scapy.all import PcapReader, IP, TCP, UDP

# Global state for PCAP replay control
REPLAY_STATE = {
    "status": "stopped", # playing, paused, stopped
    "current": 0,
    "total": 0,
    "filename": ""
}

@app.post("/api/forensics/record/start")
async def start_recording():
    """Start PCAP recording by setting flag in DB"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Ensure directory exists
        os.makedirs("pcaps", exist_ok=True)
        filename = f"pcaps/capture_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pcap"
        
        cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('recording_file', ?)", (filename,))
        conn.commit()
        conn.close()
        return {"status": "success", "filename": filename}
    except Exception as e:
        logger.error(f"Error starting recording: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/forensics/record/stop")
async def stop_recording():
    """Stop PCAP recording"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT value FROM settings WHERE key='recording_file'")
        row = cursor.fetchone()
        filename = row["value"] if row else None
        
        cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('recording_file', '')")
        conn.commit()
        conn.close()
        
        return {"status": "success", "stopped_file": filename}
    except Exception as e:
        logger.error(f"Error stopping recording: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/forensics/recordings")
async def list_recordings():
    """List all saved PCAP files"""
    try:
        os.makedirs("pcaps", exist_ok=True)
        files = glob.glob("pcaps/*.pcap")
        
        # Sort by modification time, newest first
        files.sort(key=os.path.getmtime, reverse=True)
        
        recordings = []
        for f in files:
            stat = os.stat(f)
            recordings.append({
                "filename": os.path.basename(f),
                "path": f,
                "size_bytes": stat.st_size,
                "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat()
            })
            
        return {"recordings": recordings}
    except Exception as e:
        logger.error(f"Error listing recordings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def replay_pcap_task(filepath: str):
    """Background task to slowly read a PCAP and broadcast packets"""
    global REPLAY_STATE
    
    logger.info(f"Starting replay of {filepath}")
    filename = os.path.basename(filepath)
    
    try:
        # Pre-scan for total packets
        total_packets = 0
        with PcapReader(filepath) as pcap_reader:
            for packet in pcap_reader:
                if IP in packet:
                    total_packets += 1
                    
        REPLAY_STATE = {
            "status": "playing",
            "current": 0,
            "total": total_packets,
            "filename": filename
        }
        
        # Notify frontend that replay started
        await manager.broadcast({
            "type": "replay_start",
            "filename": filename,
            "total": total_packets
        })
        
        # We need a dedicated DB connection for the background task
        conn = get_db_connection()
        cursor = conn.cursor()
        
        with PcapReader(filepath) as pcap_reader:
            for packet in pcap_reader:
                # Check control state
                while REPLAY_STATE["status"] == "paused":
                    await asyncio.sleep(0.5)
                
                if REPLAY_STATE["status"] == "stopped":
                    break
                    
                if IP not in packet:
                    continue
                
                REPLAY_STATE["current"] += 1
                    
                src_ip = packet[IP].src
                dst_ip = packet[IP].dst
                proto = packet[IP].proto
                port = None
                
                if TCP in packet:
                    port = packet[TCP].dport
                elif UDP in packet:
                    port = packet[UDP].dport
                
                size = len(packet)
                timestamp = datetime.now().isoformat()
                
                # Insert into database so normal flows see it
                cursor.execute("""
                    INSERT INTO packets (timestamp, src_ip, dst_ip, protocol, port, size)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (timestamp, src_ip, dst_ip, proto, port, size))
                
                # Also directly broadcast to ensure it hits UI immediately during replay
                packet_data = {
                    "id": cursor.lastrowid,
                    "timestamp": timestamp,
                    "src_ip": src_ip,
                    "dst_ip": dst_ip,
                    "protocol": proto,
                    "port": port,
                    "size": size
                }
                
                await manager.broadcast({
                    "type": "new_packet",
                    "packet": packet_data
                })
                
                # Broadcast progress
                await manager.broadcast({
                    "type": "replay_progress",
                    "current": REPLAY_STATE["current"],
                    "total": REPLAY_STATE["total"],
                    "status": REPLAY_STATE["status"]
                })
                
                # Sleep a tiny bit to animate the replay nicely (e.g. 20 packets a sec)
                await asyncio.sleep(0.05)
                
        conn.commit()
        conn.close()
        
        REPLAY_STATE["status"] = "stopped"
        
        # Notify frontend that replay finished
        await manager.broadcast({
            "type": "replay_end",
            "filename": filename
        })
        
        logger.info(f"Finished replay of {filepath}")
        
    except Exception as e:
        logger.error(f"Error replaying PCAP {filepath}: {e}")

@app.post("/api/forensics/replay/{filename}")
async def replay_recording(filename: str):
    """Start replaying a PCAP file"""
    filepath = os.path.join("pcaps", filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found")
        
    # If another replay is active, stop it first
    global REPLAY_STATE
    if REPLAY_STATE["status"] != "stopped":
        REPLAY_STATE["status"] = "stopped"
        
    # Launch in background
    asyncio.create_task(replay_pcap_task(filepath))
    return {"status": "success", "message": f"Started replay of {filename}"}

@app.post("/api/forensics/replay/pause")
async def pause_replay():
    global REPLAY_STATE
    if REPLAY_STATE["status"] == "playing":
        REPLAY_STATE["status"] = "paused"
        
        # Broadcast progress update immediately so UI updates
        await manager.broadcast({
            "type": "replay_progress",
            "current": REPLAY_STATE["current"],
            "total": REPLAY_STATE["total"],
            "status": "paused"
        })
    return {"status": REPLAY_STATE["status"]}

@app.post("/api/forensics/replay/play")
async def resume_replay():
    global REPLAY_STATE
    if REPLAY_STATE["status"] == "paused":
        REPLAY_STATE["status"] = "playing"
        
        await manager.broadcast({
            "type": "replay_progress",
            "current": REPLAY_STATE["current"],
            "total": REPLAY_STATE["total"],
            "status": "playing"
        })
    return {"status": REPLAY_STATE["status"]}

@app.post("/api/forensics/replay/stop")
async def stop_replay():
    global REPLAY_STATE
    REPLAY_STATE["status"] = "stopped"
    return {"status": REPLAY_STATE["status"]}

# ==========================================
# WebSocket Endpoint
# ==========================================
@app.websocket("/ws/packets")
async def websocket_packets(websocket: WebSocket):
    """WebSocket endpoint for real-time packet streaming"""
    await manager.connect(websocket)
    
    try:
        while True:
            # Receive any message from client (keep connection alive)
            data = await websocket.receive_text()
            # Echo back to client
            await websocket.send_json({"status": "connected", "echo": data})
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        manager.disconnect(websocket)
        logger.error(f"[!] WebSocket error: {e}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
