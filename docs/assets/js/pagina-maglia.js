/* Maglia: titolo e attacco, il simulatore 3D in una cornice con i quattro comandi sotto (Fronte, Retro, Profilo, Giro),
   poi "Dove stanno gli sponsor" e la striscia. Su schermo largo le due colonne sono invertite (sp-due--inverso):
   il simulatore nella colonna larga a sinistra.

   Il simulatore (assets/maglia/simulatore.html) non si tocca: ordine di Nicolo' del 23 novembre 2026.
   Ha i suoi bottoni (Fronte, Retro, Lato, Giro 360°) e nessun modo di essere comandato da fuori. Scelta di Nicolo'
   del 23 novembre 2026: i quattro comandi del sistema stanno fuori e premono quelli interni; la barra interna la
   nasconde questa pagina, mentre gira, con una regola aggiunta al documento dell'iframe. Il file resta identico.
   Lo stato premuto dei comandi copia quello dei bottoni interni (trascinando la maglia si spengono tutti).
   Se il browser non ha il 3D (il simulatore mostra il suo avviso #nogl) i comandi spariscono.

   "Dove stanno gli sponsor": una riga per sponsor attivo, nell'ordine di sponsor.json (nome e logo da li'),
   agganciato per id a maglia.json per la larghezza. Testo: posizione_maglia + ", N cm", con la virgola per i decimali,
   senza arrotondare. Senza larghezza resta solo la posizione: i centimetri non si inventano. */
(function () {
  'use strict';
  var SP = window.SP, $ = function (id) { return document.getElementById(id); };

  /* ---------- i quattro comandi ---------- */
  var comandi = $('comandi'), cornice = $('simulatore'), dentro = null;
  function interno(vista) {
    if (!dentro) { return null; }
    return vista === 'giro' ? dentro.getElementById('spin') : dentro.querySelector('.views [data-view="' + vista + '"]');
  }
  function copiaStato() {
    Array.prototype.forEach.call(comandi.querySelectorAll('[data-vista]'), function (b) {
      var i = interno(b.getAttribute('data-vista'));
      if (i) { b.setAttribute('aria-pressed', i.getAttribute('aria-pressed') === 'true' ? 'true' : 'false'); }
    });
  }
  function prepara() {
    var d;
    try { d = cornice.contentDocument; } catch (e) { return; }
    if (!d || dentro === d || !d.querySelector('.views')) { return; }
    dentro = d;
    var stile = d.createElement('style');
    stile.textContent = '.views{display:none!important}';
    d.head.appendChild(stile);
    var nogl = d.getElementById('nogl');
    if (nogl && !nogl.hidden) { comandi.hidden = true; return; }
    var osserva = new MutationObserver(copiaStato);
    Array.prototype.forEach.call(d.querySelectorAll('.views button'), function (b) {
      osserva.observe(b, { attributes: true, attributeFilter: ['aria-pressed'] });
    });
    copiaStato();
  }
  comandi.addEventListener('click', function (e) {
    var b = e.target.closest('[data-vista]');
    var i = b && interno(b.getAttribute('data-vista'));
    if (i) { i.click(); }
  });
  cornice.addEventListener('load', prepara);
  if (cornice.contentDocument && cornice.contentDocument.readyState === 'complete') { prepara(); }

  /* ---------- dove stanno gli sponsor ---------- */
  function cm(n) {
    n = Number(n);
    return n > 0 ? String(n).replace('.', ',') + '\u00a0cm' : '';  /* spazio che non va a capo: "31" e "cm" restano insieme */
  }
  function riga(s, larghezza) {
    var dove = [s.posizione_maglia, cm(larghezza)].filter(Boolean).join(', ');
    return '<div class="sp-maglia-riga">' +
      (s.logo ? '<span class="sp-logo-nero"><img src="' + SP.esc(s.logo) + '" alt=""></span>' : '') +
      '<span><span class="sp-forte">' + SP.esc(s.nome) + '</span>' + (dove ? '<span class="sp-tenue">' + SP.esc(dove) + '</span>' : '') +
      '</span></div>';
  }

  SP.carica(['config', 'sponsor', 'storia', 'maglia']).then(function (d) {
    var larghezze = {};
    ((d.maglia && d.maglia.elementi) || []).forEach(function (e) {
      if (e && e.logo && !(e.logo in larghezze)) { larghezze[e.logo] = e.larghezza; }
    });
    var attivi = ((d.sponsor && d.sponsor.sponsor) || []).filter(function (s) { return s.attivo !== false && s.nome; });
    $('dove').outerHTML = attivi.length ?
      '<section class="sp-sezione"><div class="sp-titolo-sezione"><h2 class="sp-tenda">Dove stanno gli sponsor</h2></div>' +
      '<div class="sp-vetro sp-pannello sp-su">' + attivi.map(function (s) { return riga(s, larghezze[s.id]); }).join('') + '</div></section>' : '';
    $('striscia').outerHTML = SP.striscia(d.sponsor);
    SP.footer($('sp-footer'), d.config, d.storia);
  }).catch(function (e) {
    if (window.console) { console.error(e); }
  }).then(function () {
    window.Shakhtar.avvia();
  });
})();
