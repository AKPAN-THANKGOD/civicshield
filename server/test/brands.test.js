// civicshield/server/test/brands.test.js
// Pure unit tests: no network and no installed dependencies needed.
const test = require('node:test');
const assert = require('node:assert/strict');
const { impersonates, lookalike, trustWords } = require('../checks/brands');

test('catches brand names used on someone else’s domain', () => {
  assert.equal(impersonates('paypal-secure-login.com', 'paypal-secure-login.com'), 'paypal');
  assert.equal(impersonates('paypalsecure.net', 'paypalsecure.net'), 'paypal');
  assert.equal(impersonates('paypal.com.evil.com', 'evil.com'), 'paypal');
  assert.equal(impersonates('gtbank-support.ng', 'gtbank-support.ng'), 'gtbank');
});

test('does not flag the real brand domains or their subdomains', () => {
  assert.equal(impersonates('www.paypal.com', 'paypal.com'), null);
  assert.equal(impersonates('login.microsoftonline.com', 'microsoftonline.com'), null);
  assert.equal(impersonates('www.amazon.co.uk', 'amazon.co.uk'), null);
});

test('does not flag unrelated sites that merely contain a brand string', () => {
  assert.equal(impersonates('applebees.com', 'applebees.com'), null);
  assert.equal(impersonates('www.wikipedia.org', 'wikipedia.org'), null);
  assert.equal(impersonates('pineapple-farm.com', 'pineapple-farm.com'), null);
});

test('look-alike spelling needs a digit swap inside a brand name', () => {
  assert.equal(lookalike('paypa1.com', 'paypa1.com'), true);
  assert.equal(lookalike('g00gle-help.com', 'g00gle-help.com'), true);
  // the old rule wrongly flagged any letter-digit-letter, e.g. b2b
  assert.equal(lookalike('b2b-marketplace.com', 'b2b-marketplace.com'), false);
  assert.equal(lookalike('www.paypal.com', 'paypal.com'), false);
});

test('trust words count only as whole words', () => {
  assert.deepEqual(trustWords('secure-login.example.com', '/', 'example.com'), ['secure', 'login']);
  assert.deepEqual(trustWords('accountingtoday.com', '/', 'accountingtoday.com'), []);
  assert.deepEqual(trustWords('freecodecamp.org', '/', 'freecodecamp.org'), []);
  assert.deepEqual(trustWords('en.wikipedia.org', '/wiki/Bank', 'wikipedia.org'), []);
  assert.deepEqual(trustWords('example.com', '/secure/login/verify', 'example.com').length > 1, true);
  assert.deepEqual(trustWords('login.microsoft.com', '/', 'microsoft.com'), []);
});
