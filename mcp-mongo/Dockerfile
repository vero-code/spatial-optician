# Use a lightweight official Node.js Alpine image
FROM node:20-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy dependency manifests
COPY package.json tsconfig.json ./

# Install packages
RUN npm install

# Copy TypeScript source code
COPY src/ ./src/

# Compile TypeScript to JavaScript
RUN npm run build

# Remove development dependencies to keep the image lightweight
RUN npm prune --production

# Create final clean production runner image
FROM node:20-alpine

WORKDIR /app

# Copy built code and production packages from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build

# The server automatically detects the PORT env variable injected by Cloud Run
ENV PORT=8080
EXPOSE 8080

# Command to start the server
CMD ["node", "build/index.js"]
