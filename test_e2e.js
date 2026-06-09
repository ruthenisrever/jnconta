const http = require('http');

async function doRequest(path, method, data, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3005,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', e => reject(e));
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING E2E API TESTS ---');
  try {
    // 1. Login
    console.log('\\n[1] Login with test account...');
    const loginData = JSON.stringify({ email: 'prueba.registro@jnconta.com', password: 'Password123!' });
    const loginRes = await doRequest('/api/auth/login', 'POST', loginData);
    if (loginRes.status !== 201) throw new Error(`Login failed with status ${loginRes.status}: ${loginRes.body}`);
    const token = JSON.parse(loginRes.body).access_token;
    const companyId = JSON.parse(loginRes.body).user.companyId;
    console.log(`✅ Login OK. Token obtained for company ${companyId}`);

    // 2. Test Endpoints
    const endpointsToTest = [
      `/api/clients?companyId=${companyId}`,
      `/api/products?companyId=${companyId}`,
      `/api/accounts?companyId=${companyId}`,
      `/api/journals?companyId=${companyId}`,
      `/api/nomina/employees?companyId=${companyId}`,
      `/api/invoices?companyId=${companyId}`
    ];

    for (let ep of endpointsToTest) {
      console.log(`\\n[*] Testing GET ${ep}...`);
      const res = await doRequest(ep, 'GET', null, token);
      if (res.status >= 200 && res.status < 300) {
        console.log(`✅ OK (Status: ${res.status}) - Returned data length: ${res.body.length} bytes`);
      } else {
        console.log(`❌ ERROR (Status: ${res.status}): ${res.body}`);
      }
    }

    console.log('\\n--- TESTS FINISHED SUCCESSFULLY ---');
  } catch (err) {
    console.error('TEST FAILED:', err.message);
  }
}

runTests();
