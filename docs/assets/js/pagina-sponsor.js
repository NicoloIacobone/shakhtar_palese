/* Sponsor: titolo e attacco, una scheda per sponsor attivo nell'ordine di sponsor.json, la scheda "C'e' ancora spazio
   sulla maglia" (diventa_sponsor) con il bottone "Scrivici", poi la striscia. Montaggio come la pagina di esempio PaginaSponsor:
   su schermo largo le tre schede affiancate (sp-griglia-3) con il logo in alto.
   Il logo sta sempre su nero (sp-logo-nero), con alt vuoto perche' il nome e' scritto accanto. Un campo vuoto non compare.
   Il livello ("main", "partner") non si vede; "mostra_simulatore" non ha piu' un posto nella pagina del sistema. */
(function () {
  'use strict';
  var SP = window.SP, $ = function (id) { return document.getElementById(id); };

  function scheda(s) {
    return '<article class="sp-sponsor sp-vetro sp-su"><div class="sp-sponsor__testa">' +
      (s.logo ? '<span class="sp-logo-nero"><img src="' + SP.esc(s.logo) + '" alt=""></span>' : '') +
      '<div><span class="sp-sponsor__nome">' + SP.esc(s.nome) + '</span>' +
      (s.posizione_maglia ? '<span class="sp-tenue">' + SP.esc(s.posizione_maglia) + '</span>' : '') + '</div></div>' +
      (s.descrizione ? '<p class="sp-sponsor__battuta">' + SP.esc(s.descrizione) + '</p>' : '') + '</article>';
  }

  SP.carica(['config', 'sponsor', 'storia']).then(function (d) {
    var attivi = ((d.sponsor && d.sponsor.sponsor) || []).filter(function (s) { return s.attivo !== false && s.nome; });
    $('sponsor').outerHTML = attivi.length ?
      '<div class="sp-sezione sp-sezione--stretta"><div class="sp-pila sp-griglia-3">' + attivi.map(scheda).join('') + '</div></div>' : '';
    var inv = d.sponsor && d.sponsor.diventa_sponsor, email = d.config && d.config.social && d.config.social.email;
    $('invito').outerHTML = inv && inv.attivo !== false && inv.titolo ?
      '<section class="sp-sezione"><div class="sp-invito sp-vetro sp-su"><h2>' + SP.esc(inv.titolo) + '</h2>' +
        (inv.testo ? '<p>' + SP.esc(inv.testo) + '</p>' : '') +
        (email ? '<a class="sp-bottone" href="mailto:' + SP.esc(email) + '">Scrivici</a>' : '') + '</div></section>' : '';
    $('striscia').outerHTML = SP.striscia(d.sponsor);
    SP.footer($('sp-footer'), d.config, d.storia);
  }).catch(function (e) {
    if (window.console) { console.error(e); }
  }).then(function () {
    window.Shakhtar.avvia();
  });
})();
