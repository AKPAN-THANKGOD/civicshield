// civicshield/js/guide.js
// Print button. All sections are opened first so nothing is hidden on paper.
function openAllDetails() {
  Array.prototype.forEach.call(document.querySelectorAll('details'), function (d) { d.open = true; });
}
window.addEventListener('beforeprint', openAllDetails);
$('print').onclick = function () { openAllDetails(); window.print(); };