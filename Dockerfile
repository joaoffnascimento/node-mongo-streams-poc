# Simple Dockerfile for testing purposes
FROM node:20-alpine

# Install basic tools
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src/ ./src/

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the API server in development mode
CMD ["npm", "run", "web"]
