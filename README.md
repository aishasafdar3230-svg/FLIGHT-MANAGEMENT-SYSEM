# Wingspan — Flight Booking System

A full-stack flight booking & management system built with **React (Vite)**, **Node.js**, **Express.js**, and **MongoDB**, featuring a built-in **AI travel assistant with voice input/output**.

This is an original project — inspired by the general idea of a flight-booking dashboard, but with its own branding ("Wingspan"), color scheme (royal-blue), layout, and code, so it's safe to use as your own coursework/portfolio project.

## ✨ Features

- User signup/login with JWT authentication (passwords hashed with bcrypt)
- Flight search (City→City, Country→Country, Country→City and City→Country search with a dropdown of places; filter and sort by price/duration)
- Promo codes & discounts (SUMMER20, WELCOME10, FLAT1000, EARLYBIRD)
- Booking flow: review passengers/class → confirm → confirmation page
- Travel History dashboard (view + cancel bookings)
- Profile & Settings (change password, dark mode toggle, notification preferences)
- **AI Assistant** floating chat widget with:
  - 🎙️ Voice input (browser Speech Recognition — click mic and talk)
  - 🔊 Voice output (reads replies aloud using Speech Synthesis)
  - Quick action buttons + rule-based smart replies (no paid API key needed)
- Full REST API backend with MongoDB models for Users, Flights, and Bookings

## 🗂️ Project Structure

```
wingspan/
├── backend/          # Node.js + Express + MongoDB REST API
│   ├── config/       # DB connection
│   ├── controllers/  # Route logic
│   ├── middleware/   # Auth + error handling
│   ├── models/       # Mongoose schemas (User, Flight, Booking)
│   ├── routes/       # API routes
│   ├── seed/         # Sample flight data seeder
│   └── server.js
└── frontend/         # React (Vite) app
    └── src/
        ├── api/         # Axios instance
        ├── context/     # Auth context
        ├── components/  # Navbar, SearchWidget, FlightCard, AIAssistant, etc.
        ├── pages/       # Home, Login, Signup, FlightResults, Booking, History, Profile
        └── styles/      # CSS
```

## 🚀 Setup Instructions

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:
- If you have MongoDB installed locally, keep `MONGO_URI=mongodb://127.0.0.1:27017/wingspan`
- Or use a free MongoDB Atlas cluster and paste its connection string instead
- Change `JWT_SECRET` to any random long string

Seed sample flights (Multan, Lahore, Karachi, Islamabad, Dubai, London, Istanbul routes):
```bash
npm run seed
```

Start the backend:
```bash
npm run dev
```
Server runs on `http://localhost:5000`.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```
App runs on `http://localhost:5173`.

## 🎙️ About the Voice Feature

The AI Assistant uses the browser's built-in **Web Speech API** (`SpeechRecognition` + `SpeechSynthesis`) — this works out of the box in Chrome/Edge, no API key or cost involved. Click the 🤖 button (bottom-right), then tap the mic icon and speak your question (e.g. "any discounts available?" or "show me flights to Dubai").

If you later want *real* AI-generated replies (via OpenAI/Gemini), you only need to replace the `generateReply()` function in `frontend/src/components/AIAssistant.jsx` with an API call.

## 📝 Notes for Submission / Portfolio Use

- Change the branding, colors, or copy further in `frontend/src/styles/index.css` if you want it to look even more your own.
- Sample/demo promo codes and flights are in `backend/seed/seedFlights.js` — edit freely.
- Passwords are hashed, and JWT is used for auth — good practice to mention in your report/demo.
