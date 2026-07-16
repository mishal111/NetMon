# Network Topology Visualizer 🌐

The **Network Topology Map** is an advanced interactive component within the NetMon Security Command Center that provides a live, visual representation of network traffic flows and potential threats.

## 📌 Overview

Located in the **Analytics** tab of the SOC dashboard, this component utilizes [@xyflow/react](https://reactflow.dev/) (React Flow) to dynamically render nodes (devices/IPs) and edges (packet flows) based on real-time data streamed from the FastAPI backend.

## ✨ Key Features

- **Real-Time Rendering**: The graph dynamically updates as new packets are ingested via the WebSocket connection (`ws://localhost:8001/ws/packets`).
- **Interactive Canvas**: Users can pan, zoom, and drag individual IP nodes around the canvas to investigate complex network clusters.
- **Animated Traffic Flows**: Edges connecting two IPs are animated to represent active data transmission, complete with protocol labeling (TCP, UDP, ICMP).
- **Threat Intelligence Integration**: The graph cross-references live IPs with the `AlertPanel`'s threat database. If an IP has triggered a recent security alert (e.g., Port Scan or DDoS), its node is automatically highlighted in **Critical Red**.

## 🎨 Color Legend

The nodes in the topology map are color-coded to provide instant situational awareness:

*   🟩 **Green Borders (Trusted/Internal)**: Represents local network traffic. Applies automatically to IPs in the `127.x`, `10.x`, `192.168.x`, and `172.x` subnets.
*   🟦 **Blue Borders (Standard)**: Represents standard, external internet traffic that has not triggered any security rules.
*   🟥 **Red Borders & Glow (Threat Detected)**: Represents a hostile or suspicious IP. The component actively parses the description strings of incoming alerts (e.g., "Source IP 8.8.8.8 scanned 27 distinct ports") and immediately flags the corresponding node in the graph.

## 🛠️ Technical Implementation

The component is located at `frontend/src/components/NetworkTopology.jsx`. 

**Data Flow:**
1. The `Dashboard.jsx` parent component maintains a rolling array of the last 200 captured packets and the last 100 alerts.
2. These arrays are passed as props to `<NetworkTopology packets={packets} alerts={alerts} />`.
3. A `useMemo` hook parses the alerts to extract a `Set` of malicious IPs.
4. The hook then iterates over the packets (limited to the most recent 50 to prevent visual clutter and maintain 60fps rendering) and constructs unique Nodes (`src_ip` and `dst_ip`) and Edges.
5. The state is passed into React Flow's `useNodesState` and `useEdgesState` hooks to handle the drag-and-drop interactivity.

## 🚀 Future Enhancements

- **Geolocation**: Integrate an IP-to-Country API (like MaxMind) to display country flags on external nodes.
- **Traffic Volume Weighting**: Thicken the animated edge lines based on the `size` (bytes) of the packets flowing between two nodes.
- **Node Click Inspection**: Clicking a node could open a side-panel showing a history of all packets and alerts specifically associated with that IP address.
