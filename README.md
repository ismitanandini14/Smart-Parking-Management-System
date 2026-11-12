# 🅿️ YuktiTech Smart Parking Management System

An intelligent, full-stack **Smart Parking Management System** developed in Python (Flask) and modern responsive Web UI (HTML5, CSS3, JavaScript). Designed with Data Structures & Algorithms (Min-Heap, FIFO Queue, Hash Map) and enhanced with a real-time **Interactive Parking Map**.

---

## 🌟 Key Features

1. **🗺️ Interactive Facility Parking Map**:
   - **2D Architectural Layout**: Visual representation of physical parking bays, distance baselines, Entry/Exit boom barriers with LED status, and two-way central drive aisles with pedestrian zebra crossings.
   - **Zone A (4-Wheeler Cars)**: Bays `C-1` to `C-4` with distance tags (10m, 20m, 30m, 40m).
   - **Zone B (2-Wheeler Bikes)**: Bays `B-1` to `B-4` with distance tags (8m, 16m, 24m, 32m).
   - **Min-Heap Best Allocation Indicator**: Pulsing golden halo (`⭐ Nearest`) highlighting the next optimal free bay determined by the Min-Heap.
   - **Interactive Bay Inspector**: Click any bay to view real-time vehicle plate, category, entry time, live ticking timer, accrued bill, and quick actions ("Check-In" or "Vacate & Bill").
   - **📍 Campus Geographic Locator**: Toggle view showing physical campus location (YuktiTech Smart Hub, Block 4, North Tech Park), GPS coordinates (`28.6139° N, 77.2090° E`), operating hours, and amenities.
2. **⚡ Min-Heap Optimal Allocation ($O(\log N)$)**:
   - Always assigns the nearest available parking bay to minimizing driving and search time.
3. **🔄 FIFO Overflow Waitlist ($O(1)$)**:
   - When parking capacity is reached, vehicles join a first-in, first-out waitlist queue.
   - **Auto-Promotion**: Vacating an occupied bay automatically dequeues and allocates the newly freed slot to the first waiting vehicle.
4. **⏱️ Real-Time Dynamic Billing Engine**:
   - First hour base charge (₹30 for cars, ₹15 for bikes) plus per-minute overtime billing.
   - Generates itemized Parking Receipts & Invoices with instant print support (`window.print()`).
5. **🔍 Live Search & Filter Synchronization**:
   - Search by slot ID or vehicle registration number; interactive map highlights matching bays and dims non-matches.
   - Filter chips: All, Available, Occupied, Cars Only, Bikes Only.
6. **🤖 Natural Language AI Copilot**:
   - Built-in floating assistant that accepts commands like *"How many free spots?"*, *"Park car DL-01-AB-1234"*, or *"Checkout DL-01-AB-1234"*.
7. **🎨 Glassmorphic Responsive Design System**:
   - Supports seamless Dark and Light theme switching (`data-theme="dark"`).
   - Fully responsive across desktop, tablet, and mobile devices.

---

## 🚀 How to Run Locally

### 1. Install Dependencies
```bash
pip install -r backend/requirements.txt
```

### 2. Start the Backend & Dashboard Server
```bash
python backend/app.py
```

### 3. Open in Browser
Navigate to:
```
http://127.0.0.1:5000
```
- **Login Credentials**: `admin` / `admin123` or `operator` / `park2026` (or create a new operator account via the Register page).

---

## 📂 Project Architecture

```
smart-parking-management/
├── backend/
│   ├── app.py                # Flask server, API endpoints, static web hosting, auth
│   ├── dsa_logic.py          # Min-Heap and FIFO Queue data structures
│   ├── ai_assistant.py       # Rule-based natural language copilot
│   └── requirements.txt      # Flask, Flask-CORS, python-dotenv
│
├── frontend/
│   ├── index.html            # Dashboard with Interactive Map, KPIs, and controls
│   ├── style.css             # Glassmorphism theme, dark/light mode, map graphics
│   ├── script.js             # Live telemetry, map rendering, audio chimes, timers
│   ├── login.html            # Operator sign-in page
│   └── register.html         # Operator registration page
│
└── vercel.json               # Cloud deployment configuration
```
