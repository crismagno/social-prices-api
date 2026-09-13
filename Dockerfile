# ─────────────────────────
# BUILD
# ─────────────────────────
FROM node:20-bookworm AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --verbose

COPY . .
RUN npm run build


# ─────────────────────────
# PRODUCTION
# ─────────────────────────
FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    ca-certificates \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

RUN npm ci --omit=dev

EXPOSE 8080

CMD ["node", "dist/main.js"]
