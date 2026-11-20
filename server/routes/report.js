// civicshield/server/routes/report.js
const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../db');

const TYPES = ['url', 'phone', 'email'];
const router = express.Router();

router.use(
  rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Report limit reached. Please try again later.' }
  })
);

router.post('/', (req, res, next) => {
  const { type, value } = req.body || {};
  if (typeof type !== 'string' || !TYPES.includes(type)) {
    return res.status(400).json({ error: 'type must be url, phone or email.' });
  }
  if (typeof value !== 'string' || !value.trim() || value.length > 2000) {
    return res.status(400).json({ error: 'value must be 1 to 2000 characters.' });
  }
  try {
    const v = value.trim();
    const isNew = db.addReport(type, v, req.ip); // stores only keyed hashes
    res.status(isNew ? 201 : 200).json({
      ok: true,
      already: !isNew,
      reports: db.countReports(type, v)
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;