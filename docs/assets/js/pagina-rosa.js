/* Rosa: tutte le persone divise in gruppi (Portiere, Difensori, Centrocampisti, Attaccanti, Staff), ognuno un pannello di vetro.
   Montaggio come la pagina di esempio PaginaRosa: su schermo largo due colonne uguali, a sinistra i primi tre gruppi,
   a destra attaccanti e staff. Sotto il nome la battuta di ruolo_sigla; lo staff non ha numero. */
(function () {
  'use strict';
  var SP = window.SP, $ = function (id) { return document.getElementById(id); };
  var GRUPPI = [
    { ruolo: 'Portiere', uno: 'Portiere', tanti: 'Portieri' },
    { ruolo: 'Difensore', uno: 'Difensore', tanti: 'Difensori' },
    { ruolo: 'Centrocampista', uno: 'Centrocampista', tanti: 'Centrocampisti' },
    { ruolo: 'Attaccante', uno: 'Attaccante', tanti: 'Attaccanti' }
  ];

  function riga(x) {
    return '<a class="sp-persona" href="' + SP.esc(x.link) + '">' + SP.miniatura(x, 48) + '<span class="sp-persona__testo"><span class="sp-persona__nome">' +
      SP.esc(x.nome) + '</span><span class="sp-persona__sotto">' + SP.esc(x.p.ruolo_sigla || x.p.ruolo || '') + '</span></span>' +
      (x.staff ? '' : '<span class="sp-persona__numero">' + SP.esc(x.p.numero) + '</span>') + '</a>';
  }
  function gruppo(titolo, lista) {
    if (!lista.length) { return ''; }
    return '<section class="sp-sezione"><div class="sp-titolo-sezione"><h2 class="sp-tenda">' + SP.esc(titolo) + '</h2></div>' +
      '<div class="sp-vetro sp-pannello sp-su">' + lista.map(riga).join('') + '</div></section>';
  }

  SP.carica(['config', 'rosa', 'locandine', 'sponsor', 'storia']).then(function (d) {
    var persone = SP.persone(d.rosa, d.locandine, d.config);
    var giocatori = persone.filter(function (x) { return !x.staff; });
    var staff = persone.filter(function (x) { return x.staff; });
    var blocchi = GRUPPI.map(function (g) {
      var lista = giocatori.filter(function (x) { return x.p.ruolo === g.ruolo; });
      return gruppo(lista.length === 1 ? g.uno : g.tanti, lista);
    });
    $('sottotitolo').textContent = [
      giocatori.length ? giocatori.length + (giocatori.length === 1 ? ' giocatore' : ' giocatori') : '',
      staff.length ? staff.length + ' dello staff' : ''
    ].filter(Boolean).join(' e ');
    $('gruppi').outerHTML = '<div class="sp-due sp-due--pari sp-rosa"><div class="sp-colonna">' + blocchi.slice(0, 3).join('') + '</div>' +
      '<div class="sp-colonna">' + blocchi[3] + gruppo('Staff', staff) + '</div></div>';
    $('striscia').outerHTML = SP.striscia(d.sponsor);
    SP.footer($('sp-footer'), d.config, d.storia);
  }).catch(function (e) {
    if (window.console) { console.error(e); }
  }).then(function () {
    window.Shakhtar.avvia();
  });
})();
