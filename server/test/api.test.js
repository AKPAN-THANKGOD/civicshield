// civicshield/server/test/api.test.js
process.env.DB_PATH = ':memory:';
process.env.HASH_SECRET = 'test-secret';

const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../server');

let server;
let base;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => {
  if (server.closeAllConnections) server.closeAllConnections();
  server.close();
});

const post = (path, body) =>
  fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  });

const find = (result, label) => result.checks.find((c) => c.l === label);

// ---------- health and security ----------

test('health endpoint responds', async () => {
  const r = await fetch(base + '/api/health');
  assert.equal(r.status, 200);
  const d = await r.json();
  assert.equal(d.ok, true);
});

test('pages are served with a content security policy and no x-powered-by', async () => {
  const r = await fetch(base + '/');
  assert.equal(r.status, 200);
  assert.ok(r.headers.get('content-security-policy'));
  assert.equal(r.headers.get('x-powered-by'), null);
});

test('server source and package files are NOT downloadable', async () => {
  for (const p of ['/server/db.js', '/server/server.js', '/server/package.json', '/.gitignore']) {
    const r = await fetch(base + p);
    assert.equal(r.status, 404, p + ' should be 404');
  }
});

// ---------- scan: validation ----------

test('scan rejects an unknown type', async () => {
  const r = await post('/api/scan', { type: 'banana', value: 'x' });
  assert.equal(r.status, 400);
});

test('scan rejects an empty value', async () => {
  const r = await post('/api/scan', { type: 'url', value: '   ' });
  assert.equal(r.status, 400);
});

test('scan rejects a value that is too long', async () => {
  const r = await post('/api/scan', { type: 'email', value: 'a'.repeat(2001) });
  assert.equal(r.status, 400);
});

test('scan rejects javascript: links with a friendly message', async () => {
  const r = await post('/api/scan', { type: 'url', value: 'javascript:alert(1)' });
  assert.equal(r.status, 400);
  const d = await r.json();
  assert.match(d.error, /web links/i);
});

test('invalid JSON gets a 400, not a crash', async () => {
  const r = await post('/api/scan', '{bad json');
  assert.equal(r.status, 400);
});

// ---------- scan: results ----------

test('look-alike phishing link scores as dangerous', { timeout: 30000 }, async () => {
  const r = await post('/api/scan', { type: 'url', value: 'http://paypa1-login-verify.top/update' });
  assert.equal(r.status, 200);
  const d = await r.json();
  assert.equal(d.level, 'bad');
  assert.ok(d.score < 40);
  assert.equal(find(d, 'Look-alike spelling').bad, true);
  assert.equal(find(d, 'Web suffix').bad, true);
});

test('a well-known site is not flagged by the pattern checks', { timeout: 30000 }, async () => {
  const r = await post('/api/scan', { type: 'url', value: 'https://www.wikipedia.org' });
  const d = await r.json();
  assert.equal(find(d, 'Look-alike spelling').bad, false);
  assert.equal(find(d, 'Secure connection (https)').bad, false);
  assert.ok(d.score >= 70);
});

test('premium-rate phone number is flagged', async () => {
  const r = await post('/api/scan', { type: 'phone', value: '+1 900 555 0142' });
  const d = await r.json();
  assert.equal(find(d, 'Not premium-rate').bad, true);
});

test('pushy email asking for a password is flagged', async () => {
  const r = await post('/api/scan', {
    type: 'email',
    value: 'URGENT: your account is suspended. Send your password within 24 hours.'
  });
  const d = await r.json();
  assert.equal(find(d, 'No pressure to hurry').bad, true);
  assert.equal(find(d, 'No request for secrets').bad, true);
});

// ---------- report ----------

test('report validates its input', async () => {
  assert.equal((await post('/api/report', { type: 'nope', value: 'x' })).status, 400);
  assert.equal((await post('/api/report', { type: 'phone', value: '' })).status, 400);
});

test('the same person cannot report the same thing twice', async () => {
  const body = { type: 'phone', value: '+1 555 010 0199' };

  const first = await post('/api/report', body);
  assert.equal(first.status, 201);
  assert.equal((await first.json()).reports, 1);

  const second = await post('/api/report', body);
  assert.equal(second.status, 200);
  const d = await second.json();
  assert.equal(d.already, true);
  assert.equal(d.reports, 1);
});

test('a scan shows the report count for the same target', async () => {
  const r = await post('/api/scan', { type: 'phone', value: '+1 555 010 0199' });
  const d = await r.json();
  assert.equal(d.reports, 1);
});