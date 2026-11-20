// civicshield/server/routes/scan.js
const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const checkUrl = require('../checks/url');
const checkPhone = require('../checks/phone');
const checkEmail = require('../checks/email');

const CHECKERS = { url: checkUrl, phone: checkPhone, email: checkEmail };
const router = express.Router();

// Scans do network lookups, so they get a tighter limit than the rest of the API.
router.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many scans. Please wait a minute and try again.' }
  })
);

router.post('/', async (req, res, next) => {
  const { type, value } = req.body || {};
  if (typeof type !== 'string' || !Object.prototype.hasOwnProperty.call(CHECKERS, type)) {
    return res.status(400).json({ error: 'type must be url, phone or email.' });
  }
  if (typeof value !== 'string' || !value.trim() || value.length > 2000) {
    return res.status(400).json({ error: 'value must be 1 to 2000 characters.' });
  }
  try {
    const v = value.trim();
    const result = await CHECKERS[type](v);
    res.json({ type, ...result, reports: db.countReports(type, v) }); // nothing is stored here
  } catch (e) {
    if (e.expose) return res.status(400).json({ error: e.message });
    next(e);
  }
});

module.exports = router;