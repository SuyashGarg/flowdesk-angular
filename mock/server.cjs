// Local development API only: demo roles are not authentication.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const seed = require('./seed.cjs');
const file = process.env.MOCK_DATA_FILE || path.join(__dirname, 'data.json');
let items = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : structuredClone(seed);
const save = next => { fs.writeFileSync(file, JSON.stringify(next, null, 2)); items = next; };
const createHandler = require('./api-handler.cjs');
const server = http.createServer(createHandler({ load: () => items, save }));
server.listen(Number(process.env.PORT || 3001), '127.0.0.1', () => console.log(`Mock API: http://127.0.0.1:${server.address().port}`));
