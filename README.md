# 🚗 Klyra — Smart Parking System

Welcome to **Klyra** — a modern full-stack web application that simplifies the parking experience.  
Users can find, book, and manage parking spaces in real-time. Klyra focuses on great UX and real-world utility.

---

## ✨ Features
- 🔒 **User Authentication** (signup & login)  
- 📊 **User Dashboard** (booking history, credits, profile)  
- 🟢 **Real-Time Availability** (sensor-driven)  
- 📍 **Seamless Booking** (reserve in a few clicks)  
- 💳 **Credit Payment System**  
- 🎥 **Live Camera Feed** for security  
- 📱 **Responsive Design** (desktop / tablet / mobile)  

---

## 🛠️ Tech Stack
- **Frontend**: React + TypeScript + Vite  
- **UI**: shadcn-ui  
- **Styling**: Tailwind CSS  
- **Backend / DB**: Supabase  
- **Data Fetching**: TanStack Query (React Query)  
- **Forms & Validation**: React Hook Form + Zod  

---

## 🚀 Quick Start

### Prerequisites
- Node.js (**v18+ recommended**)  
- npm (or pnpm / yarn)

### Clone the repo
```bash
git clone https://github.com/EnigmoSharma/Klyra.git
cd Klyra

### Install dependencies
```bash
npm install

### Environment variables

Create a .env file in the project root (or .env.local) and add your Supabase credentials:

VITE_SUPABASE_URL="YOUR_SUPABASE_URL"
VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"


Optionally add other env variables used by your app (e.g. video feed URL, API endpoints).

### Run locally
```bash
npm run dev

Open your browser at: http://localhost:8080


### Available Scripts

npm run dev — Start development server

npm run build — Build production bundle (output: dist/)

npm run preview — Preview production build locally

npm run lint — Run linters (ESLint / Prettier)

(Add or adjust scripts in package.json as needed.)

### Deployment

This Vite app can be deployed to any static hosting provider. Recommended:

Vercel — automatic deployments from GitHub

Netlify — simple continuous deploy

GitHub Pages — for simple static hosting

### General steps:

Push the repo to GitHub.

Connect repository to Vercel/Netlify.

Set environment variables in the hosting dashboard (Supabase URL & anon key).

Deploy — the platform will run npm run build and publish the dist/.

### Contributing

Contributions welcome! Please:

Fork the repo

Create a feature branch:

git checkout -b feat/my-feature


Commit your changes:

git commit -m "feat: add ..."


Push to your fork and open a PR

👉 For big changes, open an issue to discuss first.

### License

This project is licensed under the MIT License.
See LICENSE
 for details.

### Contact

Maintainer: EnigmoSharma (GitHub)

Repository: https://github.com/EnigmoSharma/Klyra.git