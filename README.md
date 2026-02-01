# Macro Tracker

Track your macro intake by meal and see daily totals.

## Tech stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Database: SQLite

## Getting started

### 1) Backend
```bash
cd backend
npm install
npm start
```
The API runs on http://localhost:4000.

### 2) Frontend
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173.

### Environment
If you need a different API URL, set `VITE_API_URL` in frontend environment (e.g. `VITE_API_URL=http://localhost:4000`).

## API endpoints
- `POST /api/meals` { date, meal, calories, protein, carbs, fat, notes }
- `GET /api/meals?date=YYYY-MM-DD`
- `GET /api/summary?date=YYYY-MM-DD`
