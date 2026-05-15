# Pilgriment: AI-Powered Smart Pilgrimage Crowd Management

![Pilgriment Banner](https://via.placeholder.com/1200x400?text=Pilgriment+-+Smart+Crowd+Management)

**Pilgriment** is an advanced AI, IoT, and Cloud-Based Smart Pilgrimage Crowd Management System designed specifically for the Char Dham Yatra. It leverages computer vision, predictive analytics, and real-time weather tracking to ensure pilgrim safety and prevent overcrowding at sacred shrines.

## 🚀 Key Features

*   **Real-time AI Crowd Analysis**: Uses YOLOv8 computer vision to analyze CCTV feeds and estimate crowd density instantly.
*   **Predictive Modeling**: Blends historical pilgrim data, seasonal trends, and real-time Open-Meteo weather forecasts to predict future footfall.
*   **Secure Ticket Verification**: Blockchain-inspired immutable ticket generation and verification using Firebase NoSQL.
*   **Interactive Dashboard**: A dynamic, beautiful React/Vite frontend with Framer Motion animations for administrators and authorities to monitor shrines in real-time.
*   **Distributed Edge Architecture**: Capable of processing streams across multiple camera nodes efficiently.

## 🛠️ Technology Stack

**Frontend:**
*   React 18 & TypeScript
*   Vite
*   Tailwind CSS (with custom tokens) & Framer Motion
*   Lucide React for iconography

**Backend & AI Engine:**
*   Python Flask
*   OpenCV & YOLOv8 (Ultralytics)
*   Firebase (Firestore & Auth)
*   Open-Meteo API for real-time weather integration

## 📦 Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Sampat-Barik/PILGRIMENT.git
    cd PILGRIMENT
    ```

2.  **Environment Variables:**
    Copy `.env.example` to `.env` and fill in your API keys:
    ```bash
    cp .env.example .env
    ```

3.  **Frontend Setup:**
    ```bash
    npm install
    npm run dev
    ```

4.  **Backend Setup:**
    ```bash
    cd BACKEND
    pip install -r requirements.txt
    python server.py
    ```

## 🔒 Security Note

All API keys and sensitive environment variables have been excluded from this repository for security purposes. Please provide your own Firebase configuration and API keys in the `.env` file to run the application locally.

## 👥 Contributors
*   **Sampat Barik** - Web Master & Technical Lead
*   **Sayan Maity** - Team Lead

---
*Developed with a focus on human safety, using technology to safeguard the sacred journey.*
