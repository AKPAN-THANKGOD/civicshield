// civicshield/server/server.js
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, '..'); // the front-end folder (civicshield/)

app.disable('x-powered-by');

// Behind a proxy (Render, Fly, nginx), set TRUST_PROXY=1 so req.ip is the visitor, not the proxy.
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
}

// Security headers. The CSP allows only our own scripts plus Google Fonts.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ['https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: null // keeps http://localhost working
      }
    }
  })
);

app.use(express.json({ limit: '10kb' }));

// Rate limit every API call (stricter limits are set per route).
app.use(
  '/api',
  rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please wait a minute and try again.' }
  })
);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, reports: db.totalReports() });
});

app.use('/api/scan', require('./routes/scan'));
app.use('/api/report', require('./routes/report'));

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Serve ONLY the public front-end folders, so server/ (code and database) is never exposed.
['css', 'js', 'data', 'assets'].forEach((dir) => {
  app.use('/' + dir, express.static(path.join(ROOT, dir)));
});
const pages = {
  '/': 'index.html',
  '/index.html': 'index.html',
  '/checker.html': 'checker.html',
  '/database.html': 'database.html',
  '/guide.html': 'guide.html'
};
Object.entries(pages).forEach(([url, file]) => {
  app.get(url, (req, res) => res.sendFile(path.join(ROOT, file)));
});

// Error handler
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

// Only start listening when run directly, so tests can import the app.
if (require.main === module) {
  app.listen(PORT, () => console.log(`CivicShield running at http://localhost:${PORT}`));
}

module.exports = app;