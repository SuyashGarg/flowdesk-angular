// Local development API only: demo roles are not authentication.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const seed = require('./seed.cjs');
const file = process.env.MOCK_DATA_FILE || path.join(__dirname, 'data.json');
let items = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : structuredClone(seed);
const save = next => { fs.writeFileSync(file, JSON.stringify(next, null, 2)); items = next; };
const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const reply = (status, body) => { res.writeHead(status); res.end(JSON.stringify(body)); };
  await new Promise(resolve => setTimeout(resolve, 450));
  // Deterministic failure testing without random broken demos.
  if (req.headers['x-mock-error'] === 'true') return reply(503, { message: 'Simulated API outage. Please try again.' });
  try {
    let raw = '';
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > 16000) return reply(413, { message: 'Request too large.' });
    }
    let body;
    try { body = raw ? JSON.parse(raw) : {}; }
    catch { return reply(400, { message: 'Invalid JSON.' }); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return reply(400, { message: 'Expected an object.' });
    if (req.method === 'GET' && req.url === '/api/requests') return reply(200, items);
    if (req.method === 'POST' && req.url === '/api/reset') {
      save(structuredClone(seed)); return reply(200, items);
    }
    if (req.method === 'POST' && req.url === '/api/requests') {
      const { title, category, amount, description } = body;
      if (typeof title !== 'string' || !title.trim() || title.length > 100 ||
          !['Software', 'Equipment', 'Travel', 'Other'].includes(category) ||
          !Number.isFinite(amount) || amount < 1 || amount > 1000000 ||
          typeof description !== 'string' || description.trim().length < 20 || description.length > 2000) {
        return reply(422, { message: 'Check the title, category, amount and business justification.' });
      }
      const now = new Date().toISOString();
      const item = { id: `REQ-${Math.max(1042, ...items.map(r => Number(r.id.replace('REQ-', '')) || 0)) + 1}`, title: title.trim(), category, amount, description: description.trim(), requester: 'You', createdAt: now.slice(0, 10), status: 'Pending', history: [{ at: now, action: 'Submitted', by: 'You' }] };
      save([item, ...items]); return reply(201, item);
    }
    const match = req.url.match(/^\/api\/requests\/(REQ-\d+)\/decision$/);
    if (req.method === 'PATCH' && match) {
      if (body.role !== 'Approver') return reply(403, { message: 'Switch to Approver to make a decision.' });
      const item = items.find(r => r.id === match[1]);
      if (!item) return reply(404, { message: 'Request not found.' });
      if (item.status !== 'Pending') return reply(409, { message: 'This request already has a final decision. Refresh to see it.' });
      const note = typeof body.note === 'string' ? body.note.trim() : '';
      if (!['Approved', 'Rejected'].includes(body.action) || note.length > 1000 || (body.action === 'Rejected' && note.length < 5)) return reply(422, { message: 'Rejection needs a reason of at least 5 characters.' });
      const updated = { ...item, status: body.action, history: [...item.history, { at: new Date().toISOString(), action: note ? `${body.action}: ${note}` : body.action, by: 'Jordan Blake' }] };
      save(items.map(r => r.id === item.id ? updated : r)); return reply(200, updated);
    }
    reply(404, { message: 'Endpoint not found.' });
  } catch (error) {
    console.error(error.message);
    reply(500, { message: 'The mock API could not save your changes.' });
  }
});
server.listen(Number(process.env.PORT || 3001), '127.0.0.1', () => console.log(`Mock API: http://127.0.0.1:${server.address().port}`));
