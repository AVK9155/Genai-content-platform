import { Router } from "express";
import { z } from "zod";

export const scrapeRouter = Router();

const ScrapeSchema = z.object({
  url: z.string().url(),
});

function cleanHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, "")
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, "")
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, "")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, "")
    .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : null;
}

async function scrapeYouTube(videoId: string, originalUrl: string) {
  // 1. Try official oEmbed
  let oembedData: any = null;
  try {
    const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (oembedRes.ok) oembedData = await oembedRes.json();
  } catch {}

  // 2. Try InnerTube Player API for detailed description & author
  let videoDetails: any = null;
  try {
    const itRes = await fetch("https://www.youtube.com/youtubei/v1/player", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        context: { client: { clientName: "WEB", clientVersion: "2.20240315.01.00" } },
        videoId,
      }),
    });
    if (itRes.ok) {
      const itData = (await itRes.json()) as any;
      videoDetails = itData.videoDetails;
    }
  } catch {}

  if (!oembedData && !videoDetails) {
    throw new Error(`This YouTube video (ID: ${videoId}) could not be found or is private/deleted.`);
  }

  const title = videoDetails?.title || oembedData?.title || "YouTube Video";
  const author = videoDetails?.author || oembedData?.author_name || "Unknown Creator";
  const description = videoDetails?.shortDescription || "";

  let content = `# YouTube Video: ${title}\n`;
  content += `**Creator:** ${author}\n`;
  content += `**URL:** ${originalUrl}\n\n`;

  if (description) {
    content += `## Video Overview & Description\n${description}\n\n`;
  }

  content += `*(Content extracted directly from YouTube video metadata for transformation.)*`;

  return {
    title,
    author,
    type: "youtube",
    content: content.trim(),
    hasTranscript: false,
  };
}

async function scrapeWebPage(url: string) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!res.ok) throw new Error(`Webpage returned status ${res.status}`);
  const rawHtml = await res.text();

  let title = "Web Page";
  const titleMatch = rawHtml.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch) title = titleMatch[1].trim();

  const cleaned = cleanHtml(rawHtml);

  if (cleaned.length < 50) {
    throw new Error("Could not extract readable article text from that URL.");
  }

  const content = `# ${title}\n**Source URL:** ${url}\n\n${cleaned.slice(0, 25000)}`;

  return {
    title,
    type: "webpage",
    content,
    hasTranscript: false,
  };
}

scrapeRouter.post("/", async (req, res) => {
  const parsed = ScrapeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Please enter a valid web URL (e.g. https://...)" });

  const { url } = parsed.data;

  try {
    const youtubeId = extractYouTubeId(url);
    if (youtubeId) {
      const data = await scrapeYouTube(youtubeId, url);
      return res.json(data);
    } else {
      const data = await scrapeWebPage(url);
      return res.json(data);
    }
  } catch (err: any) {
    console.error("Scrape error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "Failed to fetch content from URL." });
  }
});
