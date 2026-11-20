// civicshield/server/checks/brands.js
// Pure helpers (no network, no dependencies) for the link checker:
//   - brand impersonation  (paypal-secure-login.com, paypal.com.evil.com)
//   - look-alike spelling  (paypa1.com, g00gle.com)
//   - trust-word detection (login, verify, secure ... used as real words, not substrings)
//
// IMPORTANT: the domains below are the real, official ones we treat as safe.
// Verify them before relying on this list, and extend it for the brands your users meet most.

const BRANDS = [
  { names: ['paypal'], domains: ['paypal.com', 'paypal.me'] },
  { names: ['google', 'gmail'], domains: ['google.com', 'gmail.com', 'youtube.com'] },
  { names: ['microsoft', 'outlook', 'office365'], domains: ['microsoft.com', 'live.com', 'outlook.com', 'office.com', 'microsoftonline.com'] },
  { names: ['apple', 'icloud'], domains: ['apple.com', 'icloud.com'] },
  { names: ['amazon'], domains: ['amazon.com', 'amazon.co.uk', 'amazon.de', 'amazon.in', 'amazon.ca', 'amazon.com.au'] },
  { names: ['facebook'], domains: ['facebook.com', 'fb.com', 'meta.com'] },
  { names: ['instagram'], domains: ['instagram.com'] },
  { names: ['whatsapp'], domains: ['whatsapp.com', 'whatsapp.net'] },
  { names: ['netflix'], domains: ['netflix.com'] },
  { names: ['dhl'], domains: ['dhl.com', 'dhl.de'] },
  { names: ['fedex'], domains: ['fedex.com'] },
  // Nigeria
  { names: ['gtbank'], domains: ['gtbank.com'] },
  { names: ['zenithbank'], domains: ['zenithbank.com'] },
  { names: ['accessbank'], domains: ['accessbankplc.com'] },
  { names: ['firstbank'], domains: ['firstbanknigeria.com'] },
  { names: ['paystack'], domains: ['paystack.com'] },
  { names: ['flutterwave'], domains: ['flutterwave.com'] },
  { names: ['cbn'], domains: ['cbn.gov.ng'] }
];

const OFFICIAL = new Set(BRANDS.flatMap((b) => b.domains));

// Words scammers add around a brand name ("paypalsecure", "mtn-support").
const LURE = new Set([
  'login', 'signin', 'secure', 'security', 'support', 'verify', 'verification', 'account', 'accounts',
  'help', 'pay', 'payment', 'online', 'service', 'services', 'update', 'app', 'mail', 'official',
  'alert', 'id', 'wallet', 'billing', 'portal', 'customer', 'care', 'web', 'my'
]);

// Words that, used as real words in the address, earn a warning.
const STRONG = new Set(['login', 'signin', 'verify', 'verification', 'secure', 'account', 'update', 'confirm', 'wallet', 'billing']);
const WEAK = new Set(['bank', 'gift', 'prize', 'free', 'reward', 'claim']);

// Undo common digit-for-letter swaps: g00gle -> google, paypa1 -> paypal.
function unleet(s) {
  return s.replace(/0/g, 'o').replace(/[1!|]/g, 'l').replace(/3/g, 'e').replace(/5/g, 's').replace(/4/g, 'a').replace(/\$/g, 's');
}

function tokens(s) {
  return s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

function singular(t) {
  return t.endsWith('s') && t.length > 4 ? t.slice(0, -1) : t;
}

// Does this token mean the brand? "paypal" and "paypalsecure" do, "applebees" does not.
function tokenIsBrand(token, name) {
  if (token === name) return true;
  for (const lure of LURE) {
    if (token === name + lure || token === lure + name) return true;
  }
  return false;
}

function isOfficial(domain) {
  return !!domain && OFFICIAL.has(domain);
}

// Which brand does this host pretend to be? Returns the brand name or null.
// `domain` is the registrable domain (e.g. evil.com for paypal.com.evil.com).
function impersonates(host, domain) {
  if (isOfficial(domain)) return null;
  const toks = tokens(unleet(host));
  for (const b of BRANDS) {
    for (const name of b.names) {
      if (toks.some((t) => tokenIsBrand(t, name))) return name;
    }
  }
  return null;
}

// Digits swapped in for letters inside a brand name (paypa1, g00gle).
function lookalike(host, domain) {
  if (isOfficial(domain)) return false;
  const raw = host.toLowerCase();
  const fixed = unleet(raw);
  if (fixed === raw) return false;
  const toks = tokens(fixed);
  return BRANDS.some((b) => b.names.some((name) => toks.some((t) => tokenIsBrand(t, name))));
}

// Trust words used as whole words. Path words only count when there are two or more,
// so wikipedia.org/wiki/Bank is fine but /secure/login/verify is not.
function trustWords(host, path, domain) {
  if (isOfficial(domain)) return [];
  const hostHits = tokens(host).map(singular).filter((t) => STRONG.has(t));
  if (hostHits.length) return [...new Set(hostHits)];
  const pathHits = [...new Set(tokens(path).map(singular).filter((t) => STRONG.has(t) || WEAK.has(t)))];
  return pathHits.length >= 2 ? pathHits : [];
}

module.exports = { impersonates, lookalike, trustWords, isOfficial, unleet };
