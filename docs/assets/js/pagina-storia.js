/* Storia: titolo e attacco da storia.json, il carosello delle foto ("carosello": file e testo alternativo, al massimo sei),
   tutto il testo in un solo pannello (PannelloTesto), poi la striscia. Montaggio dalle sezioni "Pagine di Altro" e
   "Schermi larghi" del README del sistema e dall'anteprima del Carosello: su telefono il carosello e' a tutta larghezza
   e resta fermo sotto l'header restringendosi; su schermo largo sta nella colonna sinistra, in 4:3, e il testo a destra.
   Carosello e pannello stanno nello stesso contenitore (sp-due), cosi' il carosello resta fermo finche' c'e' testo.
   "_da_rivedere" e le note "_..." non mostrano niente. Un paragrafo vuoto non compare. */
(function () {
  'use strict';
  var SP = window.SP, $ = function (id) { return document.getElementById(id); };
  var PAUSA = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="2" width="3.5" height="12" rx="1"/><rect x="9.5" y="2" width="3.5" height="12" rx="1"/></svg>';

  function carosello(foto) {
    if (!foto.length) { return ''; }
    return '<div class="sp-carosello" role="group" aria-roledescription="carosello" aria-label="Foto della squadra"><div class="sp-carosello__pista">' +
      foto.map(function (f) { return '<img class="sp-carosello__foto" src="' + SP.esc(f.file) + '" alt="' + SP.esc(f.alt || '') + '" draggable="false">'; }).join('') +
      '</div><div class="sp-carosello__punti" aria-hidden="true"></div>' +
      '<button type="button" class="sp-tondo sp-carosello__pausa" aria-label="Metti in pausa lo scorrimento delle foto">' + PAUSA + '</button></div>';
  }

  SP.pagina([], function (d) {
    var s = d.storia || {};
    if (s.titolo) { $('titolo').textContent = s.titolo; }
    if (s.sottotitolo) { $('attacco').textContent = s.sottotitolo; } else { $('attacco').remove(); }
    var foto = (s.carosello || []).filter(function (f) { return f && f.file; }).slice(0, 6);
    var paragrafi = (s.paragrafi || []).filter(function (p) { return p && String(p).trim(); });
    $('storia').innerHTML = carosello(foto) +
      (paragrafi.length ? '<div class="sp-vetro sp-prosa sp-su">' + paragrafi.map(function (p) { return '<p>' + SP.esc(p) + '</p>'; }).join('') + '</div>' : '');
  });
})();
