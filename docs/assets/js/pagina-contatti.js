/* Contatti: titolo e attacco, email, Instagram e TikTok (RiquadroContatto: un pannello su telefono, tre riquadri su schermo
   largo), poi due schede: "Il campo di casa" con "Aprilo su Google Maps" e l'amichevole con "Scrivici"; poi la striscia.
   Montaggio dalle sezioni "Pagine di Altro e 404" e "Schermi larghi" del README del sistema; la scheda e' l'invito di
   SchedaSponsor. Su schermo largo le due schede sono le due colonne 448:640 (sp-due), alte uguali (sp-invito--colonna).
   Scelte di Nicolo' del 24 novembre 2026: il campo e' una scheda come l'amichevole, con la frase di oggi, nome e indirizzo
   (senza l'Instagram della struttura); niente occhiello "Parliamone"; Instagram e TikTok si aprono in una nuova scheda.
   Dati da config.json; un campo vuoto non compare. I testi fissi sono quelli del sito di oggi. */
(function () {
  'use strict';
  var SP = window.SP, $ = function (id) { return document.getElementById(id); };
  var AVANTI = '<svg aria-hidden="true" width="10" height="16" viewBox="0 0 10 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 2l6 6-6 6"/></svg>';

  function contatto(href, fuori, simbolo, etichetta, valore) {
    return '<a class="sp-contatto" href="' + SP.esc(href) + '"' + (fuori ? ' target="_blank" rel="noopener"' : '') + '>' + SP.simbolo(simbolo, 32) +
      '<span class="sp-contatto__testo"><span class="sp-tenue">' + etichetta + '</span><span class="sp-contatto__valore">' + SP.esc(valore) + '</span></span>' + AVANTI + '</a>';
  }

  SP.carica(['config', 'sponsor', 'storia']).then(function (d) {
    var so = (d.config && d.config.social) || {}, c = (d.config && d.config.campo) || {};
    var righe = '';
    if (so.email) { righe += contatto('mailto:' + so.email, false, 'busta', 'Email', so.email); }
    if (so.instagram) { righe += contatto('https://www.instagram.com/' + so.instagram + '/', true, 'macchina', 'Instagram', '@' + so.instagram); }
    if (so.tiktok) { righe += contatto('https://www.tiktok.com/@' + so.tiktok, true, 'nota', 'TikTok', '@' + so.tiktok); }
    $('contatti').outerHTML = righe ? '<div class="sp-sezione sp-sezione--stretta"><div class="sp-vetro sp-pannello sp-contatti sp-su">' + righe + '</div></div>' : '';

    var campo = c.nome ? '<div class="sp-invito sp-invito--colonna sp-vetro sp-su"><h2>Il campo di casa</h2>' +
      '<p>Tutte le nostre partite, casalinghe e non, si giocano qui.</p>' +
      '<p><span class="sp-forte">' + SP.esc(c.nome) + '</span>' + (c.indirizzo ? '<br><span class="sp-tenue">' + SP.esc(c.indirizzo) + '</span>' : '') + '</p>' +
      (c.maps_url ? '<a class="sp-bottone" href="' + SP.esc(c.maps_url) + '">' + SP.simbolo('segnaposto', 22) + 'Aprilo su Google Maps</a>' : '') + '</div>' : '';
    var amichevole = '<div class="sp-invito sp-invito--colonna sp-vetro sp-su"><h2>Vuoi sfidarci in amichevole?</h2>' +
      '<p>Scrivici: campo, data e ora li troviamo. Il risultato lo troviamo dopo.</p>' +
      (so.email ? '<a class="sp-bottone" href="mailto:' + SP.esc(so.email) + '">' + SP.simbolo('busta', 22) + 'Scrivici</a>' : '') + '</div>';
    $('sotto').outerHTML = '<div class="sp-due sp-contatti-due">' + campo + amichevole + '</div>';

    $('striscia').outerHTML = SP.striscia(d.sponsor);
    SP.footer($('sp-footer'), d.config, d.storia);
  }).catch(function (e) {
    if (window.console) { console.error(e); }
  }).then(function () {
    window.Shakhtar.avvia();
  });
})();
