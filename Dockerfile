# Stage 1: Build
FROM node:20 AS builder

WORKDIR /app

ENV NODE_ENV=development

# Kopiujemy TYLKO package.json — bez package-lock.json
# (lockfile z macOS powoduje problemy z devDependencies na Linuxie)
COPY package.json ./
RUN npm install

# Weryfikacja
RUN ls node_modules/.bin/vite && echo "✓ vite ok" && \
    ls node_modules/.bin/tsc  && echo "✓ tsc ok"

COPY . .

RUN node_modules/.bin/vite build && node_modules/.bin/tsc -p tsconfig.server.json

# Stage 2: Production runtime
FROM node:20-slim AS runner

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json .

RUN mkdir -p /app/data/events

ENV NODE_ENV=production
ENV PORT=3000
ENV WS_URL=ws://host.docker.internal:18789
ENV EVENTS_DIR=/app/data/events

EXPOSE 3000

CMD ["node", "server/dist/index.js"]
