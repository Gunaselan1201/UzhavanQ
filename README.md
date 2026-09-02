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

## ❓ Does this already exist?

Not quite — but it's closer than I initially assumed, and worth being 
precise about. Research turned up:

- **TNCSC Paddy Procurement (Tamil Nadu)** — a live system since 2023: OTP login, nearest-centre selection, and an online token with SMS date notification. The closest existing system to this project.
  
- **West Bengal's Farmer Self Scheduling** — a similar paddy procurement scheduling portal.
  
- **Punjab's mandi e-token system** — centralized token issuance that farmers have publicly reported causing mismatches (tokens issued for the wrong purchase centre) due to lack of per-centre scoping.
  
- **NAFED / NCCF** — Aadhaar-linked registration portals, no slot booking.

     What none of these appear to offer: a **live, visual slot-capacity picker** (available/almost-full/full) rather than a simple queued token list, **race-condition-safe concurrent booking** (Punjab's reported token mismatches are a real-world example of what happens without this), or **real-time delay/postponement notifications** pushed back to the farmer when a centre's schedule changes.

     This project is a prototype exploring that gap — closer in spirit to these existing government systems than a from-scratch idea, but built around real-time capacity visibility and concurrency-safety as the core differentiators.

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
