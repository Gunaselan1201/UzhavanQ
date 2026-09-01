# UzhavanQ — Farmer Procurement Slot Booking System

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Node](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![Status](https://img.shields.io/badge/status-SIH2026-orange)

Real-time slot booking & queue management for government produce procurement centres — built for **SIH 2026, PS 26032**, to solve long farmer waiting times, overcrowding, and lack of visibility into procurement status.

## 🔗 Live Demo

- Frontend: https://uzhavanq.vercel.app/
- Backend API: https://uzhavanq.onrender.com
- Admin panel: https://uzhavanq.vercel.app/admin/login

## 🔑 Try it yourself

**Farmer side:** Use any 10-digit phone number → OTP: `****`

**Admin side:** `/admin/login`
Username: admin1
Password: TN1234
Centre: Namakkal - Co operative
*(Demo account — not a production credential)*

## 📋 Problem Statement — SIH 2026, PS 26032

**Organization:** Ministry of Consumer Affairs, Food & Public Distribution — Department of Consumer Affairs
**Category:** Software

> Farmers often face long waiting times, lack of information regarding procurement schedules, and uncertainty about procurement status. The expected solution enables farmer registration and slot booking, provides real-time queue management, sends notifications, tracks procurement and payment status, and reduces congestion and waiting time at procurement centres.

This is a national-ministry problem statement — it doesn't mandate a specific state.

## 🗺️ Why Tamil Nadu, not Maharashtra

During early research, the closest existing government tooling for this space was Maharashtra's Mahabhumi portal — used for farmer land-record verification, not slot booking or queue management. No state currently runs a dedicated real-time procurement slot-booking app; the closest adjacent systems are registration portals (NAFED, NCCF) and payment-settlement rails, none of which solve the actual queueing/congestion problem this PS describes.

I localized the working prototype to Tamil Nadu — my home state — instead of Maharashtra, for two practical reasons:

1. **Authentic local data.** Using real Namakkal-district landmarks (Tiruchengode road, Mohanur, Namakkal Co-operative centre) instead of generic placeholder locations made the demo feel like a real deployable system rather than a templated mockup.
2. **Bilingual requirement fit.** The problem statement calls for farmer-facing notifications and an accessible interface — supporting Tamil natively (alongside English) was a natural, authentic way to demonstrate that requirement, since it's a language I can verify and test accurately myself, rather than guessing at correctness in a language I don't speak.

The architecture itself is state-agnostic — the centre list, language set, and branding are all data-driven, so this could be reconfigured for any state's procurement centres without touching the core logic.

## ❓ Does this already exist?

Not as a dedicated system, anywhere. Research turned up:
- **NAFED / NCCF** — Aadhaar-linked farmer *registration* portals, no slot booking or queue management
- **Mahabhumi (Maharashtra)** — land/farmer identity verification, unrelated to procurement queueing
- **SBI DigiGov** — a payment settlement layer NAFED/NCCF use, not a farmer-facing booking tool

Procurement centre operations remain largely manual and paper-based today. This project is a working prototype addressing that specific, unaddressed gap.

## ⚙️ What it does

**Farmer side** (English + Tamil):
- Phone-based login (OTP)
- Browse produce, book a centre + time slot within a 2–3 day window
- Live slot availability (available / almost-full / full), with today's already-passed time slots automatically disabled
- Token confirmation with QR code, live status polling (delayed/postponed/completed shows up automatically, no manual refresh)
- A blocking one-time alert if the admin delays or postpones their booking

**Admin side** (separate real login, per-centre scoped):
- Dashboard: today's bookings, per-slot or whole-day closure, delay/postpone/complete actions, payment status tracking
- Full audit trail on every booking (who changed what, when)
- History view with a paginated, date-filterable activity log
- Trends: bookings-per-day and produce-breakdown charts

**Engineering highlights:**
- Atomic, race-condition-safe slot capacity enforcement (verified under real concurrent-request load testing — 10-per-slot capacity never exceeded under 4,300 simulated requests)
- Daily, per-centre, per-produce sequential token numbering (e.g. O01, T02), also race-condition-safe
- 79+ automated tests (backend unit/integration/concurrency/security, frontend unit, E2E), all passing

## 🛠️ Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, react-i18next (English/Tamil) |
| Backend | Node.js, Express, Mongoose |
| Database | MongoDB (Atlas) |
| Auth | Phone+OTP (farmer, demo), bcrypt + JWT (admin, real) |
| Testing | Jest, Supertest, mongodb-memory-server, Vitest, Playwright, Artillery |
| Hosting | Vercel (frontend), Render (backend), MongoDB Atlas |

## 📁 Project structure

```
sih26032/     — React frontend (farmer + admin UI)
server/       — Express + MongoDB backend
```

## 🚀 Running locally

```bash
# Backend
cd server
npm install
cp .env.example .env   # fill in your own MONGODB_URI and JWT_SECRET
npm run dev

# Frontend
cd sih26032
npm install
npm run dev
```
