const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');

const port = process.env.PORT || 3000;
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const httpsOptions = {
  key: fs.readFileSync('./localhost+2-key.pem', 'utf-8'),
  cert: fs.readFileSync('./localhost+2.pem', 'utf-8')
};

app.prepare().then(() => {
  createServer(httpsOptions, (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, err => {
    if (err) throw err;
    console.log(`> Ready on https://localhost:${port}`);
  });
});
