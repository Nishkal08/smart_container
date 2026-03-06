const prisma = require('./src/config/db');
const bcrypt = require('bcryptjs');

async function fix() {
    const hash = await bcrypt.hash('Admin123!', 12);
    await prisma.user.update({
        where: { email: 'admin@smartcontainer.dev' },
        data: { password_hash: hash }
    });
    console.log('Password reset successfully to Admin123!');
}
fix().finally(() => prisma.$disconnect());
