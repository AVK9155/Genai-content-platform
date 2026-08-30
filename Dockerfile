# ═══════════════════════════════════════════════════════════════════════════════
#  GenAI Content Transformation Platform — Dockerfile
#  Multi-stage build: installs deps → compiles TypeScript → runs lean image
# ═══════════════════════════════════════════════════════════════════════════════

# ── Stage 1: Build ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy backend package files first (layer cache optimisation)
COPY backend-genai/package*.json ./backend-genai/
RUN cd backend-genai && npm ci --include=dev

# Copy backend source and compile TypeScript
COPY backend-genai/ ./backend-genai/
RUN cd backend-genai && npm run build

# ── Stage 2: Production image ──────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Install only production dependencies
COPY backend-genai/package*.json ./backend-genai/
RUN cd backend-genai && npm ci --omit=dev && npm cache clean --force

# Copy compiled JS from builder
COPY --from=builder /app/backend-genai/dist ./backend-genai/dist

# Copy Prisma schema (needed at runtime)
COPY backend-genai/prisma ./backend-genai/prisma

# Copy frontend static files (served by Express)
COPY index.html ./index.html
COPY shared.html ./shared.html
COPY presentation.html ./presentation.html
COPY genai_content_workflow.png ./genai_content_workflow.png

# Create data directory for JSON persistence (shares, comments, versions)
RUN mkdir -p backend-genai/data

# ── Environment ────────────────────────────────────────────────────────────────
ENV NODE_ENV=production
ENV PORT=3002

# Expose the application port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3002/api/health || exit 1

# ── Start ──────────────────────────────────────────────────────────────────────
WORKDIR /app/backend-genai
CMD ["node", "dist/index.js"]
