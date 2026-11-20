// civicshield/server/db.js
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');
const { parse: parsePhone } = require('./checks/phone');

// Reports store only keyed hashes: one of what was reported, one of who reported it.
const SECRET = process.env.HASH_SECRET || 'dev-only-change-me';
if (!process.env.HASH_SECRET) {
  console.warn('HASH_SECRET is not set. Using a dev secret. Set one before deploying.');
}

// DB_PATH lets tests use an in-memory database and hosts use a mounted volume.
const db = new DatabaseSync(process.env.DB_PATH || path.join(__dirname, 'civicshield.db'));
db.exec('PRAGMA journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    type          TEXT NOT NULL CHECK (type IN ('url','phone','email')),
    target_hash   TEXT NOT NULL,
    reporter_hash TEXT NOT NULL DEFAULT '',
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Upgrade databases created before reporter_hash existed
const cols = db.prepare('PRAGMA table_info(reports)').all().map((c) => c.name);
if (!cols.includes('reporter_hash')) {
  db.exec("ALTER TABLE reports ADD COLUMN reporter_hash TEXT NOT NULL DEFAULT ''");
}

// One report per person per target: drop old duplicates, then enforce it in the database.
db.exec(`
  DELETE FROM reports WHERE id NOT IN (
    SELECT MIN(id) FROM reports GROUP BY type, target_hash, reporter_hash
  );
  CREATE UNIQUE INDEX IF NOT EXISTS uq_reports_once ON reports (type, target_hash, reporter_hash);
  CREATE INDEX IF NOT EXISTS idx_reports_target ON reports (type, target_hash);
`);

function normalize(type, target) {
  let t = String(target).trim().toLowerCase();
  if (type === 'phone') {
    // Same number written differently (0803..., +234803..., 234803...) counts as one target.
    const e164 = parsePhone(t).e164;
    return e164 || t.replace(/[^\d+]/g, '');
  }
  if (type === 'url') return t.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  return t.replace(/\s+/g, ' ');
}

function hashTarget(type, target) {
  return crypto
    .createHmac('sha256', SECRET)
    .update(type + ':' + normalize(type, target))
    .digest('hex');
}

function reporterHash(ip) {
  return crypto.createHmac('sha256', SECRET).update('reporter:' + String(ip)).digest('hex');
}

const insertStmt = db.prepare(
  'INSERT OR IGNORE INTO reports (type, target_hash, reporter_hash) VALUES (?, ?, ?)'
);
const countStmt = db.prepare('SELECT COUNT(*) AS n FROM reports WHERE type = ? AND target_hash = ?');
const totalStmt = db.prepare('SELECT COUNT(*) AS n FROM reports');

// Returns true if this was a new report, false if this person already reported it.
function addReport(type, target, reporter) {
  const info = insertStmt.run(type, hashTarget(type, target), reporterHash(reporter));
  return info.changes === 1;
}

function countReports(type, target) {
  return countStmt.get(type, hashTarget(type, target)).n;
}

function totalReports() {
  return totalStmt.get().n;
}

module.exports = { addReport, countReports, totalReports };