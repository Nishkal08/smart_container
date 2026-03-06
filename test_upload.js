const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function test() {
    try {
        const loginRes = await axios.post('http://localhost:3000/api/v1/auth/login', {
            email: 'admin@smartcontainer.dev',
            password: 'Admin123!'
        });
        const token = loginRes.data.data.accessToken;

        const fd = new FormData();
        fd.append('file', fs.createReadStream('c:/smart_container/Historical Data.csv'));

        const uploadRes = await axios.post('http://localhost:3000/api/v1/containers/upload?predict=true', fd, {
            headers: {
                ...fd.getHeaders(),
                Authorization: `Bearer ${token}`
            }
        });
        console.log('UPLOAD SUCCESS:', Object.keys(uploadRes.data.data));
    } catch (err) {
        if (err.response) {
            console.error('ERROR DATA:', err.response.data);
        } else {
            console.error('ERROR:', err.message);
        }
    }
}
test();
