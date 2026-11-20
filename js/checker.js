// civicshield/js/checker.js
(function () {
  var cur = null, seq = 0;
  var ph = { url: 'Paste a link here…', phone: 'Type a phone number…', email: 'Paste the email text here…' };
  var NOUN = { url: 'link', phone: 'number', email: 'message' };
  var LV = {
    safe: { ico: '✅', lab: 'Looks safe', head: 'No warning signs found' },
    warn: { ico: '⚠️', lab: 'Suspicious', head: 'Some warning signs found' },
    bad: { ico: '⛔', lab: 'Dangerous', head: 'Multiple scam signs detected' }
  };
  var ADV = {
    safe: ['Looks fine to use', 'Never share passwords or codes unless you started the conversation.', 'Check that the address matches the company you expect'],
    warn: ['Do not type a password or card number', 'Close the page if you weren’t expecting it', 'Contact the company using a number you already trust'],
    bad: ['Do not click, reply, call back or pay', 'Delete the message', 'If you shared details, change passwords and call your bank']
  };

  function levelOf(s) { return s >= 70 ? 'safe' : s >= 40 ? 'warn' : 'bad'; }

  function post(url, body, ms) {
    return fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(ms)
    });
  }

  // Offline fallback uses the demo analyzer from js/analyzer.js
  function offline(type, value) {
    if (typeof analyze !== 'function') return { error: 'Could not reach the server.' };
    var a = analyze(type, value);
    return { live: false, d: { score: a.score, checks: a.checks, reports: a.flags } };
  }

  async function getResult(type, value) {
    try {
      var r = await post('/api/scan', { type: type, value: value }, 15000);
      var d = await r.json().catch(function () { return null; });
      if (r.ok && d) return { live: true, d: d };
      if (d && d.error) return { error: d.error }; // e.g. invalid link, rate limit
      return offline(type, value);                 // no JSON back: server not there
    } catch (e) {
      return offline(type, value);
    }
  }

  function showReports(n) {
    var live = cur.live && !cur.sample;
    var tc = 'var(--' + cur.L + '-t)', noun = NOUN[cur.t];
    $('f3').textContent = n.toLocaleString();
    $('f3').previousElementSibling.textContent = live ? 'Community reports' : 'Community reports (sample)';
    var txt = live
      ? (n ? 'people have reported this exact ' + noun + ' on CivicShield.' : 'No one has reported this exact ' + noun + ' on CivicShield yet.')
      : (n ? 'people have flagged similar items (sample data).' : 'No flags so far (sample data).');
    $('c3').innerHTML =
      '<div style="font-size:2.2rem;font-weight:800;color:' + tc + ';line-height:1.1">' + n.toLocaleString() + '</div>' +
      '<p style="margin:6px 0 0;color:var(--muted)">' + txt + '</p>';
  }

  function show(out, type, v) {
    var d = out.d, L = d.level || levelOf(d.score), lv = LV[L], tc = 'var(--' + L + '-t)';
    var bad = d.checks.filter(function (c) { return c.bad; });
    var ran = d.checks.filter(function (c) { return !c.unknown; });
    var skipped = d.checks.length - ran.length;

    $('arc').style.stroke = 'var(--' + L + ')';
    $('arc').setAttribute('stroke-dasharray', d.score + ' 100');
    $('score').innerHTML = d.score + '<small>/100</small>';
    var p = $('pill'); p.style.color = tc; p.textContent = lv.ico + ' ' + lv.lab;
    $('tgt').textContent = v.length > 70 ? v.slice(0, 70) + '…' : v;
    $('vh').textContent = lv.head;
    $('vp').textContent = bad.length
      ? bad[0].m
      : (skipped ? 'Nothing unusual found, but some live checks could not be run.' : 'Nothing unusual in how this is written.');
    $('f1').textContent = ran.length;
    $('f2').textContent = bad.length;
    $('f4').textContent = bad.length ? bad[0].l : 'None';

    $('c1').innerHTML =
      '<p style="font-weight:700;color:' + tc + ';margin-top:0">' + lv.ico + ' ' + lv.lab + '</p>' +
      (bad.length
        ? '<ul>' + bad.slice(0, 3).map(function (b) { return '<li>' + esc(b.m) + '</li>'; }).join('') + '</ul>'
        : '<p>We found nothing unusual.</p>');
    $('c2').innerHTML = '<ul>' + ADV[L].map(function (a) { return '<li>' + a + '</li>'; }).join('') + '</ul>';

    var src = out.sample ? 'Example (not a live scan)' : out.live ? 'Live scan' : 'Offline demo (server not reachable)';
    $('tel').innerHTML =
      '<div><span>Source</span><span><b>' + src + '</b></span></div>' +
      d.checks.map(function (c) {
        var cls = c.unknown ? '' : c.bad ? 'no' : 'ok';
        var txt = c.unknown ? '— Not available' : c.bad ? '⚠ Warning' : '✓ Passed';
        return '<div><span>' + esc(c.l) + '</span><span class="' + cls + '">' + txt + '</span></div>';
      }).join('');

    cur = { t: type, v: v, L: L, lab: lv.lab, adv: ADV[L], live: !!out.live, sample: !!out.sample };
    showReports(d.reports || 0);
    $('report').disabled = !cur.live || cur.sample;
  }

  async function scan() {
    var v = $('q').value.trim(), t = $('type').value;
    if (!v) { $('q').focus(); toast('Please paste something to check first.'); return; }
    var b = $('go'), my = ++seq;
    b.disabled = true; b.textContent = 'Scanning…';
    var out = await getResult(t, v);
    if (my !== seq) return; // a newer scan replaced this one
    b.disabled = false; b.textContent = '🛡️ Scan Now';
    if (out.error) { toast(out.error); return; }
    show(out, t, v);
    if (!out.live) toast('Server not reachable. Showing an offline demo result.');
    gain(10, 1);
  }

  function sample() {
    if (typeof analyze !== 'function') return;
    var u = 'http://secure-login.bank-verify77.top/update-account';
    $('type').value = 'url'; $('q').value = u;
    var o = offline('url', u);
    o.sample = true;
    show(o, 'url', u);
  }

  // Controls
  $('type').onchange = function () { $('q').placeholder = ph[this.value]; };
  $('go').onclick = scan;
  $('q').onkeydown = function (e) { if (e.key === 'Enter') scan(); };
  Array.prototype.forEach.call(document.querySelectorAll('.chip'), function (c) {
    c.onclick = function () { $('type').value = c.dataset.t; $('q').value = c.dataset.v; scan(); };
  });
  $('again').onclick = function () { $('q').value = ''; $('q').focus(); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  $('report').onclick = async function () {
    if (!cur || !cur.live || cur.sample) { toast('Reports need a live scan from the server.'); return; }
    var btn = this; btn.disabled = true;
    try {
      var r = await post('/api/report', { type: cur.t, value: cur.v }, 10000);
      var d = await r.json().catch(function () { return null; });
      if (r.ok && d) {
        showReports(d.reports);
        if (d.already) { toast('You have already reported this. Thank you!'); return; }
        gain(25, 1);
        toast('Thank you! Your report helps protect others. +25 XP');
        return;
      }
      btn.disabled = false;
      toast((d && d.error) || 'Could not send your report.');
    } catch (e) {
      btn.disabled = false;
      toast('Could not reach the server. Report not sent.');
    }
  };

  $('copy').onclick = function () {
    var t = cur ? cur.v : '';
    if (!t) return;
    try { navigator.clipboard.writeText(t).then(function () { toast('Copied'); }, function () { toast('Could not copy'); }); }
    catch (e) { toast('Could not copy'); }
  };

  function msg() {
    return cur ? 'CivicShield warning: I checked this ' + NOUN[cur.t] + ' and the result is “' + cur.lab + '”. ' + cur.adv[0] + '. Please don’t click, reply or share any codes.' : '';
  }
  $('wa').onclick = function () {
    if (!cur) { toast('Scan something first.'); return; }
    var u = 'https://wa.me/?text=' + encodeURIComponent(msg());
    try { window.open(u, '_blank', 'noopener'); } catch (e) { toast('Could not open WhatsApp'); }
  };
  $('lt').onclick = function () {
    if (!cur) { toast('Scan something first.'); return; }
    modal(cur.L === 'safe' ? '✅ Looks safe' : '⚠️ Be careful',
      '<p style="margin-top:0">Result: <b>' + cur.lab + '</b></p><p><b>' + esc(cur.adv[0]) + '.</b></p><p>' + esc(cur.adv[1]) + '.</p>');
  };

  // Start: prefill from the landing page form (?type=…&q=…), otherwise show a sample
  var P = new URLSearchParams(location.search), pt = P.get('type'), pq = P.get('q');
  if (['url', 'phone', 'email'].indexOf(pt) > -1) $('type').value = pt;
  $('q').placeholder = ph[$('type').value];
  if (pq) { $('q').value = pq; scan(); } else { sample(); }
})();