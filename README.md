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

- **Dashboard**: http://localhost:8501
- **API Backend**: http://localhost:5000


## 🧠 System Components

### 1. Decision Intelligence (Backend)
- **FastAPI Core**: Handles high-concurrency data ingestion and simulation control.
- **Smart Classification**: Distinguishes between "TEMPORARY SURGE" and "REAL CRUSH RISK" using historical pressure gradients and density metrics.
- **Inference Engine**: XGBoost/RandomForest model predicting future pressure indices.

### 2. Real-Time Simulation
- **Transport Bursts**: Simulates sudden vehicle arrivals (bus drops) every 10–15 minutes.
- **What-if Scenario**: Interactive control to inject 20+ buses into the current stream to test system resilience.

### 3. Shared Dashboard (Frontend)
- **Live Pressure Graph**: Real-time time-series visualization.
- **Alert Panel**: Coordinated actions for Police, Temple Trust, and Transport agencies.
- **Acknowledgement Tracking**: Tracks response times per agency for audit and post-event replay.

---

## 🛠️ Tech Stack
- **Backend**: FastAPI, Python 3.9
- **ML Engine**: Scikit-Learn (RandomForest/XGBoost), Pandas, Numpy
- **Frontend**: Streamlit, Plotly (Dynamic Viz)
- **Deployment**: Docker, Docker-Compose

---

## 📈 Demo Flow for Judges
1. **Initialize**: Start the simulation from the sidebar.
2. **Observe**: Watch the Live Pressure Index and Predicted T+10m index.
3. **Surge**: Wait for a natural surge or trigger a "What-If" burst.
4. **Predict**: Observe the prediction engine turning "Yellow" or "Red" before the actual pressure hits.
5. **Alert**: Show the generated Multi-Agency alerts and acknowledge them as different users.
6. **Replay**: Expand the "Simulation Replay" section to see deep insights into the event.
