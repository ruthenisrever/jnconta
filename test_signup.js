const http = require('http');

const postData = JSON.stringify({
  name: 'Prueba Usuario',
  email: 'prueba.registro@jnconta.com',
  password: 'Password123!',
  companyName: 'Prueba Empresa S.A. de C.V.',
  rfc: 'XAXX010101000'
});

const options = {
  hostname: 'localhost',
  port: 3005,
  path: '/api/auth/signup',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('RESPONSE:', data);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(postData);
req.end();
