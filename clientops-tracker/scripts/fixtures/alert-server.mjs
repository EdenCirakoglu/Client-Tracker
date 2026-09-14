import http from 'node:http';
let alerts = 0;
http
  .createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/alerts') {
      req.resume();
      req.on('end', () => {
        alerts++;
        res.writeHead(204).end();
      });
    } else if (req.method === 'GET' && req.url === '/count') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ alerts }));
    } else res.writeHead(404).end();
  })
  .listen(8099, '0.0.0.0');
