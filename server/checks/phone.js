// civicshield/server/checks/phone.js
// Phone checks. No network and no dependencies: it only reads the digits.
// Understands Nigerian numbers (+234 / 0803...), US/Canada numbers (+1), UK numbers (+44)
// and flags a few well-known scam patterns. Everything here is heuristic guidance.
const { check, build, userError } = require('./common');

// Country codes often used for "one-ring" callback scams (the scammer rings once and hopes
// you call back to a costly number). Heuristic list: review and adjust it over time.
const ONE_RING_CODES = ['216', '224', '225', '232', '252', '371', '375'];
// +882 / +883 are international networks that can carry very high call charges.
const INTL_NETWORK_CODES = ['882', '883'];
// Caribbean area codes inside the +1 plan, often used for the same callback scam.
const CARIBBEAN_AREA = ['242', '246', '264', '268', '284', '345', '441', '473', '649', '664', '721', '758', '767', '784', '809', '829', '849', '868', '869', '876'];

// Turns what the person typed into { country, national, e164, digits, intl, hasDialCode }.
// country: 'NG' | 'NANP' | 'UK' | 'OTHER' | null (unknown, no country given)
function parse(raw) {
  const text = String(raw).trim();
  let digits = text.replace(/\D/g, '');
  let intl = text.startsWith('+');
  if (!intl && digits.startsWith('00')) {
    intl = true;
    digits = digits.slice(2);
  }

  let country = null;
  let national = digits;

  if (intl) {
    if (digits.startsWith('234')) { country = 'NG'; national = digits.slice(3); }
    else if (digits.startsWith('1')) { country = 'NANP'; national = digits.slice(1); }
    else if (digits.startsWith('44')) { country = 'UK'; national = digits.slice(2); }
    else { country = 'OTHER'; }
  } else {
    let m;
    if ((m = /^234([789]\d{9})$/.exec(digits))) { country = 'NG'; national = m[1]; }
    else if ((m = /^0([789][01]\d{8})$/.exec(digits))) { country = 'NG'; national = m[1]; } // 0803..., 0703..., 0813..., 0901...
    else if (/^1\d{10}$/.test(digits)) { country = 'NANP'; national = digits.slice(1); }
  }

  const e164 = country === 'NG' ? '+234' + national
    : country === 'NANP' ? '+1' + national
    : country === 'UK' ? '+44' + national
    : intl ? '+' + digits
    : null;

  return { country, national, e164, digits, intl, hasDialCode: /[*#]/.test(text) };
}

function nigerianFormatOk(national) {
  if (/^[789]/.test(national)) return national.length === 10; // mobile numbers
  return national.length >= 7 && national.length <= 10; // landlines vary by area
}

async function checkPhone(raw) {
  const p = parse(raw);
  if (!p.digits) throw userError('Please enter a phone number.');

  const { country, national, digits } = p;
  // For US-style tests on numbers where no country was given, fall back to the digits.
  const nanp = country === 'NANP' ? national : country === null ? digits.replace(/^1/, '') : '';

  const tooShort = digits.length < 7;
  const tooLong = digits.length > 15;
  const badShape =
    (country === 'NG' && !nigerianFormatOk(national)) ||
    (country === 'NANP' && national.length !== 10);

  const oneRing =
    (country === 'OTHER' && ONE_RING_CODES.some((c) => digits.startsWith(c))) ||
    (country === 'NANP' && CARIBBEAN_AREA.includes(national.slice(0, 3)));

  const premium =
    /^(900|976)/.test(nanp) ||
    (country === 'UK' && /^(9|70)/.test(national)) ||
    (country === 'OTHER' && INTL_NETWORK_CODES.some((c) => digits.startsWith(c)));

  const checks = [
    check(
      'Normal number length',
      tooLong || badShape || (tooShort && !p.hasDialCode),
      tooShort ? 25 : 40,
      tooShort
        ? 'This is a very short number. Short codes cannot be verified here, so confirm who owns it on the company’s official website.'
        : country === 'NG'
          ? 'Nigerian mobile numbers have 10 digits after +234 (11 digits starting with 0). This one does not match.'
          : 'The number length is unusual.'
    ),
    check('Not premium-rate', premium, 35, 'It looks like a premium-rate number that can cost you money.'),
    check('No repeating pattern', /(\d)\1{5,}/.test(digits), 15, 'It has a suspicious repeating pattern.'),
    check(
      'Not toll-free (often spoofed)',
      /^(800|888|877|866|855|844|833)/.test(nanp),
      8,
      'Toll-free numbers are often spoofed in scam calls.'
    ),
    check(
      'No “call back” trap',
      oneRing,
      20,
      'Numbers like this are often used for one-ring scams. Do not call back, as it can cost you money.'
    ),
    check(
      'Not a dial code',
      p.hasDialCode,
      30,
      'Codes with * or # can move money or forward your calls. Only dial one that you got from your bank’s or network’s official app or website, never from a caller or message.'
    )
  ];

  return { ...build(checks), details: { country, e164: p.e164 } };
}

checkPhone.parse = parse;
module.exports = checkPhone;
