# GENAI Platform — Supported Input Types & Specifications

A complete reference guide for all input formats, file types, parsing pipelines, and sample test files supported by the GENAI Content Transformation Platform.

---

## 1. Overview Matrix

| # | Format Name | Extensions | Max Size | Parsing Engine | Auto Structure Detection |
|:---|:---|:---|:---|:---|:---:|
| 1 | **Images & Infographics** | `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.bmp` | 15 MB | Gemini Multimodal Vision API | Yes (Full Vision OCR) |
| 2 | **Direct Text / Paste** | *N/A* | 40,000 chars | In-memory normalizer | Yes |
| 3 | **Plain Text** | `.txt` | 15 MB | Regex structure parser | Yes |
| 4 | **Markdown** | `.md` | 15 MB | Native Markdown parser | Yes |
| 5 | **Microsoft Word** | `.docx` | 15 MB | Mammoth.js client-side | Yes |
| 6 | **Adobe PDF** | `.pdf` | 15 MB | PDF.js font-metric analyzer | Yes |
| 7 | **HTML Web Pages** | `.html`, `.htm` | 15 MB | DOMParser + semantic walker | Yes |
| 8 | **Spreadsheet (CSV)** | `.csv` | 15 MB | CSV-to-Markdown table engine | Yes |
| 9 | **Tab-Separated Data** | `.tsv` | 15 MB | TSV-to-Markdown table engine | Yes |
| 10 | **Structured JSON** | `.json` | 15 MB | Recursive tree formatter | Yes |
| 11 | **Rich Text Format** | `.rtf` | 15 MB | RTF control code decoder | Yes |
| 12 | **Subtitles / Captions**| `.srt`, `.vtt` | 15 MB | SRT/VTT cue & timestamp stripper | Yes |
| 13 | **Web & YouTube URLs** | `https://...`, `youtube.com/...` | Live Web | Server-side scraper + oEmbed extractor | Yes (Full Content Extraction) |

---

## 2. Format Details & Parsing Behaviors

### 📄 1. Plain Text (`.txt`)
- **Detection Rules:**
  - Markdown headings (`#`, `##`)
  - Underline headers (`===` for H1, `---` for H2)
  - Numbered sections (e.g. `1. Introduction`, `Section 2.1`)
  - ALL-CAPS lines (converted to H2 sections)
  - Bulleted lists (`-`, `*`, `•`)

### 📝 2. Markdown (`.md`)
- Preserves code blocks, nested lists, blockquotes, and header hierarchies.

### 📘 3. Word Documents (`.docx`)
- Converts document headings (`Heading 1`, `Heading 2`), lists, and paragraph breaks using Mammoth.js without server upload.

### 📕 4. PDF Documents (`.pdf`)
- Extracts text per page.
- Computes font size statistics and automatically flags lines with font-size ratio $\ge 1.45$ as `# H1` and $\ge 1.18$ as `## H2`.

### 🌐 5. HTML / Web Articles (`.html`, `.htm`)
- Parses `<h1>`–`<h6>`, `<p>`, `<ul>`, `<ol>`, and `<li>` tags into structured Markdown.

### 📊 6. Tabular Data (`.csv`, `.tsv`)
- Extracts rows and columns while respecting quotation marks.
- Formats data directly into Markdown tables for AI context retention.

### 🗂️ 7. Structured JSON (`.json`)
- Recursively formats nested JSON objects and arrays into structured sections and bold key-value pairs.

### 📜 8. Rich Text (`.rtf`)
- Strips RTF formatting tags, maps `\par` and `\line` to line breaks, and decodes Unicode character codes.

### 🎬 9. Video & Audio Subtitles (`.srt`, `.vtt`)
- Removes timestamp ranges (e.g., `00:01:20,000 --> 00:01:24,000`) and cue indexes.
- Reassembles raw spoken-word monologue/dialogue transcript.

---

## 3. Sample Test Files

You can test these samples directly:

### Sample CSV (`sample_data.csv`)
```csv
Product,Category,Q1 Revenue,Growth Rate
HeliosGrid-4,Clean Energy,$14.2M,+38%
LuminaFlow,Productivity SaaS,$8.6M,+112%
SparseCross-ViT,Healthcare AI,$5.1M,+74%
```

### Sample JSON (`sample_report.json`)
```json
{
  "reportTitle": "Annual AI Infrastructure Analysis",
  "author": "Engineering Research Team",
  "metrics": {
    "latencyReduction": "64%",
    "accuracy": "98.4%",
    "sampleCount": 120000
  },
  "keyFindings": [
    "Token pruning reduces memory overhead by 64%",
    "Diagnostic accuracy exceeds baseline by 2.1%"
  ]
}
```

### Sample SRT Subtitles (`sample_captions.srt`)
```srt
1
00:00:01,000 --> 00:00:04,500
Welcome back to The Growth Blueprint. Today we are breaking down SaaS pricing models.

2
00:00:05,000 --> 00:00:08,200
If you charge per seat instead of usage, you disincentivize team adoption.
```

---

*File generated for GENAI Platform — SIH 2026*
