const prisma = require('./src/config/db');
const bcrypt = require('bcryptjs');

async function check() {
    const user = await prisma.user.findFirst({ where: { email: 'admin@smartcontainer.dev' } });
    if (user) {
        const isOldValid = await bcrypt.compare('Admin123!', user.password_hash);
        const isNewValid = await bcrypt.compare('Admin456#', user.password_hash);
        console.log('Old valid:', isOldValid, 'New valid:', isNewValid);
    }
}
check().finally(() => prisma.$disconnect());
