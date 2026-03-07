#!/bin/sh
set -e

echo "▶ Running prisma db push..."
npx prisma db push --accept-data-loss

echo "▶ Running seed..."
node prisma/seed.js

echo "▶ Starting app..."
exec node src/app.js
