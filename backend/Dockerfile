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

# Fix entrypoint line endings and permissions (must be done as root, before USER switch)
RUN sed -i 's/\r$//' entrypoint.sh && chmod +x entrypoint.sh

# Non-root user
RUN useradd --create-home appuser && chown -R appuser /app
USER appuser

EXPOSE 3000

ENTRYPOINT ["/app/entrypoint.sh"]
