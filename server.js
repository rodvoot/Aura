const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const generate = require('./api/generate.js');
const port = Number(process.env.PORT || 3000);
const root = __dirname;
const server = http.createServer(async (req, res) => {
  if (req.url === '/api/generate') {
    let raw = '';
    try {
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 4_000_000) { res.writeHead(413, {'Content-Type':'application/json'}); res.end(JSON.stringify({error:'Request too large.'})); return; }
      }
      if (raw) req.body = JSON.parse(raw);
    } catch (_) { res.writeHead(400, {'Content-Type':'application/json'}); res.end(JSON.stringify({error:'Invalid JSON request.'})); return; }
    return generate(req, {setHeader:(k,v)=>res.setHeader(k,v),status(code){res.statusCode=code;return this;},json(data){res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));}});
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end('Method not allowed'); return; }
  if (req.url !== '/' && req.url !== '/index.html') { res.writeHead(404); res.end('Not found'); return; }
  res.writeHead(200, {'Content-Type':'text/html; charset=utf-8','X-Content-Type-Options':'nosniff'});
  fs.createReadStream(path.join(root,'index.html')).pipe(res);
});
server.listen(port, () => console.log(`Aura Studio running at http://localhost:${port}`));
