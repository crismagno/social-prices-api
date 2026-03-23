# ──────────────────────────────────────────
# Stage 1 — Builder
# ──────────────────────────────────────────
FROM node:20-bullseye AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

RUN npm install -g @nestjs/cli

COPY . .
RUN npm run build


# ──────────────────────────────────────────
# Stage 2 — Production runtime
# ──────────────────────────────────────────
FROM node:20-bullseye-slim AS production

WORKDIR /app

# Puppeteer / Chromium system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libexpat1 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    wget \
    xdg-utils \
    chromium \
    chromium-sandbox \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production

EXPOSE 8080
CMD ["npm", "run", "start:prod"]
