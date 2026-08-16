# NetMon Security Command Center

NetMon is an enterprise-grade Network Security Operations Center (SOC) dashboard and real-time packet sniffer. It captures live network traffic directly from your machine's interface, analyzes it for malicious patterns using a custom detection engine, and streams the data over WebSockets to a high-performance React dashboard.

## 🚀 Features

### Core Capabilities
*   **Live Packet Sniffing**: Uses Python `scapy` to capture packets at the network interface layer.
*   **Real-Time Threat Detection**: Identifies DDoS attacks, Port Scans, and Authentication Brute Force attempts.
*   **Time-Series Analytics**: Stores traffic metrics (PPS, Bandwidth) in InfluxDB for historical graphing.
*   **WebSocket Streaming**: Streams live packets and security alerts instantly to the frontend with zero polling delay.

### Security Operations Center (SOC) Interface
*   **Enterprise Dark Theme**: A sleek, glassmorphic UI built with TailwindCSS and Framer Motion animations.
*   **Modular KPI Dashboards**: Live sparkline charts (via Recharts) tracking Packets/Sec, Bandwidth, Active Nodes, and Protocol distributions.
*   **Advanced Packet Filtering**: Instantly filter live traffic by Source/Dest IP, Port, or Protocol natively in the browser.
*   **Deep Packet Inspector**: Click any packet to reveal MAC addresses, TCP Flags, TTLs, and a mock Hexadecimal Payload view.
*   **Configuration Settings**: Dynamically adjust the sensitivity thresholds for the underlying detection engine (DDoS limit, Port Scan threshold, etc).

### Advanced Security Visualizations
*   **Network Topology Map**: A massive, interactive map of your network traffic powered by React Flow and the `ELK.js` layout engine. 
    *   *Edge Traffic Weighting*: Connections pulse and thicken dynamically based on exact traffic volume.
    *   *IP Geolocation*: External IPs are resolved in the background (via `ip-api.com`) to inject Country Flags and City data directly into the nodes.
    *   *Threat Highlighting*: Malicious IPs are immediately highlighted in Critical Red.
    *   *Node Inspection*: Clicking a node slides out a deep-dive statistics panel for that specific IP.
*   **Threat Timeline**: A chronological, 24-hour vertical timeline of all security events colored by severity.

### Export Utilities
*   **CSV & JSON**: Dump raw network packets or alert histories via Papaparse.
*   **PDF Reports**: Generate a full dashboard snapshot report using `html2canvas` and `jsPDF`.

---

## 🛠 Tech Stack

**Backend**
*   Python 3.9
*   FastAPI & Uvicorn (REST API & WebSockets)
*   Scapy (Packet Capture)
*   SQLite (Alert & Packet Storage)
*   InfluxDB (Time-series Metric Storage)

**Frontend**
*   React 18 & Vite
*   TailwindCSS (Styling & Glassmorphism)
*   Zustand (Global State Management)
*   Framer Motion (UI Animations)
*   @xyflow/react & ELK.js (Network Topology)
*   Recharts (KPI Sparklines & Analytics)

---

## ⚙️ Setup & Installation

### 1. Start the Database (InfluxDB)
The application requires InfluxDB to store time-series traffic metrics. Start it using Docker:
```bash
docker run -d -p 8086:8086 \
  -e INFLUXDB_ADMIN_USER=admin \
  -e INFLUXDB_ADMIN_PASSWORD=adminpassword \
  -e INFLUXDB_DB=netmon \
  influxdb:1.8
```

### 2. Start the Backend API
Navigate to the root directory, activate your virtual environment, and start the FastAPI server:
```bash
# Ensure you have required packages installed
./venv/bin/pip install -r requirements.txt
./venv/bin/pip install websockets

# Run the server (Must be run with sudo for Scapy packet sniffing privileges)
sudo ./venv/bin/python3 app.py
```
*The backend will boot up on `http://localhost:8001`.*

### 3. Start the Frontend Dashboard
Open a new terminal window, navigate to the `frontend` folder, install dependencies, and start Vite:
```bash
cd frontend
npm install
npm run dev
```
*The dashboard will boot up on `http://localhost:5173`.*

---

## 📂 Project Structure

```text
NetMon/
├── app.py                  # Main FastAPI Server & WebSocket Handler
├── capture.py              # Scapy Packet Capture Engine
├── detector.py             # Security Threat Detection Engine
├── analytics.py            # InfluxDB Metric Aggregation
├── requirements.txt        # Python Dependencies
├── netmon.db               # SQLite Database (Auto-generated)
└── frontend/               # React Application
    ├── package.json        
    ├── tailwind.config.js  # Enterprise SOC Color Palette
    └── src/
        ├── App.jsx         
        ├── Dashboard.jsx   # Main Layout & Routing
        ├── index.css       # Global Styles & Custom Scrollbars
        ├── hooks/          # Custom Logic (useStore, useEdgeWeights, useGeoIP)
        └── components/     # UI Components (Header, Topology, Timeline, etc)
```
