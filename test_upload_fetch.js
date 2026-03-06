const fs = require('fs');

async function test() {
    try {
        const loginData = await fetch('http://localhost:3000/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@smartcontainer.dev', password: 'Admin123!' })
        }).then(res => res.json());

        const token = loginData.data.accessToken;

        const fd = new FormData();
        const fileBlob = new Blob([fs.readFileSync('c:/smart_container/Historical Data.csv')], { type: 'text/csv' });
        fd.append('file', fileBlob, 'Historical Data.csv');

        console.log('UPLOADING...');
        const uploadRes = await fetch('http://localhost:3000/api/v1/containers/upload?predict=true', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: fd
        });

        const text = await uploadRes.text();
        console.log('STATUS:', uploadRes.status);
        console.log('UPLOAD SUCCESS:', text);
    } catch (err) {
        console.error('ERROR:', err);
    }
}
test();
