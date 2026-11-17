const assert = require('node:assert/strict');
const handler = require('../api/index.js');
process.env.DEMO_COOKIE_SECRET = 'integration-test-secret-only';
async function call(method, url, body, cookie = '') {
  const headers = {};
  let status = 200;
  let content;
  const req = { method, url, body, headers: { cookie } };
  const res = {
    setHeader: (key, value) => headers[key.toLowerCase()] = value,
    writeHead: value => status = value,
    set statusCode(value) { status = value; },
    end: value => content = JSON.parse(value),
  };
  await handler(req, res);
  return { status, body: content, cookie: headers['set-cookie']?.split(';')[0], headers };
}
(async () => {
  assert.equal((await call('GET', '/api/requests', {})).body.length, 4);
  const created = await call('POST', '/api/requests', { title: 'Reviewer walkthrough', category: 'Software', amount: 250, description: 'A sample request for reviewing the complete approval flow.' });
  assert.equal(created.status, 201);
  assert.ok(created.cookie);
  // A fresh invocation reads state from the cookie, never instance memory.
  assert.equal((await call('GET', '/api/requests', {}, created.cookie)).body.length, 5);
  assert.equal((await call('GET', '/api/requests', {})).body.length, 4, 'Visitors have isolated workspaces');
  const decided = await call('PATCH', `/api/requests/${created.body.id}/decision`, { role: 'Approver', action: 'Approved', note: 'Approved for demo.' }, created.cookie);
  assert.equal(decided.status, 200);
  const reloaded = await call('GET', '/api/requests', {}, decided.cookie);
  assert.equal(reloaded.body[0].status, 'Approved');
  assert.equal(reloaded.headers['cache-control'], 'no-store');
  assert.equal((await call('POST', '/api/reset', {}, decided.cookie)).body.length, 4);
  assert.equal((await call('GET', '/api/requests', {}, created.cookie + 'tampered')).body.length, 4);
  assert.equal((await call('POST', '/api/requests', {})).status, 422);
  delete process.env.DEMO_COOKIE_SECRET;
  assert.equal((await call('GET', '/api/requests', {})).status, 503);
  console.log('Passed Vercel handler checks: JSON, parsed bodies, create, approve, cold-start persistence, visitor isolation, reset, tamper recovery, validation, missing configuration.');
})().catch(error => { console.error(error); process.exitCode = 1; });
