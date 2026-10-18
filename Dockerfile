# ==========================================
# AutoFlow AI - Production Multi-Stage Dockerfile
# ==========================================

# Step 1: Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install native build tools for SQLite compilation
RUN apk add --no-cache python3 make g++

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src/ ./src/
COPY public/ ./public/
RUN npm run build

# Step 2: Production Runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3456
ENV DB_PATH=/app/data/autoflow.sqlite

COPY package*.json ./

# Install production dependencies including native SQLite bindings
RUN apk add --no-cache python3 make g++ \
    && npm ci --omit=dev \
    && apk del python3 make g++

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Setup persistent storage folder
RUN mkdir -p /app/data && chown -R node:node /app

USER node

EXPOSE 3456

VOLUME ["/app/data"]

CMD ["npm", "start"]
