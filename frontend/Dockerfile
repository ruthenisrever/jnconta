FROM node:20-alpine AS builder

WORKDIR /app

# Build-time env vars (Next.js bakes NEXT_PUBLIC_* at build time)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Install dependencies
COPY package*.json ./
RUN npm install

# Build the project
COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

# Copy built assets and production dependencies
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 80

# Environment variable for Next.js to run on port 80
ENV PORT 80
ENV NODE_ENV production

CMD ["npm", "start"]
