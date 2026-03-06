async function run() {
    let res = await fetch('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@smartcontainer.dev', password: 'Admin123!' })
    });
    console.log('123!', await res.json());

    res = await fetch('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@smartcontainer.dev', password: 'Admin456#' })
    });
    console.log('456#', await res.json());
}
run();
