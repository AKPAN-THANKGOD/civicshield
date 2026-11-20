// civicshield/js/common.js
/* CivicShield shared: header/footer, theme, text size, toast, modal, Guardian XP */
var $=function(i){return document.getElementById(i)},root=document.documentElement;
function store(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function hash(s){var h=0;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return Math.abs(h)}

/* inject header, footer, dialog, toast */
(function(){
  var pg=document.body.getAttribute('data-page')||'';
  var tabs=[['home','index.html','Home'],['checker','checker.html','Instant Checker'],['database','database.html','Scam Database'],['guide','guide.html','Safety Guide']];
  var logo='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2 4 5.5v6c0 5 3.4 8.6 8 10.5 4.6-1.9 8-5.5 8-10.5v-6L12 2Z" fill="#2563EB"/><path d="m8.5 12 2.5 2.5 4.5-5" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var H='<div class="wrap"><nav aria-label="Main"><a class="brand" href="index.html">'+logo+'CivicShield</a><div class="tabs">'+tabs.map(function(t){return'<a href="'+t[1]+'"'+(t[0]===pg?' class="on" aria-current="page"':'')+'>'+t[2]+'</a>'}).join('')+'</div><span class="sp"></span><button class="tool" id="fm" aria-label="Smaller text">A−</button><button class="tool" id="fp" aria-label="Larger text">A+</button><button class="tool" id="theme" aria-label="Switch to dark mode">🌙</button><button class="tool emerg" id="emerg">🚨 Emergency Help</button><span class="xpchip" id="chip"></span></nav></div><div class="info"><div class="wrap">🛡️ <b>Free public safety tool.</b> We don’t store what you check. Reports are saved only as scrambled hashes.</div></div>';
  var F='<footer><div class="wrap"><b>CivicShield</b> · <a href="index.html">Home</a> · <a href="checker.html">Checker</a> · <a href="database.html">Scam Database</a> · <a href="guide.html">Safety Guide</a><p>CivicShield is a portfolio project. Scores combine pattern checks with live domain lookups, and the database is an educational library of common scam patterns, not live reports. Never share passwords or codes, even when a result looks safe.</p></div></footer>';
  var h=$('site-header'),f=$('site-footer');if(h)h.innerHTML=H;if(f)f.innerHTML=F;
  document.body.insertAdjacentHTML('beforeend','<dialog id="dlg"><h2 id="dt"></h2><div id="db" class="big"></div><div class="stack" style="margin-top:20px"><button class="btn" id="dc">Close</button></div></dialog><div class="toast" id="toast" role="status"></div>');
})();

var tt;function toast(m){var e=$('toast');e.textContent=m;e.classList.add('on');clearTimeout(tt);tt=setTimeout(function(){e.classList.remove('on')},3200)}
function modal(t,h){$('dt').textContent=t;$('db').innerHTML=h;var d=$('dlg');if(d.showModal)d.showModal();else d.setAttribute('open','')}
$('dc').onclick=function(){$('dlg').close()};
$('emerg').onclick=function(){modal('🚨 Already shared details or sent money?','<ol style="padding-left:1.2em;margin:0"><li>Call your bank right away using the number on your card.</li><li>Change the password for any account you shared.</li><li>Report it to your national fraud or police reporting service.</li><li>Tell a trusted person today.</li></ol>')};

/* theme + text size */
function applyTheme(t){root.setAttribute('data-theme',t);$('theme').textContent=t==='dark'?'☀️':'🌙';$('theme').setAttribute('aria-label',t==='dark'?'Switch to light mode':'Switch to dark mode')}
applyTheme(store('cs-theme')||(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));
$('theme').onclick=function(){var n=root.getAttribute('data-theme')==='dark'?'light':'dark';applyTheme(n);store('cs-theme',n)};
var fs=parseInt(store('cs-fs'),10)||18;
function setFs(n){fs=Math.max(16,Math.min(26,n));root.style.setProperty('--fs',fs+'px');store('cs-fs',String(fs))}
setFs(fs);$('fm').onclick=function(){setFs(fs-2)};$('fp').onclick=function(){setFs(fs+2)};

/* Guardian XP (saved in this browser only) */
var R=[['Newcomer',0],['Neighborhood Watch',100],['Senior Watchman',400],['Global Guardian',800]];
var st={xp:0,helped:0};try{var _s=JSON.parse(store('cs-g')||'null');if(_s)st=_s}catch(e){}
function setT(id,t){var e=$(id);if(e)e.textContent=t}
function renderG(){var lv=0,i;for(i=0;i<R.length;i++)if(st.xp>=R[i][1])lv=i;var nx=R[lv+1];
  setT('rank',R[lv][0]);setT('chip','🛡️ '+R[lv][0]+' · '+st.xp+' XP');
  setT('helped','You have helped protect the community '+st.helped+' times.');
  var fl=$('fill'),pb=$('pb');
  if(nx){var p=(st.xp-R[lv][1])/(nx[1]-R[lv][1])*100;if(fl)fl.style.width=p+'%';if(pb)pb.setAttribute('aria-valuenow',Math.round(p));setT('xpt',st.xp+' / '+nx[1]+' XP to '+nx[0])}
  else{if(fl)fl.style.width='100%';setT('xpt','Top rank reached')}}
function gain(x,h){st.xp+=x;st.helped+=h;store('cs-g',JSON.stringify(st));renderG()}
renderG();