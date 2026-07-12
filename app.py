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

# ==========================================
# REST API Endpoints
# ==========================================
@app.on_event("startup")
async def startup_event():
    logger.info("[+] FastAPI server started")
    # Start packet broadcaster in background
    asyncio.create_task(packet_broadcaster())

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
        SELECT MAX(packet_count) as count
        FROM top_ips
        WHERE time > now() - 10m
        GROUP BY ip
        ORDER BY count DESC
        LIMIT 10
    """
    
    data = query_influx(query)
    return {
        "type": "top_ips",
        "time_range": "last_10_minutes",
        "ips": data,
        "count": len(data)
    }

@app.get("/metrics/top-ports-realtime")
async def get_top_ports_realtime():
    """Get current top ports from InfluxDB"""
    query = """
        SELECT MAX(packet_count) as count
        FROM top_ports
        WHERE time > now() - 10m
        GROUP BY port
        ORDER BY count DESC
        LIMIT 10
    """
    
    data = query_influx(query)
    return {
        "type": "top_ports",
        "time_range": "last_10_minutes",
        "ports": data,
        "count": len(data)
    }

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
