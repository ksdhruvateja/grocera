#!/usr/bin/env node

/**
 * Automated permission and role checks for RB's Grocery backend
 *
 * What it verifies:
 * 1) Health endpoint responds
 * 2) Admin and Co-Admin logins return tokens
 * 3) Customer registration returns token
 * 4) Product exists or gets created (admin)
 * 5) Customer can create direct order (201)
 * 6) Payments: co-admin denied (403) for OTC/EBT; admin succeeds (200)
 * 7) Messages: public create; visible to admin and co-admin; status update works
 * 8) (Optional) WebSocket 'orderCreated' received by admin/co-admin if socket.io-client available
 *
 * Writes summary to test-results.txt
 */

/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { spawn } = require('child_process');

const START_LOCAL = (process.env.START_LOCAL_SERVER || 'true').toLowerCase() !== 'false';
const LOCAL_PORT = process.env.TEST_PORT || '5015';
const BASE_URL = process.env.TEST_BASE_URL || `http://localhost:${LOCAL_PORT}`;
const API = `${BASE_URL}/api`;
const RESULTS_FILE = path.join(__dirname, 'test-results.txt');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = (msg, color = 'reset') => console.log(`${colors[color]}${msg}${colors.reset}`);
const writeResult = (line) => {
  fs.appendFileSync(RESULTS_FILE, `${line}\n`);
};

function request(method, url, token, body) {
  return new Promise((resolve) => {
    try {
      const isHttps = url.startsWith('https://');
      const mod = isHttps ? https : http;
      const u = new URL(url);

      const payload = body ? JSON.stringify(body) : undefined;
      const options = {
        hostname: u.hostname,
        port: u.port || (isHttps ? 443 : 80),
        path: u.pathname + (u.search || ''),
        method,
        headers: {
          'Content-Type': 'application/json',
        }
      };
      if (token) options.headers.Authorization = `Bearer ${token}`;
      if (payload) options.headers['Content-Length'] = Buffer.byteLength(payload);

      const req = mod.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let json;
          try { json = data ? JSON.parse(data) : {}; } catch { json = { raw: data }; }
          resolve({ status: res.statusCode, data: json });
        });
      });
      req.on('error', (err) => resolve({ status: 0, data: { error: err.message } }));
      if (payload) req.write(payload);
      req.end();
    } catch (err) {
      resolve({ status: 0, data: { error: err.message } });
    }
  });
}

async function main() {
  // fresh results file
  try { fs.unlinkSync(RESULTS_FILE); } catch {}
  writeResult(`# Test run @ ${new Date().toISOString()}`);

  // Optionally start a local server and capture logs
  let serverProc = null;
  let serverLogs = '';
  if (START_LOCAL) {
    const env = { ...process.env, NODE_ENV: 'development', PORT: String(LOCAL_PORT) };
    serverProc = spawn(process.execPath, ['server.js'], { cwd: __dirname, env });
    serverProc.stdout.on('data', (d) => { const s = d.toString(); serverLogs += s; process.stdout.write(s); });
    serverProc.stderr.on('data', (d) => { const s = d.toString(); serverLogs += s; process.stderr.write(s); });
    // Wait for readiness
    const start = Date.now();
    let ready = false;
    while (Date.now() - start < 15000) {
      const health = await request('GET', `${BASE_URL}/api/health`);
      if (health.status === 200) { ready = true; break; }
      await new Promise(r => setTimeout(r, 400));
    }
    if (!ready) {
      writeResult('FATAL: server did not become healthy in time');
      try { serverProc.kill('SIGINT'); } catch {}
      return;
    }
  }

  let adminToken = '';
  let coAdminToken = '';
  let customerToken = '';
  let productId = '';
  let orderId = '';
  let messageId = '';

  const section = (title) => {
    log(`\n== ${title} ==`, 'cyan');
    writeResult(`\n== ${title} ==`);
  };
  const ok = (msg) => { log(`✔ ${msg}`, 'green'); writeResult(`OK: ${msg}`); };
  const fail = (msg) => { log(`✖ ${msg}`, 'red'); writeResult(`FAIL: ${msg}`); };
  const info = (msg) => { log(`• ${msg}`, 'blue'); writeResult(`INFO: ${msg}`); };

  // 1) Health
  section('Health');
  const health = await request('GET', `${API}/health`);
  if (health.status === 200) ok('Health endpoint responded');
  else return fail(`Health check failed (status ${health.status})`);

  // 2) Admin and Co-Admin login
  section('Login');
  const adminLogin = await request('POST', `${API}/auth/login`, null, {
    email: 'admin@rbsgrocery.com',
    password: 'admin123'
  });
  if (adminLogin.status === 200 && adminLogin.data?.token) {
    adminToken = adminLogin.data.token;
    ok('Admin login success');
  } else {
    fail(`Admin login failed (status ${adminLogin.status})`);
  }

  const coLogin = await request('POST', `${API}/auth/login`, null, {
    email: 'coadmin@rbsgrocery.com',
    password: 'coadmin2024'
  });
  if (coLogin.status === 200 && coLogin.data?.token) {
    coAdminToken = coLogin.data.token;
    ok('Co-Admin login success');
  } else {
    fail(`Co-Admin login failed (status ${coLogin.status})`);
  }

  // 3) Customer registration
  section('Customer Registration');
  const uniqueEmail = `tester+${Date.now()}@example.com`;
  const custReg = await request('POST', `${API}/auth/register`, null, {
    firstName: 'Test',
    lastName: 'User',
    email: uniqueEmail,
    password: 'testpass1'
  });
  if (custReg.status === 201 && custReg.data?.token) {
    customerToken = custReg.data.token;
    ok('Customer registration success');
  } else {
    return fail(`Customer registration failed (status ${custReg.status})`);
  }

  // 4) Ensure a product exists (or create one via admin)
  section('Product Ensure');
  const listProducts = await request('GET', `${API}/products`);
  const products = listProducts.data?.data || [];
  if (products.length > 0) {
    productId = products[0]._id || products[0].id;
    ok(`Found product ${productId}`);
  } else {
    info('No products found, attempting to create one as admin');
    const create = await request('POST', `${API}/products`, adminToken, {
      name: `Test Product ${Date.now()}`,
      description: 'Automated test product',
      price: 4.99,
      category: 'Daily Essentials',
      stockQuantity: 10,
      image: '/images/default-product.jpg'
    });
    if (create.status === 201 && create.data?.data?._id) {
      productId = create.data.data._id;
      ok(`Product created ${productId}`);
    } else {
      return fail(`Unable to create product (status ${create.status})`);
    }
  }

  // 5) Create an order as customer (also used for payments checks)
  section('Create Order');
  const orderPayload = {
    items: [
      { product: productId, quantity: 1, price: 1.99, displayName: 'Test Item' }
    ],
    shippingAddress: {
      firstName: 'Test', lastName: 'User',
      street: '123 Test St', city: 'NYC', zipCode: '10001', state: 'NY',
      country: 'United States', phone: '+1234567890', email: uniqueEmail
    },
    customerInfo: { email: uniqueEmail, firstName: 'Test', lastName: 'User', phone: '+1234567890' },
    paymentMethod: 'stripe'
  };
  const createOrder = await request('POST', `${API}/orders/create-direct`, customerToken, orderPayload);
  if (createOrder.status === 201 && (createOrder.data?._id || createOrder.data?.data?._id)) {
    orderId = createOrder.data?._id || createOrder.data?.data?._id;
    ok(`Order created ${orderId}`);
  } else {
    return fail(`Order creation failed (status ${createOrder.status})`);
  }

  // 6) Payments access checks (co-admin denied; admin allowed)
  section('Payments Authorization');
  const otcBody = {
    orderId,
    cards: [{ name: 'Test', cardNumber: '1111', amount: 1 }],
    totals: { total: 1 }
  };
  const ebtBody = {
    orderId,
    cards: [{ name: 'EBT Card', cardNumber: '2222', amount: 1 }],
    totals: { total: 1 }
  };

  const coOtc = await request('POST', `${API}/payments/process-otc`, coAdminToken, otcBody);
  if (coOtc.status === 403) ok('Co-Admin denied OTC as expected'); else fail(`Co-Admin OTC expected 403, got ${coOtc.status}`);
  const coEbt = await request('POST', `${API}/payments/process-ebt`, coAdminToken, ebtBody);
  if (coEbt.status === 403) ok('Co-Admin denied EBT as expected'); else fail(`Co-Admin EBT expected 403, got ${coEbt.status}`);

  const adminOtc = await request('POST', `${API}/payments/process-otc`, adminToken, otcBody);
  if (adminOtc.status === 200) ok('Admin OTC processed'); else fail(`Admin OTC expected 200, got ${adminOtc.status}`);
  const adminEbt = await request('POST', `${API}/payments/process-ebt`, adminToken, ebtBody);
  if (adminEbt.status === 200) ok('Admin EBT processed'); else fail(`Admin EBT expected 200, got ${adminEbt.status}`);

  // 7) Messages flow
  section('Messages Visibility');
  const pubMsg = await request('POST', `${API}/admin/messages`, null, {
    firstName: 'Test', lastName: 'User', email: uniqueEmail,
    subject: `Test Subject ${Date.now()}`, message: 'Hello from test', inquiryType: 'general'
  });
  if (pubMsg.status === 200 && pubMsg.data?.data?._id) {
    messageId = pubMsg.data.data._id;
    ok(`Public message created ${messageId}`);
  } else {
    return fail(`Public message creation failed (status ${pubMsg.status})`);
  }

  const coList = await request('GET', `${API}/co-admin/messages`, coAdminToken);
  if (coList.status === 200) ok('Co-Admin can list messages'); else fail(`Co-Admin list messages expected 200, got ${coList.status}`);
  const adList = await request('GET', `${API}/admin/messages`, adminToken);
  if (adList.status === 200) ok('Admin can list messages'); else fail(`Admin list messages expected 200, got ${adList.status}`);

  const coUpdate = await request('PATCH', `${API}/co-admin/messages/${messageId}/status`, coAdminToken, { status: 'read' });
  if (coUpdate.status === 200) ok('Co-Admin updated message status'); else fail(`Co-Admin update message expected 200, got ${coUpdate.status}`);

  // 8) Optional WebSocket test (if socket.io-client is available)
  section('WebSocket (optional)');
  let wsSupported = true;
  let adminReceived = false;
  let coAdminReceived = false;
  let ioClient;
  try {
    ioClient = require('socket.io-client');
  } catch (_) {
    wsSupported = false;
    info('socket.io-client not installed, skipping WS test');
  }

  if (wsSupported) {
    await new Promise(async (resolve) => {
      const adminSocket = ioClient(BASE_URL, { auth: { token: adminToken }, transports: ['websocket', 'polling'] });
      const coSocket = ioClient(BASE_URL, { auth: { token: coAdminToken }, transports: ['websocket', 'polling'] });

      const cleanup = () => { try { adminSocket.close(); } catch {}; try { coSocket.close(); } catch {}; };

      adminSocket.on('connect', () => {});
      coSocket.on('connect', () => {});

      adminSocket.on('orderCreated', () => { adminReceived = true; });
      coSocket.on('orderCreated', () => { coAdminReceived = true; });

      // Trigger another order to emit event
      setTimeout(async () => {
        await request('POST', `${API}/orders/create-direct`, customerToken, orderPayload);
      }, 300);

      setTimeout(() => { cleanup(); resolve(); }, 2000);
    });

    if (adminReceived) ok('Admin received orderCreated'); else info('Admin did not receive orderCreated');
    if (coAdminReceived) ok('Co-Admin received orderCreated'); else info('Co-Admin did not receive orderCreated');
  }

  writeResult('\nAll checks completed.');
  if (serverProc) {
    try { serverProc.kill('SIGINT'); } catch {}
    writeResult('\n--- Captured Server Logs (tail) ---');
    const tail = serverLogs.split(/\r?\n/).slice(-200).join('\n');
    writeResult(tail);
  }
  log('\nDone. See test-results.txt for details.', 'cyan');
}

main().catch((e) => {
  writeResult(`\nFATAL: ${e.message}`);
  console.error(e);
  process.exit(1);
});
