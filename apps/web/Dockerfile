# Stage 1: Build the React application
FROM oven/bun:1 AS builder
WORKDIR /usr/src/app

# Copy monorepo root package files
COPY package.json bun.lock* ./

# Copy package files for each app to allow for efficient dependency caching
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install dependencies (on the monorepo level)
RUN bun install

# Copy the rest of the source code
COPY . .

# Build the web application
# Note: This build context includes apps/api/src so Eden Treaty can resolve types
RUN bun run --filter @vibe/web build

# Stage 2: Serve the static files using Nginx
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from builder stage
COPY --from=builder /usr/src/app/apps/web/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
