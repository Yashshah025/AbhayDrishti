# CrowdShield: AI-Powered Stampede Window Predictor 🛡️

A production-ready decision intelligence system designed for high-density environments like temples and pilgrimages in Gujarat (Somnath, Pavagadh, Ambaji, Dwarka). This system predicts crowd crush risks 8–12 minutes in advance and coordinates multi-agency responses via a premium glassmorphism dashboard.

## 🚀 Quick Start (Hackathon Demo)

### 1. Model Training
Train the ML components (Classification + Regression) on the minute-level dataset:
```bash
python backend/ml/train_new_models.py
```
*Validated Metrics*: Classification Accuracy ~97.7%, Regression R² ~0.89.

### 2. Launch Services
Run the entire stack using Docker Compose:
```bash
docker-compose up --build
```

- **Dashboard**: http://localhost:3000
- **API Backend**: http://localhost:5000/status

---

## 🧠 System Components

### 1. Decision Intelligence (Backend)
- **FastAPI Core**: High-concurrency data ingestion and simulation control.
- **Risk Classification**: Transitions between **Low, Medium, and High** risk levels using XGBoost.
- **Confidence Regression**: Real-time confidence score (0-1) based on predicted pressure dynamics.

### 2. Premium Real-Time Dashboard (Frontend)
- **Tech Stack**: React 18, Tailwind CSS, Recharts, Lucide.
- **Glassmorphism UI**: High-fidelity dark mode interface with real-time gauges and charts.
- **Multi-Agency View**: Coordinated actions for Police, Temple Trust, and GSRTC Transport.

### 3. Real-Time Simulation
- **Minute-Level Granularity**: Replays `minute_level_dataset.csv` with chronological accuracy.
- **What-if Scenario**: Interactive slider to inject vehicle bursts and test system response.

---

## 🛠️ Tech Stack
- **Backend**: FastAPI, Python 3.11, XGBoost, Scikit-Learn.
- **Frontend**: React, Tailwind CSS, Vite (Production build served via Nginx).
- **Deployment**: Docker, Docker-Compose.

---

## 📈 Demo Flow for Judges
1. **Initialize**: Start the simulation from the sidebar.
2. **Observe**: Watch the Live Pressure Index and Predicted T+10m index.
3. **Surge**: Wait for a natural surge or trigger a "What-If" burst.
4. **Predict**: Observe the prediction engine turning "Yellow" or "Red" before the actual pressure hits.
5. **Alert**: Show the generated Multi-Agency alerts and acknowledge them as different users.
6. **Replay**: Expand the "Simulation Replay" section to see deep insights into the event.
