const jwt = require('jsonwebtoken');
require('dotenv').config({ path: 'C:\\smart_container\\backend\\.env' });

const token = jwt.sign(
    { userId: 'test-admin', role: 'ADMIN' },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
);
console.log(token);
