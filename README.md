# GreenCrop NAT IOT Web

Smart farm command center (Web) for monitoring devices, dashboards, and secure authentication.

## Tech Stack
- Frontend: React 18 + TypeScript + Vite + Tailwind + Radix UI
- Backend: Node.js + Express (`server/`)
- Database: Microsoft SQL Server / Azure SQL Edge
- Auth: Email/Password + Social login integration points (Google, Facebook, LINE, Azure mock)

## Main Features
- Role-based login flow (web auth context)
- Real-time style dashboard pages for IoT farm operations
- Device/tank/analytics pages
- Theme mode toggle (light/dark)
- Backend API with SQL connection and migration scripts

## Project Structure
```text
.
├─ src/
│  ├─ features/
│  │  ├─ auth/
│  │  └─ admin/
│  ├─ components/
│  ├─ layouts/
│  └─ assets/
├─ server/
│  ├─ migrations/
│  ├─ middleware/
│  └─ server.js
├─ scripts/
│  └─ tools/
└─ docs/
   ├─ guides/
   ├─ operations/
   ├─ notes/
   └─ reference/
```

## Quick Start
### 1) Install dependencies
```bash
npm install
cd server && npm install && cd ..
```

### 2) Configure environment
- Frontend: copy `.env.example` to `.env`
- Backend: copy `server/.env.example` to `server/.env`

### 3) Run backend
```bash
npm run server
```

### 4) Run frontend
```bash
npm run dev
```

Open: `http://localhost:5173`

## Scripts
- `npm run dev` - start web frontend (Vite)
- `npm run server` - start backend API
- `npm run dev:all` - start server + frontend together
- `npm run build` - production build
- `npm run build:gh` - production build for GitHub Pages (`/GreenCrop-NAT-IOT-WEB/` base path)
- `npm run deploy` - publish `dist/` to `gh-pages` branch
- `npm run lint` - lint source files

## Deploy Frontend to GitHub Pages (without breaking API/DB)
1. Keep backend and database deployed/running separately (GitHub Pages hosts frontend only).
2. Create `.env.production` from `.env.production.example`.
3. Set `VITE_API_URL` in `.env.production` to your real backend URL, for example:
   - `https://your-backend-domain.com/api`
4. Run:
```bash
npm run deploy
```
5. In GitHub repo settings, enable Pages with:
   - Source: `Deploy from a branch`
   - Branch: `gh-pages` / `(root)`

Notes:
- Local development behavior is unchanged.
- In development, auth API can still fall back to localhost (`3001`) if needed.
- In production build, frontend uses only `VITE_API_URL` so it connects to the intended backend.

## Notes for Portfolio Demo
- Keep `server/.env` with local DB credentials ready before demo.
- For social login production usage, set provider credentials in both frontend and backend env.
- Documentation is grouped under `docs/` (see `docs/DOCS_INDEX.md`).

## Status
- Build: passing (`npm run build`)
- Lint: passing without errors (`npm run lint`, warnings remain)
