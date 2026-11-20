// civicshield/server/checks/url.js
// Link checks. The server NEVER connects to the submitted site (that would be an SSRF risk).
// It only parses the text, asks DNS, asks the public RDAP service about the domain, and
// optionally asks Google Safe Browsing.
const dns = require('dns');
const { getDomain } = require('tldts');
const { check, build, userError } = require('./common');
const { impersonates, lookalike, trustWords } = require('./brands');

const resolver = new dns.promises.Resolver({ timeout: 3000, tries: 1 });
const SB_KEY = process.env.GOOGLE_SAFE_BROWSING_KEY; // optional

function parse(raw) {
  let text = raw.trim();
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) {
    if (/^(javascript|data|file|vbscript|mailto|tel):/i.test(text)) {
      throw userError('Only web links (http or https) can be checked.');
    }
    text = 'http://' + text;
  }
  let u;
  try {
    u = new URL(text);
  } catch {
    throw userError('That does not look like a valid link.');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw userError('Only web links (http or https) can be checked.');
  }
  return u;
}

async function domainAgeDays(domain) {
  if (!domain || !/^[a-z0-9.-]+$/.test(domain)) return null;
  try {
    const r = await fetch('https://rdap.org/domain/' + encodeURIComponent(domain), {
      signal: AbortSignal.timeout(4000),
      headers: { accept: 'application/rdap+json' }
    });
    if (!r.ok) return null;
    const data = await r.json();
    const ev = (data.events || []).find((e) => e.eventAction === 'registration');
    if (!ev) return null;
    const days = Math.floor((Date.now() - new Date(ev.eventDate).getTime()) / 86400000);
    return Number.isFinite(days) && days >= 0 ? days : null;
  } catch {
    return null;
  }
}

// true = resolves, false = does not exist, null = could not tell
async function resolves(host) {
  try {
    await resolver.resolve4(host);
    return true;
  } catch (e) {
    if (e.code !== 'ENOTFOUND' && e.code !== 'ENODATA') return null;
  }
  try {
    await resolver.resolve6(host);
    return true;
  } catch (e) {
    return e.code === 'ENOTFOUND' || e.code === 'ENODATA' ? false : null;
  }
}

// true = listed as unsafe, false = not listed, null = not checked
async function safeBrowsing(url) {
  if (!SB_KEY) return null;
  try {
    const r = await fetch(
      'https://safebrowsing.googleapis.com/v4/threatMatches:find?key=' + encodeURIComponent(SB_KEY),
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: AbortSignal.timeout(4000),
        body: JSON.stringify({
          client: { clientId: 'civicshield', clientVersion: '1.0.0' },
          threatInfo: {
            threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
            platformTypes: ['ANY_PLATFORM'],
            threatEntryTypes: ['URL'],
            threatEntries: [{ url }]
          }
        })
      }
    );
    if (!r.ok) return null;
    const d = await r.json();
    return Array.isArray(d.matches) && d.matches.length > 0;
  } catch {
    return null;
  }
}

async function checkUrl(raw) {
  const u = parse(raw);
  const host = u.hostname.toLowerCase();
  const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith('[');
  const domain = isIp ? null : getDomain(host);
  const words = isIp ? [] : trustWords(host, u.pathname, domain);
  const brand = isIp ? null : impersonates(host, domain);

  const checks = [
    check('Secure connection (https)', u.protocol === 'http:', 15, 'It does not use a secure (https) connection.'),
    check('Real name, not numbers', isIp, 30, 'The address is made of numbers, not a real name.'),
    check('Web suffix', /\.(top|xyz|click|zip|loan|gq|tk|work|rest)$/.test(host), 25, 'It ends in a suffix often used by scammers.'),
    check('Urgent or “account” words', words.length > 0, 22, 'It uses official-sounding words (' + words.join(', ') + ') to earn your trust.'),
    check('Look-alike spelling', !isIp && lookalike(host, domain), 25, 'The name swaps digits for letters to copy a real brand.'),
    check('Brand impersonation', !!brand, 35, 'The address uses the name “' + brand + '” but is not that company’s real website.'),
    check('Number of dashes', (host.match(/-/g) || []).length >= 2, 12, 'The name has many dashes, which is unusual.'),
    check('Extra address parts', host.split('.').length > 4, 12, 'The address has many extra parts in front.'),
    check('Hidden destination', /(^|\.)(bit\.ly|tinyurl\.com|t\.co|goo\.gl)$/.test(host), 15, 'It is a shortened link that hides where it goes.'),
    check('Look-alike alphabets', host.includes('xn--'), 25, 'It uses look-alike letters from other alphabets.'),
    check('Valid address shape', !isIp && !host.includes('.'), 30, 'This does not look like a valid web address.')
  ];

  // Live checks run in parallel
  const [age, dnsOk, listed] = await Promise.all([
    domainAgeDays(domain),
    isIp ? Promise.resolve(null) : resolves(host),
    safeBrowsing(u.href)
  ]);

  if (age === null) {
    checks.push({ l: 'Domain age', bad: false, unknown: true, m: 'Could not be checked right now.' });
  } else if (age < 30) {
    checks.push(check('Domain age', true, 25, `The domain was registered only ${age} day${age === 1 ? '' : 's'} ago.`));
  } else if (age < 180) {
    checks.push(check('Domain age', true, 10, `The domain is less than 6 months old (${age} days).`));
  } else {
    checks.push(check('Domain age', false, 0, ''));
  }

  if (dnsOk === null) {
    checks.push({ l: 'Address exists', bad: false, unknown: true, m: 'Could not be checked right now.' });
  } else {
    checks.push(check('Address exists', dnsOk === false, 20, 'This address does not exist on the internet. It may be a typo or have been taken down.'));
  }

  if (listed === null) {
    checks.push({ l: 'Google unsafe-sites list', bad: false, unknown: true, m: 'Not checked.' });
  } else {
    checks.push(check('Google unsafe-sites list', listed, 60, 'This address is on Google’s list of unsafe sites.'));
  }

  return { ...build(checks), details: { domain, ageDays: age } };
}

module.exports = checkUrl;