#!/usr/bin/env python3
"""
Network Packet Capture Script
Captures live network packets and stores in SQLite database
"""

from scapy.all import sniff, IP, TCP, UDP
from scapy.utils import PcapWriter
from datetime import datetime
import sqlite3
import argparse
import signal
import sys
import threading
import time

class PacketCapture:
    def __init__(self, db_path="network_packets.db"):
        self.db_path = db_path
        self.conn = None
        self.cursor = None
        self.packet_count = 0
        self.recording_file = None
        self.pcap_writer = None
        self.is_running = True
        self.setup_database()
        
        # Start settings watcher thread
        self.settings_thread = threading.Thread(target=self.watch_settings, daemon=True)
        self.settings_thread.start()
    
    def setup_database(self):
        """Create database and table if they don't exist"""
        self.conn = sqlite3.connect(self.db_path)
        self.cursor = self.conn.cursor()
        
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS packets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                src_ip TEXT,
                dst_ip TEXT,
                protocol INTEGER,
                port INTEGER,
                size INTEGER
            )
        """)
        
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        """)
        self.conn.commit()
        print(f"[+] Database initialized: {self.db_path}")

    def watch_settings(self):
        """Background thread to watch for recording commands"""
        while self.is_running:
            try:
                # Use a separate connection for the thread to avoid SQLite threading issues
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                cursor.execute("SELECT value FROM settings WHERE key = 'recording_file'")
                row = cursor.fetchone()
                current_file = row[0] if row else None
                conn.close()
                
                if current_file != self.recording_file:
                    if self.pcap_writer:
                        self.pcap_writer.close()
                        self.pcap_writer = None
                    
                    self.recording_file = current_file
                    
                    if self.recording_file:
                        print(f"[*] Started recording to {self.recording_file}")
                        self.pcap_writer = PcapWriter(self.recording_file, append=True, sync=True)
                    else:
                        print(f"[*] Stopped recording.")
            except Exception as e:
                pass
            
            time.sleep(1)
    
    def extract_packet_info(self, packet):
        """Extract key information from a packet"""
        if IP not in packet:
            return None
        
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
        
        return {
            'timestamp': timestamp,
            'src_ip': src_ip,
            'dst_ip': dst_ip,
            'protocol': proto,
            'port': port,
            'size': size
        }
    
    def save_packet(self, pkt_info):
        """Save packet to database"""
        if pkt_info is None:
            return
        
        self.cursor.execute("""
            INSERT INTO packets (timestamp, src_ip, dst_ip, protocol, port, size)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (pkt_info['timestamp'], pkt_info['src_ip'], pkt_info['dst_ip'],
              pkt_info['protocol'], pkt_info['port'], pkt_info['size']))
        
        self.conn.commit()
        self.packet_count += 1
        
        if self.packet_count % 10 == 0:
            print(f"[*] Captured {self.packet_count} packets")
    
    def packet_callback(self, packet):
        """Callback for each captured packet"""
        pkt_info = self.extract_packet_info(packet)
        self.save_packet(pkt_info)
        
        # Write to PCAP if recording is active
        if self.pcap_writer:
            try:
                self.pcap_writer.write(packet)
            except Exception as e:
                pass
    
    def start_capture(self, interface=None, count=0):
        """Start capturing packets"""
        print(f"[+] Starting packet capture...")
        print(f"[+] Press Ctrl+C to stop")
        
        try:
            sniff(prn=self.packet_callback, iface=interface, store=False, count=count, promisc=False)
        except KeyboardInterrupt:
            print("\n[!] Capture stopped by user")
        finally:
            self.close()
    
    def close(self):
        """Close database connection and print summary"""
        self.is_running = False
        
        if self.pcap_writer:
            self.pcap_writer.close()
            
        if self.conn:
            self.conn.close()
        
        print(f"\n[+] Capture complete!")
        print(f"[+] Total packets captured: {self.packet_count}")
        print(f"[+] Data saved to: {self.db_path}")
    
    def print_summary(self):
        """Print summary of captured packets"""
        self.conn = sqlite3.connect(self.db_path)
        self.cursor = self.conn.cursor()
        
        self.cursor.execute("""
            SELECT protocol, COUNT(*) as count
            FROM packets
            GROUP BY protocol
        """)
        
        print("\n[+] Packet Summary:")
        print("-" * 40)
        for row in self.cursor.fetchall():
            proto_names = {6: "TCP", 17: "UDP", 1: "ICMP"}
            proto_name = proto_names.get(row[0], f"Other({row[0]})")
            print(f"{proto_name}: {row[1]} packets")
            
        self.conn.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Capture network packets')
    parser.add_argument('--interface', '-i', help='Network interface to sniff on', default=None)
    parser.add_argument('--count', '-c', type=int, help='Number of packets to capture (0 = infinite)', default=0)
    parser.add_argument('--db', '-d', help='Database file path', default='network_packets.db')
    
    args = parser.parse_args()
    
    capture = PacketCapture(db_path=args.db)
    capture.start_capture(interface=args.interface, count=args.count)
    capture.print_summary()
