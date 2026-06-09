# ==========================================
# Stage 1: Build React Frontend
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./

ENV VITE_BACKEND_URL=""
RUN npm run build

# ==========================================
# Stage 2: Build Node.js MCP Server
# ==========================================
FROM node:20-alpine AS mcp-builder
WORKDIR /mcp-mongo
COPY mcp-mongo/package*.json ./
RUN npm ci
COPY mcp-mongo/ ./
RUN npm run build

FROM python:3.11-slim
WORKDIR /app

RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

COPY backend/pyproject.toml ./
COPY README.md ./
COPY backend/ ./
RUN pip install .

COPY --from=frontend-builder /frontend/dist ./static

COPY --from=mcp-builder /mcp-mongo/build ./mcp-mongo/build
COPY --from=mcp-builder /mcp-mongo/package*.json ./mcp-mongo/
COPY --from=mcp-builder /mcp-mongo/node_modules ./mcp-mongo/node_modules

COPY entrypoint.sh ./
RUN sed -i 's/\r$//' entrypoint.sh && chmod +x entrypoint.sh

EXPOSE 8080

CMD ["./entrypoint.sh"]
