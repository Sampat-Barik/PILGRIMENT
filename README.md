# 🏔️ Pilgriment: AI-Powered Smart Pilgrimage Crowd Management

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/Frontend-React%2018-blue)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Build-Vite-646CFF)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20v4-38B2AC)](https://tailwindcss.com/)
[![Python](https://img.shields.io/badge/Backend-Python%203.9+-3776AB)](https://www.python.org/)
[![YOLOv8](https://img.shields.io/badge/AI-YOLOv8-FF3838)](https://ultralytics.com/)

**Pilgriment** is a state-of-the-art, AI-driven crowd management system engineered to safeguard the millions of pilgrims embarking on the **Char Dham Yatra**. By merging Computer Vision, Predictive Analytics, and Real-time Weather Intelligence, Pilgriment transforms chaotic crowd data into actionable safety insights.

---

## ✨ Premium Features

### 👁️ Intelligent Crowd Monitoring
*   **Real-time YOLOv8 Vision**: Edge-processed CCTV analysis that detects and counts pilgrims with precision.
*   **Density Mapping**: Visualizes "hot zones" to prevent dangerous bottlenecking at temple entrances.

### 🔮 Predictive Analytics & Forecasting
*   **Multi-Factor Blending**: Our proprietary engine combines historical yatra trends, current flow rates, and **Open-Meteo API** weather data.
*   **Proactive Alerts**: Predicts overcrowding *before* it happens, allowing authorities to manage flow at base camps like Sonprayag.

### 🛡️ Secure Digital Ecosystem
*   **Immutable Ticketing**: Firebase-backed secure ticket generation to prevent fraud and ensure data integrity.
*   **Dynamic Dashboard**: A premium, high-performance React frontend featuring glassmorphism design and smooth Framer Motion animations.

---

## 🏗️ Technical Architecture

```mermaid
graph TD
    A[CCTV Stream / Demo Feed] --> B[Python Flask Backend]
    B --> C{YOLOv8 AI Engine}
    C -->|Crowd Count| D[Real-time Analytics]
    E[Open-Meteo API] -->|Weather Data| D
    F[Historical JSON Data] -->|Trends| D
    D --> G[Firebase Firestore]
    G --> H[React Vite Frontend]
    H --> I[Authority Dashboard]
```

---

## 🛠️ Installation & Setup

### 1. Prerequisites
*   Node.js (v18+)
*   Python (v3.9+)
*   Firebase Project (Firestore & Auth enabled)

### 2. Repository Setup
```bash
git clone https://github.com/Sampat-Barik/PILGRIMENT.git
cd PILGRIMENT
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_id
VITE_API_BASE=http://localhost:5000
VITE_GEMINI_API_KEY=your_gemini_key
VITE_TAVILY_API_KEY=your_tavily_key
```

### 4. Running the Project
**Frontend:**
```bash
npm install
npm run dev
```

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python server.py
```

---

## 🔒 Security Note
This repository uses environment variables for all sensitive configuration. Sample data and fallback mechanisms are provided for demonstration, but a live Firebase instance is required for full functionality.

---

## 👥 Contributors
*   **Sampat Barik** - Technical Lead & System Architect
*   **Sayan Maity** - Project Lead & Strategy

---

## 📜 License
This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

*Developed with ❤️ for the safety of pilgrims worldwide.*
