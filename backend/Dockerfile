FROM node:20-alpine

WORKDIR /app

# Install deps first (layer cache)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Non-root user
RUN adduser -D appuser && chown -R appuser /app
USER appuser

EXPOSE 3000

CMD ["node", "src/app.js"]
