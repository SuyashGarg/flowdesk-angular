// Isolated, cookie-backed mock workspaces survive serverless cold starts.
// This is a fictional demo, not authentication or a production database.
const { deflateSync, inflateSync } = require('node:zlib');
const { createHmac, timingSafeEqual } = require('node:crypto');
const seed = require('../mock/seed.cjs');
const createHandler = require('../mock/api-handler.cjs');
const COOKIE = 'flowdesk-demo-v1';

module.exports = async function handler(req, res) {
  const secret = process.env.DEMO_COOKIE_SECRET;
  if (!secret) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ message: 'Demo API configuration is incomplete.' }));
    return;
  }
  const sign = data => createHmac('sha256', secret).update(data).digest('base64url');
  let items = structuredClone(seed);
  const cookie = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE + '='));
  if (cookie) {
    try {
      const value = cookie.slice(COOKIE.length + 1);
      if (value.length > 3800) throw Error('Invalid cookie');
      const [data, signature] = value.split('.');
      const expected = Buffer.from(sign(data));
      const actual = Buffer.from(signature || '');
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw Error('Invalid signature');
      const parsed = JSON.parse(inflateSync(Buffer.from(data, 'base64url'), { maxOutputLength: 150000 }).toString('utf8'));
      if (!Array.isArray(parsed) || parsed.length > 100) throw Error('Invalid workspace');
      items = parsed;
    } catch { /* A corrupt, stale or edited cookie gets a fresh demo. */ }
  }
  // Rewrites preserve the original request path on Vercel.
  return createHandler({
    load: () => items,
    save: next => {
      const data = deflateSync(Buffer.from(JSON.stringify(next))).toString('base64url');
      const value = `${data}.${sign(data)}`;
      if (value.length > 3800 || next.length > 100) {
        const error = new Error('This demo workspace is full. Reset demo data to start a new walkthrough.');
        error.status = 422;
        throw error;
      }
      res.setHeader('Set-Cookie', `${COOKIE}=${value}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`);
      items = next;
    },
  })(req, res);
};
