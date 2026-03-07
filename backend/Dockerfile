FROM node:20-slim

# curl for healthcheck; openssl for Prisma schema/query engine binaries (libssl.so.3)
RUN apt-get update && apt-get install -y --no-install-recommends curl openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install ALL deps (including prisma CLI) then prune devDeps after generate
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client (requires CLI — prisma is now a prod dep)
RUN npx prisma generate

# Remove the only remaining devDep (nodemon) to keep image lean
RUN npm prune --omit=dev

# Non-root user
RUN useradd --create-home appuser && chown -R appuser /app
USER appuser

EXPOSE 3000

# Use ENTRYPOINT so Railway's custom Start Command cannot bypass db push + seed
COPY entrypoint.sh /app/entrypoint.sh
RUN sed -i 's/\r$//' /app/entrypoint.sh && chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
