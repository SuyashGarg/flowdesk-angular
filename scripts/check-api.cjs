const { spawn } = require('node:child_process');
const { once } = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowdesk-api-'));
  const child = spawn(process.execPath, ['mock/server.cjs'], { env: { ...process.env, PORT: '0', MOCK_DATA_FILE: path.join(dir, 'data.json') }, stdio: ['ignore', 'pipe', 'inherit'] });
  try {
    const [chunk] = await once(child.stdout, 'data');
    const base = chunk.toString().trim().replace('Mock API: ', '');
    const call = async (method, url, body, headers = {}) => {
      const response = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...headers }, ...(body ? { body: JSON.stringify(body) } : {}) });
      return { status: response.status, body: await response.json() };
    };
    assert.equal((await call('GET', '/api/requests')).body.length, 4);
    assert.equal((await call('GET', '/api/requests', null, { 'X-Mock-Error': 'true' })).status, 503);
    assert.equal((await call('POST', '/api/requests', {})).status, 422);
    const created = await call('POST', '/api/requests', { title: 'Integration test', category: 'Equipment', amount: 400, description: 'Equipment for the new engineering team.' });
    assert.equal(created.status, 201);
    const url = `/api/requests/${created.body.id}/decision`;
    assert.equal((await call('PATCH', url, { action: 'Approved', role: 'Requester' })).status, 403);
    assert.equal((await call('PATCH', url, { action: 'Rejected', role: 'Approver', note: 'no' })).status, 422);
    assert.equal((await call('PATCH', url, { action: 'Approved', role: 'Approver', note: 'Within budget.' })).status, 200);
    assert.equal((await call('PATCH', url, { action: 'Rejected', role: 'Approver', note: 'Changed my mind.' })).status, 409);
    const persisted = JSON.parse(fs.readFileSync(path.join(dir, 'data.json'), 'utf8'));
    assert.equal(persisted[0].status, 'Approved');
    assert.equal(persisted[0].history.length, 2);
    assert.equal((await call('POST', '/api/reset', {})).body.length, 4);
    console.log('Passed HTTP checks: list, create, validation, role checks, rejection reason, immutable decisions, persistence, reset, simulated outage.');
  } finally {
    child.kill();
    await once(child, 'exit');
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
