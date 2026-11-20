// civicshield/server/checks/email.js
// Message checks. Links found in the text are run through the real link checker.
const { check, build } = require('./common');
const checkUrl = require('./url');

async function checkEmail(raw) {
  const low = raw.toLowerCase();
  const links = (raw.match(/https?:\/\/[^\s<>"')]+/gi) || []).slice(0, 3);

  const results = await Promise.all(links.map((l) => checkUrl(l).catch(() => null)));
  const worst = results.filter(Boolean).reduce((m, r) => Math.min(m, r.score), 100);

  const checks = [
    check('No pressure to hurry', /urgent|immediately|within 24|act now|suspended|final notice/.test(low), 25, 'It pushes you to act fast.'),
    check('No request for secrets', /password|pin\b|otp|one[- ]time code|ssn|card number|bvn/.test(low), 30, 'It asks for private information.'),
    check('No odd payment method', /gift card|wire transfer|bitcoin|crypto|western union/.test(low), 30, 'It asks for payment that is hard to trace.'),
    check('No “click here”', /click (here|below)|https?:\/\/|www\./.test(low), 15, 'It tells you to click a link.'),
    check('No surprise prizes', /prize|lottery|winner|inheritance|million/.test(low), 30, 'It promises money you didn’t ask for.'),
    check('Personal greeting', /dear (customer|user|sir|beneficiary)/.test(low), 12, 'It doesn’t use your real name.'),
    check('Links inside the message', worst < 40, 25, 'A link in this message looks dangerous.')
  ];
  return build(checks);
}

module.exports = checkEmail;