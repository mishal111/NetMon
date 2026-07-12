"""
Analytics Engine
Computes metrics from captured packets and stores in InfluxDB
"""

from influxdb import InfluxDBClient
import sqlite3
from datetime import datetime, timedelta
import time
import logging
import argparse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AnalyticsEngine:
    def __init__(self, influx_host='localhost', influx_port=8086, db='network_security'):
        # Connect to InfluxDB
        self.influx = InfluxDBClient(
            host=influx_host,
            port=influx_port,
            username='admin',
            password='admin',
            database=db
        )
        
        # Create database if it doesn't exist
        self.db_name = db
        try:
            self.influx.create_database(db)
            logger.info(f"[+] Connected to InfluxDB database: {db}")
        except Exception as e:
            logger.info(f"[*] Database {db} already exists or error: {e}")
    
    def get_packets_since(self, minutes=1):
        """Get packets from SQLite from the last N minutes"""
        try:
            conn = sqlite3.connect("network_packets.db")
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Calculate timestamp from N minutes ago
            time_ago = (datetime.now() - timedelta(minutes=minutes)).isoformat()
            
            cursor.execute("""
                SELECT * FROM packets
                WHERE timestamp > ?
                ORDER BY timestamp
            """, (time_ago,))
            
            packets = [dict(row) for row in cursor.fetchall()]
            conn.close()
            return packets
        except sqlite3.OperationalError:
            # Table might not exist yet
            return []
    
    def compute_protocol_stats(self, packets):
        """Count packets by protocol"""
        stats = {"TCP": 0, "UDP": 0, "ICMP": 0, "Other": 0}
        protocol_map = {6: "TCP", 17: "UDP", 1: "ICMP"}
        
        for packet in packets:
            proto_name = protocol_map.get(packet['protocol'], 'Other')
            stats[proto_name] += 1
        
        return stats
    
    def compute_traffic_volume(self, packets):
        """Calculate total bytes and packets"""
        total_packets = len(packets)
        total_bytes = sum(pkt['size'] for pkt in packets if pkt['size'])
        
        return {
            "packet_count": total_packets,
            "byte_count": total_bytes,
            "avg_packet_size": total_bytes // total_packets if total_packets > 0 else 0
        }
    
    def compute_top_ips(self, packets, limit=5):
        """Get top source IPs"""
        ip_counts = {}
        for pkt in packets:
            ip = pkt['src_ip']
            ip_counts[ip] = ip_counts.get(ip, 0) + 1
        
        sorted_ips = sorted(ip_counts.items(), key=lambda x: x[1], reverse=True)
        return sorted_ips[:limit]
    
    def compute_top_ports(self, packets, limit=5):
        """Get top destination ports"""
        port_counts = {}
        for pkt in packets:
            port = pkt['port']
            if port is not None:
                port_counts[port] = port_counts.get(port, 0) + 1
        
        sorted_ports = sorted(port_counts.items(), key=lambda x: x[1], reverse=True)
        return sorted_ports[:limit]
    
    def write_metrics(self, timestamp=None):
        """Compute all metrics and write to InfluxDB"""
        if timestamp is None:
            timestamp = datetime.utcnow().isoformat() + 'Z'
        
        # Get packets from last minute
        packets = self.get_packets_since(minutes=1)
        
        if not packets:
            logger.info("[!] No packets found in last minute (waiting for traffic...)")
            return
        
        logger.info(f"[*] Processing {len(packets)} packets")
        
        # Compute metrics
        protocol_stats = self.compute_protocol_stats(packets)
        traffic = self.compute_traffic_volume(packets)
        top_ips = self.compute_top_ips(packets, limit=5)
        top_ports = self.compute_top_ports(packets, limit=5)
        
        # Prepare InfluxDB points
        points = []
        
        # Point 1: Overall traffic volume
        points.append({
            "measurement": "network_traffic",
            "tags": {
                "host": "local",
                "type": "overall"
            },
            "fields": traffic,
            "time": timestamp
        })
        
        # Point 2: Protocol breakdown
        for proto, count in protocol_stats.items():
            if count > 0:
                points.append({
                    "measurement": "network_traffic",
                    "tags": {
                        "host": "local",
                        "protocol": proto,
                        "type": "by_protocol"
                    },
                    "fields": {
                        "count": count
                    },
                    "time": timestamp
                })
        
        # Point 3: Top IPs
        for i, (ip, count) in enumerate(top_ips):
            points.append({
                "measurement": "top_ips",
                "tags": {
                    "host": "local",
                    "ip": ip,
                    "rank": str(i + 1)
                },
                "fields": {
                    "packet_count": count
                },
                "time": timestamp
            })
        
        # Point 4: Top ports
        for i, (port, count) in enumerate(top_ports):
            points.append({
                "measurement": "top_ports",
                "tags": {
                    "host": "local",
                    "port": str(port),
                    "rank": str(i + 1)
                },
                "fields": {
                    "packet_count": count
                },
                "time": timestamp
            })
        
        # Write to InfluxDB
        try:
            self.influx.write_points(points)
            logger.info(f"[+] Wrote {len(points)} points to InfluxDB")
        except Exception as e:
            logger.error(f"[!] Error writing to InfluxDB: {e}")
    
    def run_continuous(self, interval=10):
        """Run analytics continuously every N seconds"""
        logger.info(f"[+] Starting analytics engine (interval: {interval}s)")
        
        try:
            while True:
                self.write_metrics()
                time.sleep(interval)
        except KeyboardInterrupt:
            logger.info("[!] Analytics stopped")
        finally:
            self.influx.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--interval", type=int, default=10, help="Polling interval in seconds")
    args = parser.parse_args()
    
    engine = AnalyticsEngine()
    engine.run_continuous(interval=args.interval)
