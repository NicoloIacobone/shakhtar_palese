/* 404: la scheda "Fuorigioco." e i due bottoni sono scritti nell'HTML, cosi' si vedono anche se i dati non arrivano.
   Qui solo la striscia e il footer, come in ogni pagina. GitHub Pages serve questa pagina a qualsiasi profondita':
   con <base href="/"> anche i dati si leggono dalla radice (data/*.json -> /data/*.json). */
(function () {
  'use strict';
  var SP = window.SP, $ = function (id) { return document.getElementById(id); };
  SP.carica(['config', 'sponsor', 'storia']).then(function (d) {
    $('striscia').outerHTML = SP.striscia(d.sponsor);
    SP.footer($('sp-footer'), d.config, d.storia);
  }).catch(function (e) {
    if (window.console) { console.error(e); }
  }).then(function () {
    window.Shakhtar.avvia();
  });
})();
