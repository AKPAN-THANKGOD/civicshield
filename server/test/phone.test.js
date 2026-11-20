// civicshield/server/test/phone.test.js
// Pure unit tests: no network and no installed dependencies needed.
const test = require('node:test');
const assert = require('node:assert/strict');
const checkPhone = require('../checks/phone');
const { parse } = checkPhone;

const find = (r, label) => r.checks.find((c) => c.l === label);

test('Nigerian numbers in every common format give the same E.164 value', () => {
  for (const v of ['08031234567', '+234 803 123 4567', '2348031234567', '0023480312345 67'.replace(' ', '')]) {
    assert.equal(parse(v).e164, '+2348031234567', v);
    assert.equal(parse(v).country, 'NG', v);
  }
});

test('a valid Nigerian mobile number is not flagged', async () => {
  const r = await checkPhone('0803 123 4567');
  assert.equal(r.level, 'safe');
  assert.equal(find(r, 'Normal number length').bad, false);
  assert.equal(r.details.e164, '+2348031234567');
});

test('a Nigerian +234 number with the wrong length is flagged', async () => {
  const r = await checkPhone('+234 803 123 456');
  assert.equal(find(r, 'Normal number length').bad, true);
});

test('Nigerian numbers are not treated as toll-free or premium', async () => {
  const r = await checkPhone('08001234567');
  assert.equal(find(r, 'Not toll-free (often spoofed)').bad, false);
  assert.equal(find(r, 'Not premium-rate').bad, false);
});

test('US premium-rate and toll-free numbers still work', async () => {
  assert.equal(find(await checkPhone('+1 900 555 0142'), 'Not premium-rate').bad, true);
  assert.equal(find(await checkPhone('+1 800 555 0142'), 'Not toll-free (often spoofed)').bad, true);
});

test('UK premium and personal numbers are flagged', async () => {
  assert.equal(find(await checkPhone('+44 909 879 0000'), 'Not premium-rate').bad, true);
  assert.equal(find(await checkPhone('+44 70 1234 5678'), 'Not premium-rate').bad, true);
  assert.equal(find(await checkPhone('+44 20 7946 0958'), 'Not premium-rate').bad, false);
});

test('one-ring callback patterns are flagged', async () => {
  assert.equal(find(await checkPhone('+224 622 123 456'), 'No “call back” trap').bad, true); // Guinea
  assert.equal(find(await checkPhone('+1 876 555 0123'), 'No “call back” trap').bad, true); // Jamaica
  assert.equal(find(await checkPhone('+234 803 123 4567'), 'No “call back” trap').bad, false);
});

test('dial codes starting with * or # are flagged, short codes are not called invalid', async () => {
  const r = await checkPhone('*21*08031234567#');
  assert.equal(find(r, 'Not a dial code').bad, true);
  const s = await checkPhone('*737#');
  assert.equal(find(s, 'Not a dial code').bad, true);
  assert.equal(find(s, 'Normal number length').bad, false);
});

test('very short numbers are marked as unverifiable', async () => {
  const r = await checkPhone('55055');
  assert.equal(find(r, 'Normal number length').bad, true);
  assert.notEqual(r.level, 'safe');
});

test('empty input is rejected', async () => {
  await assert.rejects(() => checkPhone('abc'), /enter a phone number/i);
});
