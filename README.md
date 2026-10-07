# PaisaPal — Personal & Student Money Tracker

> **Offline-first personal money tracker built with TypeScript, React 19, Tailwind CSS & Dexie IndexedDB to manage daily expenses and budgets in seconds.**

[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-4.3-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Dexie.js](https://img.shields.io/badge/Dexie.js-IndexedDB-blue)](https://dexie.com/)
[![Live Demo](https://img.shields.io/badge/Live_Demo-Vercel-black?logo=vercel&logoColor=white)](https://paisa-pal-money-tracker.vercel.app/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

### 🌐 Live Demo: [https://paisa-pal-money-tracker.vercel.app/](https://paisa-pal-money-tracker.vercel.app/)

---

## 📌 About The Project

**PaisaPal** is a fast, lightweight, and privacy-focused Progressive Web Application (PWA) designed to simplify daily money management for students and individuals. 

Most expense tracking applications suffer from cloud dependency, advertisements, complex multi-step menus, and intrusive account signups. PaisaPal solves this by providing:

- **Sub-5-Second Logging:** Record expenses, income, or transfers instantly via a built-in numeric keypad, natural language input, or voice commands.
- **Daily "Safe-to-Spend" Metric:** Automatically calculates exactly how much money you can safely spend today based on your monthly cycle budget and remaining days.
- **100% Offline & Private:** Zero backend servers, zero tracking, and no login required. All financial data is stored locally in your browser's IndexedDB.

---

## 🛠️ Languages & Technologies Used

### 💻 Languages
- **TypeScript (`~6.0`)** — Strict type safety, clean code architecture, and robust domain modeling.
- **HTML5 & CSS3** — Semantic mobile-first markup, modern viewport handling, and responsive styles.

### ⚛️ Frontend & Libraries
- **React 19 (`19.2.8`)** — Modern component-driven UI architecture.
- **Vite 8 (`8.3.0`)** — Next-generation frontend build tooling and fast dev server.
- **Tailwind CSS v4 (`4.3.3`)** — Utility-first styling integrated with custom design tokens.
- **Framer Motion (`14.0.0`)** — Smooth screen transitions, spring animations, and bottom sheet gestures.
- **Recharts (`3.10.1`)** — Responsive category breakdown donut charts and daily spending bar charts.
- **Lucide React (`1.52.0`)** — Modern iconography for categories and navigation.
- **date-fns (`4.4.0`)** — Date calculations, cycle math, and interval grouping.

### 🗄️ Database & Storage (Local-First)
- **Dexie.js v4 (`4.4.6`) & IndexedDB** — High-performance browser-native database. All amounts are stored as integer paise (`amount × 100`) to eliminate floating-point rounding errors.
- **Zustand (`5.0.15`)** — Lightweight, reactive global state management.

### 📱 PWA & Native Web APIs
- **vite-plugin-pwa & Workbox** — Installable Progressive Web App with offline caching.
- **Web Speech API (`webkitSpeechRecognition`)** — Voice-to-text expense entry.
- **Navigator Vibration API** — Tactile haptic feedback for keypad presses.

---

## ✨ Key Features

- **⚡ Instant Transaction Entry:** Segmented control (Expense / Income / Transfer), custom numeric keypad, tactile feedback, and 5-second undo support.
- **🗣️ Natural Language & Voice Entry:** Type or speak phrases like *"120 auto yesterday"* or *"chai 20"* to auto-fill amount, category, and date.
- **🛡️ Safe-to-Spend Engine:** Computes real-time daily allowances to prevent overspending before month-end.
- **📊 Visual Spending Analytics:** Interactive donut charts, daily expenditure trends, and money-leak detection.
- **🎯 Envelopes, Goals & Subscriptions:** Category budgets with live progress meters, savings goals, and renewal tracking.
- **👥 Expense Splitting:** Track shared expenses with friends and manage settled balances.
- **🎨 Custom Categories & Dark Mode:** Manage custom categories with 12 curated brand swatches; supports Dark, Light, and System themes.
- **💾 Complete Data Ownership:** Export and import full database backups via JSON and CSV.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/)

### Installation & Run

1. **Clone the repository:**
   ```bash
   git clone https://github.com/sumit-chame/PaisaPal-Money-Tracker.git
   cd PaisaPal-Money-Tracker
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the local development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

4. **Build for production:**
   ```bash
   npm run build
   ```

---

## ☁️ MongoDB Atlas & Cloud User Management Setup

PaisaPal includes optional cloud user management using MongoDB Atlas and Vercel Serverless Functions (`/api`). To configure Atlas for production deployment:

1. **Create an Atlas Cluster & Database:**
   - Log into [MongoDB Atlas](https://cloud.mongodb.com/).
   - Create a free **M0** shared cluster.
   - Create a database named `paisapal`.

2. **Create a Database User:**
   - Under **Database Access**, add a new database user (e.g. `paisapal_user`).
   - Grant **`readWrite`** privileges specifically on the `paisapal` database.

3. **Configure Network Access:**
   - Under **Network Access**, add IP Access List entry: `0.0.0.0/0` (Allow Access from Anywhere, required because Vercel serverless function IPs change dynamically).

4. **Set Vercel Environment Variables:**
   - In your Vercel Project Dashboard, navigate to **Settings** → **Environment Variables**.
   - Add the following variables:
     - `MONGODB_URI`: `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority`
     - `MONGODB_DB`: `paisapal`
     - `JWT_SECRET`: A secure 32+ character random string
   - Trigger a project redeploy.

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.

---

## 👨‍💻 Author

**Sumit Chame**
- GitHub: [@sumit-chame](https://github.com/sumit-chame)
- Repository: [PaisaPal-Money-Tracker](https://github.com/sumit-chame/PaisaPal-Money-Tracker)
- Live App: [https://paisa-pal-money-tracker.vercel.app/](https://paisa-pal-money-tracker.vercel.app/)
