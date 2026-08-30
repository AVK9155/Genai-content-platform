import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";

export const generateRouter = Router();

// ─── Config ───────────────────────────────────────────────────────────────────
function getConfig() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set — get a free key at aistudio.google.com/apikey");
  const model = process.env.AI_MODEL || "gemini-3.1-flash-lite";
  return { apiKey, model };
}

// ─── Core AI call — Google Gemini API with Auto-Fallback ────────────────
const FALLBACK_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview",
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
  "gemma-4-31b-it",
];

async function callAI(
  prompt: string,
  maxTokens: number,
  image?: { base64: string; mimeType: string }
): Promise<string> {
  const { apiKey, model: configuredModel } = getConfig();

  // Try configured model first, then fallbacks
  const candidateModels = [configuredModel, ...FALLBACK_MODELS.filter((m) => m !== configuredModel)];

  const parts: any[] = [];
  if (image && image.base64) {
    const cleanBase64 = image.base64.replace(/^data:[^;]+;base64,/, "");
    parts.push({
      inlineData: {
        mimeType: image.mimeType || "image/png",
        data: cleanBase64,
      },
    });
  }
  parts.push({ text: prompt });

  let lastError: Error | null = null;

  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { maxOutputTokens: maxTokens },
        }),
      });

      const data = (await res.json()) as any;
      if (!res.ok) {
        // If quota exceeded (429), try next model in cascade
        if (res.status === 429) {
          console.warn(`[Gemini Fallback] Quota hit on ${model}, trying next model...`);
          lastError = new Error(`429 on ${model}: ${data?.error?.message || "Rate limit"}`);
          continue;
        }
        throw new Error(`${res.status} ${JSON.stringify(data?.error || data)}`);
      }

      const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error(`No text content in Gemini response from ${model}.`);
      return text.trim();
    } catch (err: any) {
      lastError = err;
      if (err?.message?.includes("429")) {
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error("All AI models exceeded rate limit — please wait a minute.");
}

function parseJsonResult(raw: string): Record<string, string> {
  const clean = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  let parsed: any;
  try {
    parsed = JSON.parse(clean);
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) parsed = JSON.parse(match[0]);
    else throw new Error("Could not parse model response as JSON.");
  }

  // Normalize every value to a string
  const normalized: Record<string, string> = {};
  for (const [key, val] of Object.entries(parsed)) {
    if (typeof val === "string") {
      normalized[key] = val;
    } else if (Array.isArray(val)) {
      normalized[key] = val.map((item) => typeof item === "string" ? item : JSON.stringify(item)).join("\n\n");
    } else if (val !== null && typeof val === "object") {
      // If object with fields like title/body or paragraphs
      const lines = Object.entries(val).map(([subKey, subVal]) => {
        return typeof subVal === "string" ? `${subVal}` : JSON.stringify(subVal);
      });
      normalized[key] = lines.join("\n\n");
    } else {
      normalized[key] = String(val ?? "");
    }
  }
  return normalized;
}

// ─── Rate limiters ────────────────────────────────────────────────────────────
const generateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  message: { error: "Too many generation requests — please wait a moment and try again." },
  standardHeaders: true, legacyHeaders: false,
});
const groundingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 30,
  message: { error: "Too many grounding checks — please wait a moment." },
  standardHeaders: true, legacyHeaders: false,
});

// ─── Format definitions ───────────────────────────────────────────────────────
const FORMAT_LABELS: Record<string, string> = {
  blog: "Blog Post", linkedin: "LinkedIn Post", twitter: "X / Twitter Thread",
  summary: "Summary", email: "Email Newsletter", video: "Video Script",
  seo: "SEO Meta Description", faq: "FAQ Section", slides: "Slide Outline",
  simplified: "Simplified Reading Level", captions: "Captions (SRT)",
  alttext: "Alt Text Suggestions", translation: "Translation",
};

const FORMAT_INSTRUCTIONS: Record<string, string> = {
  blog: "A well-structured blog post (400-700 words) with a compelling headline, an engaging intro, subheadings, and a clear conclusion.",
  linkedin: "A LinkedIn post (120-200 words) that opens with a hook, uses short punchy paragraphs and line breaks, and ends with a light call-to-action or question. No hashtags spam — 2-3 relevant ones max.",
  twitter: "A Twitter/X thread of 5-7 tweets. Number each tweet (1/, 2/, etc). First tweet is a strong hook under 240 characters.",
  summary: "A concise summary in 3-5 sentences capturing the core argument and any key facts or figures, followed by 3-5 bullet-point key takeaways.",
  email: "A short email newsletter with a subject line, a one-line preview text, a friendly intro, 2-3 short sections with subheadings, and a closing line.",
  video: "A video script (60-90 seconds spoken) with a HOOK, BODY, and CTA clearly labeled, written in a natural spoken voice with short sentences.",
  seo: "An SEO meta title (under 60 characters) and meta description (under 155 characters), plus 5 relevant target keywords.",
  faq: "A set of 5-6 frequently asked questions and answers derived from the source content, each answer 1-3 sentences.",
  slides: 'A presentation slide outline. Format each slide exactly as "Slide N: <title>" on its own line, followed by 3-5 short bullet points starting with "- ". Aim for 6-10 slides.',
  simplified: "A simplified, plain-language rewrite at roughly a 6th-8th grade reading level. Short sentences, common words, preserve every fact and figure from the source.",
  captions: "Caption/subtitle text in SRT format: numbered cues, timestamp ranges (HH:MM:SS,mmm --> HH:MM:SS,mmm), ~3-5 seconds per cue, under 40 characters per line.",
  alttext: "A list of 4-6 suggested alt-text descriptions for visuals — each a concise, screen-reader-friendly description under 125 characters.",
};

function buildFormatBlocks(formats: string[], translateLang: string): string {
  return formats.map((f) => {
    if (f === "translation") {
      return `### Translation (${translateLang})\nA faithful translation of the FULL source content into ${translateLang}, preserving meaning, structure, tone and figures exactly.`;
    }
    return `### ${FORMAT_LABELS[f] || f}\n${FORMAT_INSTRUCTIONS[f] || "Generate relevant content."}`;
  }).join("\n\n");
}

// ─── Schemas ──────────────────────────────────────────────────────────────────
const GenerateSchema = z.object({
  sourceText: z.string().optional().default(""),
  imageBase64: z.string().optional(),
  imageMimeType: z.string().optional(),
  formats: z.array(z.string()).min(1).max(15),
  tone: z.string().default("professional"),
  brandNotes: z.string().optional().default(""),
  translateLang: z.string().optional().default("none"),
});
const GroundingSchema = z.object({
  sourceText: z.string().min(1).max(40000),
  formats: z.array(z.string()).min(1),
  results: z.record(z.string()),
});
const ReviseSchema = z.object({
  sourceText: z.string().min(1).max(40000),
  fmt: z.string(), label: z.string(), currentText: z.string(),
  feedback: z.string(), tone: z.string().default("professional"),
  brandNotes: z.string().optional().default(""),
  translateLang: z.string().optional().default("none"),
});

// ─── POST /api/generate ───────────────────────────────────────────────────────
generateRouter.post("/", generateLimiter, async (req, res) => {
  const parsed = GenerateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

  const { sourceText, imageBase64, imageMimeType, formats, tone, brandNotes, translateLang } = parsed.data;

  if (!sourceText?.trim() && !imageBase64) {
    return res.status(400).json({ error: "Please provide either source text or an image." });
  }

  const imageParam = imageBase64 ? { base64: imageBase64, mimeType: imageMimeType || "image/png" } : undefined;

  // Helper: call AI for a specific subset of formats
  async function generateBatch(batchFormats: string[]): Promise<Record<string, string>> {
    const voiceLine = brandNotes ? `\nBrand voice notes: ${brandNotes}\n` : "";
    const formatBlocks = buildFormatBlocks(batchFormats, translateLang ?? "none");
    const imageInstruction = imageBase64 ? "\n[SOURCE INCLUDES AN ATTACHED IMAGE: Analyze all text, charts, diagrams, tables, infographics, handwritten notes, and visual data in the image and transform them faithfully.]\n" : "";

    const prompt = `You are a content transformation engine. Given the SOURCE CONTENT${imageBase64 ? " and attached image" : ""} below, generate the following outputs grounded strictly in facts from the source (never invent facts). Tone: ${tone}.${voiceLine}
${imageInstruction}
${formatBlocks}

Respond ONLY with a valid JSON object — no markdown fences, no explanation, no preamble. Keys must be exactly: ${batchFormats.join(", ")}. Use "\\n" for line breaks within values.

SOURCE CONTENT:
"""
${(sourceText || "See attached image for source content.").slice(0, 12000)}
"""`;

    const text = await callAI(prompt, 8000, imageParam);
    return parseJsonResult(text);
  }

  try {
    let results: Record<string, string> = {};

    // Split into batches of max 6 formats to avoid token limits
    const BATCH_SIZE = 6;
    if (formats.length <= BATCH_SIZE) {
      results = await generateBatch(formats);
    } else {
      const batches: string[][] = [];
      for (let i = 0; i < formats.length; i += BATCH_SIZE) {
        batches.push(formats.slice(i, i + BATCH_SIZE));
      }
      for (const batch of batches) {
        const batchResults = await generateBatch(batch);
        results = { ...results, ...batchResults };
      }
    }

    return res.json({ results });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Generation failed";
    console.error("generate error:", msg);
    return res.status(500).json({ error: msg });
  }
});


// ─── POST /api/generate/check-grounding ──────────────────────────────────────
generateRouter.post("/check-grounding", groundingLimiter, async (req, res) => {
  const parsed = GroundingSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const { sourceText, formats, results } = parsed.data;
  const nonTranslation = formats.filter((f) => f !== "translation");
  if (!nonTranslation.length) return res.json({ grounding: {} });

  const pairs = nonTranslation
    .map((f) => `### ${FORMAT_LABELS[f] || f}\n${(results[f] || "").slice(0, 2000)}`)
    .join("\n\n");

  const prompt = `You are a fact-checking layer. For each GENERATED OUTPUT, decide if every factual claim is supported by the SOURCE CONTENT.

Respond ONLY with valid JSON (no markdown):
{"<format key>": {"status": "grounded" or "review", "note": "<one short sentence only if review, else empty string>"}}

Keys: ${nonTranslation.join(", ")}.

SOURCE:
"""
${sourceText.slice(0, 8000)}
"""

GENERATED OUTPUTS:
${pairs}`;

  try {
    const text = await callAI(prompt, 1200);
    return res.json({ grounding: parseJsonResult(text) });
  } catch (err) {
    console.error("grounding error:", err);
    return res.json({ grounding: {} }); // non-fatal
  }
});

// ─── POST /api/generate/revise ────────────────────────────────────────────────
generateRouter.post("/revise", generateLimiter, async (req, res) => {
  const parsed = ReviseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const { sourceText, fmt, label, currentText, feedback, tone, brandNotes, translateLang } = parsed.data;
  const isTranslation = fmt === "translation";
  const formatDesc = isTranslation
    ? `A faithful translation of the source content into ${translateLang}.`
    : FORMAT_INSTRUCTIONS[fmt] || "Generate relevant content.";
  const voiceLine = brandNotes ? `\nBrand voice notes: ${brandNotes}\n` : "";

  const prompt = `You are revising generated content based on user feedback. Stay grounded in facts from the source only. Tone: ${tone}.${voiceLine}

FORMAT: ${label}
REQUIREMENTS: ${formatDesc}

SOURCE:
"""
${sourceText.slice(0, 12000)}
"""

CURRENT DRAFT:
"""
${currentText}
"""

FEEDBACK:
"""
${feedback}
"""

Revise the draft to address the feedback. Respond with ONLY the revised text — no JSON, no preamble, no markdown fences.`;

  try {
    const text = await callAI(prompt, 2000);
    return res.json({ text });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Revision failed";
    console.error("revise error:", msg);
    return res.status(500).json({ error: msg });
  }
});
