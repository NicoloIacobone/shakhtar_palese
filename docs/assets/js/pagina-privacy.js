/* Privacy e cookie: il testo legale e' scritto nella pagina (resta quello di oggi, con le frasi sulla memoria del browser
   aggiornate e approvate da Nicolo' il 24 novembre 2026). Qui l'indirizzo email da config.json nei link [data-email],
   la striscia e il footer. Impaginazione scelta da Nicolo' il 24 novembre 2026: un solo pannello di testo con i titoli
   in Barlow (sito.css punto 12); su schermo largo l'indice resta fermo nella colonna sinistra. */
(function () {
  'use strict';
  var SP = window.SP, $ = function (id) { return document.getElementById(id); };
  SP.pagina([], function (d) {
    var email = d.config && d.config.social && d.config.social.email;
    Array.prototype.forEach.call(document.querySelectorAll('[data-email]'), function (a) {
      if (email) { a.href = 'mailto:' + email; a.textContent = email; }
    });
  });
})();
