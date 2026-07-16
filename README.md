# Network Security Command Center

A real-time network traffic monitoring and anomaly detection platform. This project captures live network packets, analyzes traffic trends over time, detects suspicious activity using rule-based heuristics, and visualizes everything in a premium, glassmorphic React dashboard.

## 🚀 Features

- **Live Packet Sniffing**: Captures raw network packets in real-time across your local network interfaces.
- **Time-Series Analytics**: Aggregates traffic data (packets/sec, bytes/sec, protocol breakdowns) and stores them in InfluxDB for historical graphing.
- **Anomaly Detection Engine**: Automatically detects and flags suspicious network activity:
  - **DDoS / Volume Spikes**: Detects abnormally high packet counts in short windows.
  - **Port Scans**: Detects single IP addresses rapidly scanning multiple distinct ports.
- **Real-Time UI**: A React-based Security Command Center built with TailwindCSS. Features dark mode, glassmorphism, Recharts for trend visualization, and WebSockets for instant alert and packet streaming.

## 🛠️ Technology Stack

**Backend**
- **Python 3**: Core language.
- **Scapy**: For raw network packet capture and parsing.
- **SQLite**: To store raw packet logs and generated alerts.
- **InfluxDB**: Time-series database for high-performance metrics and analytics.
- **FastAPI**: REST APIs and WebSocket management.

**Frontend**
- **React (Vite)**: Fast, modern UI framework.
- **Tailwind CSS**: Styling, dark-mode, and glassmorphic UI effects.
- **Recharts**: Beautiful SVG charting library for time-series data.
- **Lucide-React**: Modern iconography.

## 🏗️ Architecture

The system is composed of 4 main, decoupled processes running concurrently:

1. **`capture.py`**: The raw packet sniffer. It continuously listens to the network interface and writes parsed packet data into `network_packets.db` (SQLite).
2. **`analytics.py`**: The background aggregator. It polls SQLite every 10 seconds, computes averages/sums, and pushes time-series points to **InfluxDB**.
3. **`detector.py`**: The security intelligence engine. It runs heuristic rules against recent traffic (from both SQLite and InfluxDB) and logs threats to the `alerts` table.
4. **`app.py`**: The FastAPI server. It exposes REST endpoints for historical data and manages WebSockets to broadcast new packets and alerts instantly to the React frontend.

## 🏁 How to Run

You will need Docker (for InfluxDB) and Node.js (for the React frontend) installed.

### 1. Start InfluxDB
Make sure Docker is running, then start your InfluxDB container:
```bash
docker start influxdb
# Or if running for the first time:
# docker run -d --name influxdb -p 8086:8086 -e INFLUXDB_DB=network_security -e INFLUXDB_ADMIN_USER=admin -e INFLUXDB_ADMIN_PASSWORD=admin influxdb:1.8
```

### 2. Start the Python Backend
Open separate terminal windows and run the following commands from the root directory:

```bash
# Terminal 1: Packet Capture (Requires root/sudo privileges)
sudo ./venv/bin/python3 capture.py

# Terminal 2: Analytics Engine
./venv/bin/python3 analytics.py --interval 10

# Terminal 3: Anomaly Detector
./venv/bin/python3 detector.py --interval 10

# Terminal 4: FastAPI Web Server
./venv/bin/python3 app.py
```

### 3. Start the React Frontend
Open one last terminal for the UI:
```bash
# Terminal 5: Frontend
cd frontend
npm run dev
```

Finally, open your browser and navigate to `http://localhost:5173` to view the Security Command Center.

## 🔧 Tuning False Positives

By default, the `detector.py` rules are highly sensitive for demonstration purposes (e.g., flagging port scans after only 20 distinct ports). In a real-world environment, local gateways and mDNS traffic can trigger these. 

You can tune the sensitivity by passing arguments to the detector:
```bash
./venv/bin/python3 detector.py --interval 10 --ddos-pps 1000 --scan-ports 100
```
