/* Altro: i quattro riquadri (Maglia, Sponsor, Storia, Contatti) sono scritti nella pagina, con i testi approvati del sistema.
   Qui si aggiungono solo la striscia degli sponsor e il footer, dai dati. Su schermo largo la pagina resta la stessa:
   le voci stanno anche nell'header, ma chi arriva qui da un link vede comunque i riquadri (scelta di Nicolo', 23 novembre 2026). */
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
