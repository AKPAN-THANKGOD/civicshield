/* Scam Database page: search + filters over window.SCAMS */
(function(){
var D=window.SCAMS||[],q=$('dq'),ch=$('dch'),rk=$('drk'),L=$('dlist'),n=$('dcount');
var CH={url:'🔗 Link',phone:'📞 Phone',email:'✉️ Email'},RK={high:'⛔ High risk',medium:'⚠️ Medium risk'};
function card(d){
  return'<article class="card dcard"><span class="tag">'+CH[d.channel]+'</span><span class="tag r-'+d.risk+'">'+RK[d.risk]+'</span><h3>'+esc(d.title)+'</h3><p>'+esc(d.summary)+'</p>'+
  '<details><summary>Warning signs and what to do</summary><div class="more"><b>Warning signs</b><ul>'+d.flags.map(function(f){return'<li>'+esc(f)+'</li>'}).join('')+'</ul><b>What to do</b><p style="margin:4px 0 12px">'+esc(d.action)+'</p><b>Example</b><span class="ex">'+esc(d.example)+'</span><a class="btn ghost" href="checker.html?type='+d.channel+'&q='+encodeURIComponent(d.example)+'">🛡️ Run this example in the checker</a></div></details></article>';
}
function render(){
  var t=q.value.trim().toLowerCase(),c=ch.value,r=rk.value;
  var out=D.filter(function(d){return(!c||d.channel===c)&&(!r||d.risk===r)&&(!t||(d.title+' '+d.summary+' '+d.flags.join(' ')).toLowerCase().indexOf(t)>-1)});
  n.textContent=out.length+' of '+D.length+' patterns';
  L.innerHTML=out.length?out.map(card).join(''):'<p>No matches. Try fewer words or clear the filters.</p>';
}
q.oninput=ch.onchange=rk.onchange=render;render();
})();
