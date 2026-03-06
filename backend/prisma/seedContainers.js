/**
 * Seed containers from the provided CSV files.
 * Run: node prisma/seedContainers.js
 *
 * This imports the historical data CSV and bulk-inserts containers.
 * It then queues a batch prediction job so every container gets a risk score.
 */
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const { parseCSVFile } = require('../src/utils/csv.parser');

const prisma = new PrismaClient();

const CSV_PATH = path.resolve(__dirname, '../../Historical Data.csv');

async function main() {
  // Validate CSV exists before attempting to parse
  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(
      `Historical Data.csv not found at: ${CSV_PATH}\n` +
      `Place the CSV file in the project root (c:\\smart_container\\) and retry.`
    );
  }

  console.log('📂 Parsing Historical Data.csv...');

  const { containers, errors, skipped } = await parseCSVFile(CSV_PATH);

  console.log(`✅ Parsed: ${containers.length} valid rows, ${skipped} skipped`);

  // Find or create the seed user
  let seedUser = await prisma.user.findUnique({ where: { email: 'admin@smartcontainer.dev' } });
  if (!seedUser) {
    throw new Error('Run `node prisma/seed.js` first to create the admin user.');
  }

  console.log('💾 Inserting containers into database (batch upsert)...');

  let created = 0;
  let updated = 0;
  const BATCH_SIZE = 100;

  for (let i = 0; i < containers.length; i += BATCH_SIZE) {
    const batch = containers.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (row) => {
        try {
          const exists = await prisma.container.findUnique({ where: { container_id: row.container_id } });
          if (exists) {
            await prisma.container.update({ where: { container_id: row.container_id }, data: { ...row, source: 'SEED', uploaded_by: seedUser.id } });
            updated++;
          } else {
            await prisma.container.create({ data: { ...row, source: 'SEED', uploaded_by: seedUser.id } });
            created++;
          }
        } catch (err) {
          console.warn(`   ⚠️  Skipped row (${row.container_id}): ${err.message}`);
        }
      })
    );

    if ((i + BATCH_SIZE) % 500 === 0 || i + BATCH_SIZE >= containers.length) {
      console.log(`   Progress: ${Math.min(i + BATCH_SIZE, containers.length)}/${containers.length}`);
    }
  }

  console.log(`\n✅ Done! Created: ${created}, Updated: ${updated}`);
  console.log('\n💡 Tip: Now run a batch prediction to score all containers:');
  console.log('   POST /api/v1/predictions/batch with all container IDs');
  console.log('   Or use the dashboard upload → analyze all button\n');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
