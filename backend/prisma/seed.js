require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Create admin user ────────────────────────────────────────────────────────
  const adminEmail = 'admin@smartcontainer.dev';
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existing) {
    const password_hash = await bcrypt.hash('Admin123!', 12);
    await prisma.user.create({
      data: {
        name: 'System Admin',
        email: adminEmail,
        password_hash,
        role: 'ADMIN',
      },
    });
    console.log(`✅ Admin user created: ${adminEmail} / Admin123!`);
  } else {
    console.log(`ℹ️  Admin user already exists: ${adminEmail}`);
  }

  // ── Seed analyst user ────────────────────────────────────────────────────────
  const analystEmail = 'analyst@smartcontainer.dev';
  const existingAnalyst = await prisma.user.findUnique({ where: { email: analystEmail } });

  if (!existingAnalyst) {
    const password_hash = await bcrypt.hash('Analyst123!', 12);
    await prisma.user.create({
      data: {
        name: 'Port Analyst',
        email: analystEmail,
        password_hash,
        role: 'ANALYST',
      },
    });
    console.log(`✅ Analyst user created: ${analystEmail} / Analyst123!`);
  }

  console.log('\n📦 To seed container data from CSV, run:');
  console.log('   node prisma/seedContainers.js');
  console.log('\n🌱 Seed complete!\n');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
