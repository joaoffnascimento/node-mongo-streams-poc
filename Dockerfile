# Dockerfile for POC - optimized for development
FROM node:20-alpine

# Install basic tools
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./
COPY yarn.lock ./
COPY tsconfig.json ./

# Install ALL dependencies (including devDependencies for ts-node)
RUN yarn install --frozen-lockfile

# Copy source code after dependencies
COPY src/ ./src/

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the API server using ts-node
CMD ["yarn", "start"]
