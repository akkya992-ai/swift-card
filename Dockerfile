# Multi-stage production build for DailyMart Backend
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies required for compilation
COPY package*.json ./
RUN npm ci

# Copy full source and build application
COPY . .
RUN npm run build

# Final ultra-light production runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only (for external esbuild modules)
COPY package*.json ./
RUN npm ci --only=production

# Copy built assets and server binary
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/database.json ./database.json
COPY --from=builder /app/src/assets ./src/assets
COPY --from=builder /app/firebase-applet-config*.json ./

EXPOSE 3000

CMD ["npm", "run", "start"]
