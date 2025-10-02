Klyra - Smart Parking System
Welcome to Klyra, a modern web application designed to simplify the parking experience. Klyra provides users with a platform to find, book, and manage parking spaces in real-time, eliminating the stress of searching for a spot. This is a full-stack solution with a focus on user experience and real-world utility.

✨ Features
User Authentication: Secure sign-up and login for a personalized experience.

User Dashboard: View booking history, manage credits, and update profile information.

Real-Time Availability: See live parking spot availability powered by on-site sensors.

Seamless Booking: Find and reserve a parking spot in just a few clicks.

Credit System: A simple, credit-based system for payments.

Live Feed: View a live video feed of the parking area for added security.

Responsive Design: Fully functional and beautiful on desktops, tablets, and mobile devices.

🛠️ Tech Stack
This project is built with a modern and powerful technology stack:

Frontend: React, TypeScript, Vite

UI Components: shadcn-ui

Styling: Tailwind CSS

Backend & Database: Supabase

Data Fetching: TanStack Query (React Query)

Form Management: React Hook Form & Zod

🚀 Getting Started
To get a local copy up and running, follow these simple steps.

Prerequisites
Make sure you have Node.js (version 18 or higher is recommended) and npm installed on your machine.

Installation & Setup
Clone the repository:

Bash

git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
Navigate into the project directory:

Bash

cd YOUR_REPO_NAME
Install NPM packages:

Bash

npm install
Set up environment variables:
Create a file named .env in the root of your project and add your Supabase project credentials.

Code snippet

VITE_SUPABASE_URL="YOUR_SUPABASE_URL"
VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
Start the development server:

Bash

npm run dev
Open http://localhost:5173 to view it in your browser.

📜 Available Scripts
In the project directory, you can run:

npm run dev: Starts the application in development mode.

npm run build: Bundles the app for production to the dist folder.

npm run lint: Runs the ESLint checker to find and fix problems in the code.

npm run preview: Serves the production build locally to preview it before deployment.

🚢 Deployment
This Vite project can be easily deployed to any static site hosting service.

Recommended Platforms: Vercel, Netlify, GitHub Pages.

To deploy, simply connect your GitHub repository to one of these services. It will automatically build and deploy your project upon every push to the main branch.