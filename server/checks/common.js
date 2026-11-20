// civicshield/server/checks/common.js
// Shared helper: turns a list of checks into a score and a clean result.

function check(l, bad, pen, m) {
  return { l, bad: !!bad, pen, m };
}

function build(checks) {
  let score = 94;
  for (const c of checks) if (c.bad) score -= c.pen || 0;
  score = Math.max(4, Math.min(98, score));
  const level = score >= 70 ? 'safe' : score >= 40 ? 'warn' : 'bad';
  return {
    score,
    level,
    checks: checks.map((c) => ({ l: c.l, bad: !!c.bad, m: c.m || '', unknown: !!c.unknown }))
  };
}

// An error whose message is safe to show to the user (becomes a 400).
function userError(message) {
  const e = new Error(message);
  e.expose = true;
  return e;
}

module.exports = { check, build, userError };