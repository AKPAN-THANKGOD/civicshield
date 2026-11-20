<!-- civicshield/README.md -->
# CivicShield: Universal Digital Safety Checker

Node + Express + SQLite backend serving a vanilla HTML/CSS/JS front end.

```
civicshield/
├── index.html, checker.html, database.html, guide.html
├── css/        styles.css, pages.css
├── js/         common.js, analyzer.js (offline fallback), checker.js, database.js, guide.js
├── data/       scams.js (educational scam-pattern library)
├── assets/     favicon.svg
├── server/
│   ├── package.json, server.js, db.js
│   ├── routes/ scan.js, report.js
│   ├── checks/ common.js, url.js, phone.js, email.js
│   └── test/   api.test.js
├── .github/workflows/test.yml
├── Dockerfile, .dockerignore, .gitignore
└── README.md
```

## Run locally

```
cd server
npm install
# PowerShell:  $env:HASH_SECRET="a-long-random-string"; npm start
# macOS/Linux: HASH_SECRET=a-long-random-string npm start
```

Open http://localhost:3000 (the API does not work if you open the HTML files directly).

## Test

```
cd server
npm test
```

## Environment variables

| Variable | Purpose |
| --- | --- |
| `HASH_SECRET` | Required in production. Key for hashing reports and reporters. |
| `TRUST_PROXY` | Set to `1` behind a proxy (Render, Fly, nginx) so `req.ip` is the visitor. |
| `DB_PATH` | SQLite file location. Use a mounted volume to keep reports across restarts. |
| `GOOGLE_SAFE_BROWSING_KEY` | Optional. Enables the Google unsafe-sites check. |
| `PORT` | Defaults to 3000. |

## Deploy (Render)

- Build command: `cd server && npm install`
- Start command: `cd server && npm start`
- Health check path: `/api/health`
- Environment: `HASH_SECRET`, `TRUST_PROXY=1`, `NODE_VERSION=22`

Free hosting note: the first load after idle can take about a minute, and the local database is
reset on restart, so report counts do not persist. Scans store nothing and are unaffected.
A host with a persistent volume (see `Dockerfile`) keeps reports.

## Security notes

- The server never connects to submitted sites (no SSRF). It only parses text and queries DNS and RDAP.
- Scans are not stored. Reports are stored only as keyed hashes (target and reporter).
- Rate limits apply to every API route, with stricter limits on scan and report.
- Only `css`, `js`, `data`, `assets` and the HTML pages are served. `server/` is never exposed.
- Scoring is heuristic and is guidance, not a guarantee.