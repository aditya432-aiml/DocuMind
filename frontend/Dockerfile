# Stage 1: Build dependency and application bundle
FROM node:20-slim AS builder

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install npm packages
RUN npm ci

# Copy application files
COPY . .

# Build the Next.js application
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# Stage 2: Runtime image
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy built files and runtime files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Expose the default Next.js port
EXPOSE 3000

# Start production server
CMD ["npm", "run", "start"]
