# Build stage
FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

# Build arguments for Vite environment variables
ARG VITE_PUBLIC_API_ORIGIN
ARG VITE_TELEGRAM_BOT_USERNAME
ARG VITE_MAINTENANCE_MODE
ARG VITE_TEST_MODE

# Set environment variables for build
ENV VITE_PUBLIC_API_ORIGIN=$VITE_PUBLIC_API_ORIGIN
ENV VITE_TELEGRAM_BOT_USERNAME=$VITE_TELEGRAM_BOT_USERNAME
ENV VITE_MAINTENANCE_MODE=$VITE_MAINTENANCE_MODE
ENV VITE_TEST_MODE=$VITE_TEST_MODE

# Build the application
RUN pnpm run build

# Production stage
FROM nginx:alpine

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
