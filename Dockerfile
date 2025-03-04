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
CMD ["node", "app.js"]
