# GENAI — Gen AI Platform for Automated Content Transformation

**SIH26154** · Category: Software · Theme: Smart Automation

A single-file frontend prototype: cinematic landing page + a working content-transformation workspace that calls the Claude API to turn one source document into multiple output formats (blog, LinkedIn, X thread, summary, email, video script, SEO meta, FAQ, slide outline, simplified/accessible variants, and translations).

## What's implemented

- **Upload** — `.txt`, `.md`, `.docx`, `.pdf`, `.srt`, `.vtt`, with structure-aware parsing for `.docx`
- **Transform** — 12 output formats, tone control, translation, brand voice profiles
- **Review** — side-by-side source/output, inline editing, feedback-driven regeneration, fact-grounding badges
- **Export** — `.docx`, `.pdf`, `.pptx`, copy to clipboard
- **Accounts** — demo-only workspace labeling (name + email, no password) so profiles/history don't mix between people testing it

## ⚠️ Important limitation

This is a **frontend-only prototype**. The Claude API calls only work inside the Claude.ai preview environment that proxies and authenticates them invisibly. If you open this file as a static site elsewhere, generation will not work without standing up a backend API proxy that holds a real API key server-side.

See the PRD for the full architecture, including the backend/database work still required for a production version (auth, persistence, job queue, rate limiting).

## Running it

This is a single static HTML file with no build step. Open `index.html` directly in a browser, or serve it with any static file server:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Note: without the backend proxy described above, the "Transform with AI" button will fail outside the Claude.ai preview environment.

## Tech

Vanilla HTML/CSS/JS. Three.js (hero visual), GSAP (scroll animation), mammoth.js (.docx parsing), pdf.js (.pdf parsing), docx.js / jsPDF / PptxGenJS (exports).
