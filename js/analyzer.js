/* CivicShield analyzer: on-device pattern checks (demo heuristics) */
function analyze(type,v){
  var low=v.toLowerCase(),score=94,checks=[];
  function C(label,bad,pen,msg){checks.push({l:label,bad:!!bad,m:msg});if(bad)score-=pen}
  if(type==='url'){
    var host=low.replace(/^[a-z]+:\/\//,'').split(/[\/?#]/)[0];
    C('Secure connection (https)',/^http:\/\//.test(low),15,'It does not use a secure (https) connection.');
    C('Real name, not numbers',/^\d{1,3}(\.\d{1,3}){3}/.test(host),30,'The address is made of numbers, not a real name.');
    C('Web suffix',/\.(top|xyz|click|zip|loan|gq|tk|work|rest)$/.test(host),25,'It ends in a suffix often used by scammers.');
    C('Urgent or “account” words',/(login|verify|secure|account|update|confirm|bank|wallet|gift|prize|free)/.test(low),22,'It uses official-sounding words to earn your trust.');
    C('Look-alike spelling',/[a-z][0-9][a-z]|paypa1|g00gle|faceb00k|amaz0n/.test(host),25,'The name mixes digits and letters to copy a real brand.');
    C('Number of dashes',(host.match(/-/g)||[]).length>=2,12,'The name has many dashes, which is unusual.');
    C('Extra address parts',host.split('.').length>4,12,'The address has many extra parts in front.');
    C('Hidden destination',/bit\.ly|tinyurl|t\.co|goo\.gl/.test(host),15,'It is a shortened link that hides where it goes.');
    C('Look-alike alphabets',/xn--/.test(host),25,'It uses look-alike letters from other alphabets.');
    C('Valid address shape',!/\./.test(host),30,'This does not look like a valid web address.');
  }else if(type==='phone'){
    var d=v.replace(/\D/g,'');
    C('Normal number length',d.length<7||d.length>15,40,'The number length is unusual.');
    C('Not premium-rate',/^(1?900|1?976)/.test(d),35,'It looks like a premium-rate number that can cost you money.');
    C('No repeating pattern',/(\d)\1{5,}/.test(d),15,'It has a suspicious repeating pattern.');
    C('Not toll-free (often spoofed)',/^(1?(800|888|877|866))/.test(d),8,'Toll-free numbers are often spoofed in scam calls.');
  }else{
    C('No pressure to hurry',/urgent|immediately|within 24|act now|suspended|final notice/.test(low),25,'It pushes you to act fast.');
    C('No request for secrets',/password|pin\b|otp|one[- ]time code|ssn|card number|bvn/.test(low),30,'It asks for private information.');
    C('No odd payment method',/gift card|wire transfer|bitcoin|crypto|western union/.test(low),30,'It asks for payment that is hard to trace.');
    C('No “click here”',/click (here|below)|http|www\./.test(low),15,'It tells you to click a link.');
    C('No surprise prizes',/prize|lottery|winner|inheritance|million/.test(low),30,'It promises money you didn’t ask for.');
    C('Personal greeting',/dear (customer|user|sir|beneficiary)/.test(low),12,'It doesn’t use your real name.');
  }
  var bad=checks.filter(function(c){return c.bad});
  score=Math.max(4,Math.min(98,score-(hash(low)%5)));
  return{score:score,checks:checks,bad:bad,flags:bad.length?(hash(low)%900)+40+bad.length*60:hash(low)%4};
}
