"""
Anomaly Detection Engine
Analyzes traffic patterns and identifies suspicious activity
"""

import sqlite3
from influxdb import InfluxDBClient
from datetime import datetime, timedelta
import time
import logging
import argparse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DetectionEngine:
    def __init__(self, db_path="network_packets.db"):
        self.db_path = db_path
        self.influx = InfluxDBClient(host='localhost', port=8086, username='admin', password='admin', database='network_security')
        self.setup_alerts_table()
    
    def setup_alerts_table(self):
        """Create alerts table if it doesn't exist"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                alert_type TEXT,
                severity TEXT,
                description TEXT
            )
        """)
        conn.commit()
        conn.close()
        logger.info("[+] Alerts table initialized")
    
    def get_packets_last_minute(self):
        """Fetch packets from SQLite for the last minute"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            time_ago = (datetime.now() - timedelta(minutes=1)).isoformat()
            
            cursor.execute("SELECT * FROM packets WHERE timestamp > ?", (time_ago,))
            packets = [dict(row) for row in cursor.fetchall()]
            conn.close()
            return packets
        except sqlite3.OperationalError:
            return []

    def get_latest_traffic_volume(self):
        """Fetch the latest packet count from InfluxDB"""
        try:
            query = "SELECT LAST(packet_count) as packets FROM network_traffic WHERE type='overall' AND time > now() - 2m"
            result = self.influx.query(query)
            points = list(result.get_points())
            if points:
                return points[0]['packets']
            return 0
        except Exception as e:
            logger.error(f"InfluxDB query error: {e}")
            return 0

    def log_alert(self, alert_type, severity, description):
        """Store alert in database"""
        timestamp = datetime.now().isoformat()
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO alerts (timestamp, alert_type, severity, description) VALUES (?, ?, ?, ?)",
                (timestamp, alert_type, severity, description)
            )
            conn.commit()
            conn.close()
            logger.warning(f"[!] ALERT TRIGGERED: {severity} - {alert_type}: {description}")
        except Exception as e:
            logger.error(f"Failed to log alert: {e}")

    def detect_ddos(self, threshold_pps=500):
        """
        Detect volume spikes
        Threshold represents packets per second. Since our analytics engine measures over a 60-second window,
        the threshold for total packets is threshold_pps * 60.
        """
        latest_count = self.get_latest_traffic_volume()
        
        # If the number of packets in the 60 second window exceeds threshold
        if latest_count > (threshold_pps * 60):
            self.log_alert(
                alert_type="Volume Spike",
                severity="HIGH",
                description=f"Potential DDoS or traffic flood detected. {latest_count} packets in the last minute (threshold: {threshold_pps * 60})."
            )

    def detect_port_scans(self, distinct_ports_threshold=20):
        """Detect if a single IP connects to many distinct ports rapidly"""
        packets = self.get_packets_last_minute()
        if not packets:
            return
        
        # Group distinct ports by source IP
        ip_ports = {}
        for pkt in packets:
            src_ip = pkt['src_ip']
            port = pkt['port']
            
            if port is not None:
                if src_ip not in ip_ports:
                    ip_ports[src_ip] = set()
                ip_ports[src_ip].add(port)
        
        # Check against threshold
        for src_ip, ports in ip_ports.items():
            if len(ports) > distinct_ports_threshold:
                self.log_alert(
                    alert_type="Port Scan",
                    severity="MEDIUM",
                    description=f"Source IP {src_ip} scanned {len(ports)} distinct ports in the last minute."
                )

    def run_continuous(self, interval=10, ddos_threshold=500, scan_threshold=20):
        """Run anomaly detection continuously"""
        logger.info(f"[+] Starting anomaly detection engine (interval: {interval}s)")
        
        try:
            while True:
                self.detect_ddos(threshold_pps=ddos_threshold)
                self.detect_port_scans(distinct_ports_threshold=scan_threshold)
                time.sleep(interval)
        except KeyboardInterrupt:
            logger.info("[!] Detector stopped")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--interval", type=int, default=10, help="Run interval in seconds")
    parser.add_argument("--ddos-pps", type=int, default=500, help="Packets per second threshold for DDoS")
    parser.add_argument("--scan-ports", type=int, default=20, help="Distinct ports threshold for port scan")
    args = parser.parse_args()
    
    engine = DetectionEngine()
    engine.run_continuous(
        interval=args.interval, 
        ddos_threshold=args.ddos_pps, 
        scan_threshold=args.scan_ports
    )
