<img width="800" alt="image" src="hackathon.webp">

# AbhayDhristi
![Python](https://img.shields.io/badge/Python-3.11-blue.svg)
![Machine_Learning](https://img.shields.io/badge/XGBoost-orange)
![Communication](https://img.shields.io/badge/Socket.io-purple)
![Frontend](https://img.shields.io/badge/Framework-FastAPI-red)
![Frontend](https://img.shields.io/badge/React-green)


## Introduction:
During Navratri, major temples like Ambaji, Dwarka, Somnath, and Pavagadh handle over 1.2 crore pilgrims. While crowd control is focused at temple gates, stampede risks actually build up earlier in narrow access corridors due to sudden inflow bursts and limited space.This project builds a real-time system that analyzes corridor flow, transport arrivals, and width constraints to compute a Crowd Pressure Index. It predicts potential crush-risk situations 8–12 minutes in advance and sends alerts through a single shared dashboard for police, temple trusts, and transport authorities.

## Problem Statement: 
Ambaji, Dwarka, Somnath, and Pavagadh collectively receive over 1.2 crore pilgrims during Navratri. 
Stampede risk forms 200–500 metres upstream in narrow access corridors and choke alleys — not at the 
temple gate. CCTV exists but is watched reactively. Build a real-time crowd pressure intelligence system 
using simulated corridor entry flow rates, transport arrival bursts, and corridor width constraints. The system 
computes a corridor pressure index, predicts a crush-risk window 8–12 minutes ahead, and triggers a 
coordinated alert to police, temple trust, and transport authority on a single shared dashboard — not separate 
WhatsApp groups.

<img width="800" alt="image" src="Demo.jpeg">

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
