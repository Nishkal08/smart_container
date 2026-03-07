FROM node:20-alpine

# curl + openssl required by healthcheck and Prisma query engine
RUN apk add --no-cache curl openssl openssl-dev

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
RUN adduser -D appuser && chown -R appuser /app
USER appuser

EXPOSE 3000

# Run migrations then start the app
CMD ["sh", "-c", "npx prisma migrate deploy && node src/app.js"]
