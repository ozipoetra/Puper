# Dockerfile
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Install dependencies first for better caching
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

# ----------------------------
# Runtime stage
# ----------------------------
FROM node:22-bookworm-slim

# Install Chromium dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libglib2.0-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    libxshmfence1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app .

# Puppeteer/Chromium configuration

# Create a non-root user
# RUN groupadd -r node && \
#    useradd -r -g node -d /app node && \
#    chown -R node:node /app

# USER node

EXPOSE 3000

# Use node --watch for development (remove for production)
CMD ["node", "api/index.js"]
