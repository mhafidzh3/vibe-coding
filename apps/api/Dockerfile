# FROM oven/bun:1-slim AS base
FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# We must build from the monorepo root to access workspace dependencies
# Copy root package files
COPY package.json bun.lock* ./

# Copy package files for each app to allow for efficient dependency caching
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install dependencies (on the monorepo level)
RUN bun install

# Copy the rest of the source code
COPY . .

# Expose the API port
EXPOSE 9001

# The startup command ensures the DB schema is pushed before the server starts
CMD ["sh", "-c", "bun run --filter @vibe/api db:push && bun run --filter @vibe/api dev"]
