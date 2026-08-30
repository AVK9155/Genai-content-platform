# Jal Suraksha — Run Doc

## How to Reproduce Artifacts
No artifacts to copy — everything builds from source.

## How to Run the Server

1. **Build frontend** (from `frontend/`):
   ```
   cd frontend && npx vite build
   ```

2. **Build backend** (from `backend/`):
   ```
   cd backend && npx tsc
   ```

3. **Start backend** (serves both API and static frontend on port 3001):
   ```
   cd backend && node dist/index.js
   ```
   Backend serves the built frontend from `frontend/dist/` at `/`.
   API routes are at `/api/*`.

## Architecture
- Landing page at `/` (no auth required)
- Login at `/login`
- Register at `/register`
- App dashboard at `/app/*` (auth required, 5 roles)
- Backend API at `http://localhost:3001/api/*`
- SQLite database at `backend/prisma/dev.db`
- Seed data pre-loaded with 1,698 records across 10 NE India districts
