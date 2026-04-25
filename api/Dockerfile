FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y openssl libssl-dev
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install

# Build the project
COPY . .
RUN rm -rf dist/
RUN npx prisma generate
RUN npm run build

FROM node:20-slim
RUN apt-get update && apt-get install -y openssl

WORKDIR /app

# Copy built assets and dependencies
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Fix: The user previously had 'Cannot find module /app/dist/main.js'
# This Dockerfile ensures 'dist' is created and copied.

EXPOSE 3000

CMD ["node", "dist/main.js"]
