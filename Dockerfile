FROM node:20-bullseye
# Define diretório de trabalho
WORKDIR /app

# Instala dependências necessárias para Puppeteer (Chromium)
RUN apt-get update && apt-get install -y \
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
    # Ferramentas úteis
    vim \
    && rm -rf /var/lib/apt/lists/* \
		# Instala o Chromium
		&& apt-get update && apt-get install -y \
		chromium \
    chromium-sandbox

# Garante que o Puppeteer saiba onde está o Chromium
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Copia package.json e instala dependências
COPY package*.json ./
RUN npm install -g @nestjs/cli && npm install

# Copia código
COPY . .

# Expõe a porta da API
EXPOSE 8080

# Inicia em modo dev
CMD ["npm", "run", "start:dev"]
