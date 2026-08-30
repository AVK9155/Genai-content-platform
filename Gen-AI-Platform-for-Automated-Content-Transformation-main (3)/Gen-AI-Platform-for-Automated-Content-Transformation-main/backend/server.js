// GENAI backend — a small Express server that:
//   1. Serves the static frontend (index.html) from the project root
//   2. Proxies content-generation calls to the Anthropic API, keeping the
//      real API key on the server so it is never exposed to the browser.
//
// Run locally:
//   cd backend
//   npm install
//   cp .env.example .env   # then paste your ANTHROPIC_API_KEY into .env
//   npm start
//
// Then open http://localhost:3000

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();

const PORT = process.env.PORT || 3000;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_VERSION = '2023-06-01';

// Only allow a small, known set of models to be requested from the browser.
// Falls back to a safe default if the client sends something unexpected.
const DEFAULT_MODEL = 'claude-sonnet-4-6';
const ALLOWED_MODELS = new Set([
  'claude-sonnet-4-6',
  'claude-opus-4-6',
]);

const MAX_TOKENS_CEILING = 4000;

// DEMO MODE: if there's no real key configured, the server serves
// realistic mock content instead of calling Anthropic at all. This makes
// the whole app (upload -> transform -> review -> export) work out of the
// box with zero cost and zero setup. Add a real ANTHROPIC_API_KEY to
// backend/.env at any time to switch to genuine AI-generated output —
// no code changes needed, just restart the server.
const PLACEHOLDER_KEYS = new Set(['', 'sk-ant-your-key-here']);
const DEMO_MODE = !ANTHROPIC_API_KEY || PLACEHOLDER_KEYS.has(ANTHROPIC_API_KEY.trim());

if (DEMO_MODE) {
  console.warn(
    '\n[GENAI backend] Running in DEMO MODE (no ANTHROPIC_API_KEY configured).\n' +
    'The app will work fully with realistic sample content, at no cost.\n' +
    'To generate real AI output, add a real key to backend/.env and restart.\n'
  );
} else {
  console.log('[GENAI backend] ANTHROPIC_API_KEY detected — running in LIVE mode.');
}

app.use(cors());
app.use(express.json({ limit: '15mb' }));

// Basic abuse protection. Content generation calls are the expensive path,
// so they get their own, tighter limiter than the rest of the API.
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', generalLimiter);

const generateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many generation requests — please wait a moment and try again.' },
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, apiKeyConfigured: Boolean(ANTHROPIC_API_KEY), demoMode: DEMO_MODE });
});

// ---------------------------------------------------------------------
// Demo-mode mock generation. Mirrors the three prompt shapes the
// frontend sends (bulk generate, fact-check, single-format revise) by
// pattern-matching the prompt text, so the UI's parsing logic works
// unchanged whether it's talking to the real API or this mock.
// ---------------------------------------------------------------------

const MOCK_FORMAT_LABELS = {
  blog: 'Blog Post', linkedin: 'LinkedIn Post', twitter: 'X / Twitter Thread',
  summary: 'Summary', email: 'Email', video: 'Video Script', seo: 'SEO Meta',
  faq: 'FAQ', slides: 'Slide Outline', simplified: 'Simplified Version',
  captions: 'Captions', alttext: 'Alt Text', translation: 'Translation',
};

function extractSourceSnippet(promptText) {
  const match = promptText.match(/SOURCE CONTENT:\s*"""([\s\S]*?)"""/);
  if (!match) return '';
  const snippet = match[1].trim().replace(/\s+/g, ' ').slice(0, 140);
  return snippet;
}

function mockContentFor(fmt, snippet) {
  const teaser = snippet ? `"${snippet}${snippet.length >= 140 ? '…' : ''}"` : 'your source content';
  const note = 'Add a real ANTHROPIC_API_KEY in backend/.env to generate genuine, source-grounded output.';
  switch (fmt) {
    case 'blog':
      return `[DEMO MODE — sample output]\n\n# A Sample Blog Post\n\nThis placeholder stands in for a real blog post that would be written from ${teaser}\n\n## Key Takeaway\nIn live mode, this section expands on the actual points from your source with a proper intro, body, and conclusion.\n\n${note}`;
    case 'linkedin':
      return `[DEMO MODE — sample output]\n\nExcited to share some thinking based on ${teaser} 👇\n\nThis is placeholder LinkedIn copy. ${note}\n\n#DemoMode #ContentAI`;
    case 'twitter':
      return `[DEMO MODE — sample output]\n\n1/ This thread is a placeholder standing in for real output about ${teaser}\n\n2/ ${note}\n\n3/ This shows the structure a real 3-part thread would follow.`;
    case 'summary':
      return `[DEMO MODE — sample output] A short placeholder summary standing in for ${teaser}. ${note}`;
    case 'email':
      return `Subject: [DEMO MODE] Sample subject line\n\nHi there,\n\nThis is placeholder email copy standing in for a real message about ${teaser}.\n\n${note}\n\nBest,\nYour Team`;
    case 'video':
      return `[DEMO MODE — sample output]\n\nSCENE 1 — HOOK\nPlaceholder video script opening about ${teaser}.\n\nSCENE 2 — BODY\n${note}\n\nSCENE 3 — CTA\nThanks for watching!`;
    case 'seo':
      return `Title Tag: [DEMO MODE] Sample SEO Title\nMeta Description: Placeholder meta description standing in for ${teaser}. ${note}`;
    case 'faq':
      return `Q: What is this?\nA: [DEMO MODE] Placeholder FAQ answer standing in for real content about ${teaser}.\n\nQ: How do I get real output?\nA: ${note}`;
    case 'slides':
      return `Slide 1: [DEMO MODE] Title Slide\n- Placeholder subtitle about ${teaser}\n\nSlide 2: Key Point\n- ${note}\n\nSlide 3: Conclusion\n- Sample closing bullet`;
    case 'simplified':
      return `[DEMO MODE — sample output] A simplified placeholder rewrite of ${teaser}. ${note}`;
    case 'captions':
      return `[DEMO MODE — sample output]\n00:00 Placeholder caption line one\n00:03 Placeholder caption line two, standing in for ${teaser}`;
    case 'alttext':
      return `[DEMO MODE] Placeholder alt text describing an image related to ${teaser}.`;
    case 'translation':
      return `[DEMO MODE — sample output] Placeholder translated text standing in for a real translation of ${teaser}. ${note}`;
    default:
      return `[DEMO MODE — sample output] Placeholder content for "${MOCK_FORMAT_LABELS[fmt] || fmt}" based on ${teaser}. ${note}`;
  }
}

function buildMockResponseText(promptText) {
  // Fact-check / grounding call
  if (/Respond ONLY with valid JSON.*shaped like:\s*\{"<format key>"/s.test(promptText) ||
      promptText.includes('fact-checking layer')) {
    const keysMatch = promptText.match(/Use these exact format keys:\s*([^.\n]+)/);
    const keys = keysMatch ? keysMatch[1].split(',').map(s => s.trim()).filter(Boolean) : [];
    const result = {};
    keys.forEach(k => { result[k] = { status: 'grounded', note: '' }; });
    return JSON.stringify(result);
  }

  // Single-format revision call
  if (promptText.includes('Respond with ONLY the revised text for this one format')) {
    const formatMatch = promptText.match(/FORMAT:\s*([^\n]+)/);
    const feedbackMatch = promptText.match(/USER FEEDBACK ON WHAT TO CHANGE:\s*"""([\s\S]*?)"""/);
    const label = formatMatch ? formatMatch[1].trim() : 'this format';
    const feedback = feedbackMatch ? feedbackMatch[1].trim() : '';
    return `[DEMO MODE — sample revision]\n\nThis is a placeholder revision of the ${label} draft` +
      (feedback ? `, acknowledging your feedback: "${feedback.slice(0, 120)}"` : '') +
      `.\n\nAdd a real ANTHROPIC_API_KEY in backend/.env to generate a genuine revision.`;
  }

  // Bulk generate call
  const formatsMatch = promptText.match(/Only include keys for these requested formats:\s*([^.\n]+)/);
  const formats = formatsMatch ? formatsMatch[1].split(',').map(s => s.trim()).filter(Boolean) : ['summary'];
  const snippet = extractSourceSnippet(promptText);
  const result = {};
  formats.forEach(fmt => { result[fmt] = mockContentFor(fmt, snippet); });
  return JSON.stringify(result);
}

function buildMockAnthropicResponse(messages) {
  const promptText = (messages[messages.length - 1] && messages[messages.length - 1].content) || '';
  const text = buildMockResponseText(String(promptText));
  return {
    id: 'demo_' + Date.now(),
    type: 'message',
    role: 'assistant',
    model: 'demo-mode',
    content: [{ type: 'text', text }],
    stop_reason: 'end_turn',
    usage: { input_tokens: 0, output_tokens: 0 },
  };
}

// Single proxy endpoint. The frontend sends the same shape it used to send
// straight to Anthropic ({ model, max_tokens, messages }); this endpoint
// validates/clamps it and attaches the real API key server-side.
app.post('/api/messages', generateLimiter, async (req, res) => {
  try {
    const { model, max_tokens, messages } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: '"messages" must be a non-empty array.' });
    }

    if (DEMO_MODE) {
      // Simulate a short bit of thinking time so the frontend's
      // processing-stage animation reads naturally instead of flashing.
      await new Promise(r => setTimeout(r, 500 + Math.random() * 700));
      return res.json(buildMockAnthropicResponse(messages));
    }

    const safeModel = ALLOWED_MODELS.has(model) ? model : DEFAULT_MODEL;
    const requestedTokens = Number(max_tokens);
    const safeMaxTokens = Number.isFinite(requestedTokens) && requestedTokens > 0
      ? Math.min(requestedTokens, MAX_TOKENS_CEILING)
      : 2000;

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: safeModel,
        max_tokens: safeMaxTokens,
        messages,
      }),
    });

    const data = await anthropicResponse.json();

    if (!anthropicResponse.ok) {
      const message = (data && data.error && data.error.message) || 'Anthropic API request failed.';
      return res.status(anthropicResponse.status).json({ error: message });
    }

    res.json(data);
  } catch (err) {
    console.error('[GENAI backend] /api/messages error:', err);
    res.status(500).json({ error: 'Internal server error while contacting the AI provider.' });
  }
});

// Serve the static frontend (index.html and any assets next to it) from
// the project root, one directory up from /backend.
const staticRoot = path.join(__dirname, '..');
app.use(express.static(staticRoot));

// SPA-style fallback so refreshing on any path still loads the app.
app.get('*', (req, res) => {
  res.sendFile(path.join(staticRoot, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[GENAI backend] listening on http://localhost:${PORT}`);
});
