# GENAI — Gen AI Platform for Automated Content Transformation

**SIH26154** · Category: Software · Theme: Smart Automation

A cinematic landing page + a working content-transformation workspace that calls the Claude API to turn one source document into multiple output formats (blog, LinkedIn, X thread, summary, email, video script, SEO meta, FAQ, slide outline, simplified/accessible variants, and translations).

The frontend is a single static `index.html`. It now ships with a small **Node/Express backend** (`/backend`) that holds the real Anthropic API key server-side and proxies the three AI calls the frontend makes, so the app works as a normal deployable web app — not just inside the Claude.ai preview environment.

## What's implemented

- **Upload** — `.txt`, `.md`, `.docx`, `.pdf`, `.srt`, `.vtt`, with structure-aware parsing for `.docx`
- **Transform** — 12 output formats, tone control, translation, brand voice profiles
- **Review** — side-by-side source/output, inline editing, feedback-driven regeneration, fact-grounding badges
- **Export** — `.docx`, `.pdf`, `.pptx`, copy to clipboard
- **Accounts** — demo-only workspace labeling (name + email, no password) so profiles/history don't mix between people testing it
- **Backend proxy** (`/backend`) — Express server that serves `index.html` and exposes `POST /api/messages`, which forwards requests to `https://api.anthropic.com/v1/messages` using a server-side `ANTHROPIC_API_KEY`. Includes basic rate limiting and model/token-limit validation.
- **Demo Mode** — if no real `ANTHROPIC_API_KEY` is configured, the backend serves realistic mock content matching each requested format instead of calling Anthropic, so the full app (upload → transform → review → export) works immediately with zero setup and zero cost.

## Running it locally

```bash
cd backend
npm install
npm start
# open http://localhost:3000
```

That's it — **no API key required to try it.** If `backend/.env` doesn't exist or has no real key in it, the server automatically runs in **Demo Mode**: every "Transform with AI" call returns realistic sample content instead of calling Anthropic, at zero cost. You'll see an amber **"Demo Mode"** badge in the top-right corner of the workspace when this is active.

### Switching to real AI output

1. Get a key from the [Anthropic Console](https://console.anthropic.com/settings/keys).
2. `cp .env.example .env` inside `backend/`, then paste your key into `ANTHROPIC_API_KEY=`.
3. Restart the server (`npm start`). The badge will switch to "Engine Online" and generations will use the real Claude API.

The server serves the frontend and the API from the same origin (port 3000 by default), so there's nothing else to configure — no CORS setup, no separate frontend build.

## Deploying it

Any Node host works (Render, Railway, Fly.io, a VPS, etc.):

1. Push this repo (or just the project folder) to your host.
2. Set the **build/start directory** to `backend/`, or set the start command to `node backend/server.js` from the repo root.
3. Set the environment variable `ANTHROPIC_API_KEY` in your host's dashboard (never commit `.env`).
4. Optionally set `PORT` — most hosts inject this automatically.
5. Deploy. The single Node process serves both the API and the static frontend.

## How the frontend talks to the backend

The frontend's three fetch calls (`generate`, `fact-check`, `regenerate/revise`) all call `POST /api/messages` on the **same origin**, sending `{ model, max_tokens, messages }` — the same shape the Anthropic API expects. The backend:

- Attaches the real `x-api-key` header (never sent to the browser)
- Clamps `model` to an allow-list and `max_tokens` to a ceiling
- Rate-limits requests (20 generations/minute per IP by default)
- Returns Anthropic's response (or a clear error) straight through

If you deploy the frontend separately from the backend, update the fetch URLs in `index.html` (search for `/api/messages`) to point at your backend's full URL instead of a relative path.

## ⚠️ Still a prototype

This backend is intentionally minimal: no auth, no database, no job queue. Profiles/history still live in browser storage, not a real account system. See the PRD for the fuller production architecture (auth, persistence, job queue, per-user rate limiting) if you want to take this further.

## Tech

Vanilla HTML/CSS/JS frontend. Three.js (hero visual), GSAP (scroll animation), mammoth.js (.docx parsing), pdf.js (.pdf parsing), docx.js / jsPDF / PptxGenJS (exports). Node.js + Express backend proxy.
