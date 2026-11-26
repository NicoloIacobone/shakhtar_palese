/* Scheda di una persona: giocatore.html?id=tesser-8 (l'id e' quello di locandine.json).
   Montaggio come la pagina di esempio PaginaGiocatore: ritorno alla Rosa, card intera (un tocco la apre a tutto schermo),
   nome con condividi, ruolo e numero, battuta, quattro numeri, caratteristiche, "In breve".
   Lo staff (approvato da Nicolo' il 23 novembre 2026) ha la stessa scheda senza numeri e senza caratteristiche. */
(function () {
  'use strict';
  var SP = window.SP, $ = function (id) { return document.getElementById(id); };
  /* Gli assi del grafico, nell'ordine e con le parole della pagina di esempio del sistema. */
  var ASSI = [
    { k: 'lunghezza_capelli', righe: ['Lunghezza capelli'] },
    { k: 'lunghezza_pene', righe: ['Lunghezza', 'pene'] },
    { k: 'fame_gol', righe: ['Fame di gol'] },
    { k: 'fiducia_presidente', righe: ['Fiducia del', 'presidente'] },
    { k: 'fiducia_allenatore', righe: ['Fiducia', 'allenatore'] }
  ];
  var CAMPI = [
    ['soprannome', 'Soprannome'], ['piede', 'Piede'], ['provenienza', 'Provenienza'], ['classe', 'Classe'],
    ['posizione_preferita', 'Posizione preferita'], ['frase_preferita', 'Frase preferita'], ['superstizione', 'Superstizione'],
    ['rito_post_allenamento', 'Rito post allenamento'], ['skill_fuori_campo', 'Skill fuori dal campo']
  ];
  /* le virgolette dentro un valore diventano caporali */
  var caporali = function (s) { return String(s).replace(/"([^"]*)"/g, '«$1»'); };

  function scheda(x, statistiche) {
    var p = x.p, giocatore = !x.staff;
    var ruolo = giocatore ? p.ruolo + ', numero ' + p.numero : p.ruolo;
    document.title = x.nome + ' — Shakhtar Palese';
    var card = '<a class="sp-card sp-su" href="' + SP.esc(x.card.web) + '" aria-label="Apri la card a tutto schermo"><img src="' + SP.esc(x.card.web) +
      '" alt="Card di presentazione di ' + SP.esc(x.nome + ', ' + (giocatore ? 'numero ' + p.numero : p.ruolo)) + '" width="' + x.card.web_w + '" height="' + x.card.web_h + '"></a>';
    var nome = '<div class="sp-scheda-nome sp-su"><div><h1 class="sp-h1">' + SP.esc(x.nome) + '</h1><p class="sp-scheda-nome__ruolo">' + SP.esc(ruolo) + '</p>' +
      (p.ruolo_sigla ? '<p class="sp-scheda-nome__battuta">' + SP.esc(p.ruolo_sigla) + '</p>' : '') + '</div>' +
      '<button type="button" class="sp-tondo" data-condividi data-titolo="' + SP.esc(x.nome) + '" aria-label="Condividi la scheda di ' + SP.esc(x.nome) + '">' +
      SP.simbolo('condividi') + '</button></div>';
    var numeri = '', radar = '';
    if (giocatore) {
      var s = ((statistiche && statistiche.giocatori) || []).filter(function (g) { return g.numero === p.numero; })[0] || {};
      numeri = '<dl class="sp-numeri sp-su">' + [['gol', s.gol], ['MVP', s.mvp], ['gialli', s.ammonizioni], ['rossi', s.espulsioni]].map(function (n) {
        return '<div class="sp-vetro"><dt>' + n[0] + '</dt><dd>' + (Number(n[1]) || 0) + '</dd></div>';
      }).join('') + '</dl>';
      if (p.caratteristiche) {
        radar = '<section class="sp-sezione"><div class="sp-titolo-sezione"><h2 class="sp-tenda">Caratteristiche</h2><span class="sp-tenue">da 1 a 10</span></div>' +
          '<div class="sp-vetro sp-radar sp-su"><svg id="radar"></svg></div></section>';
      }
    }
    /* "In breve": un campo vuoto non compare; i primi cinque a sinistra su schermo largo */
    var righe = CAMPI.filter(function (c) { return p[c[0]] !== undefined && p[c[0]] !== null && String(p[c[0]]).trim() !== ''; }).map(function (c) {
      return '<div class="sp-inbreve__riga"><dt>' + c[1] + '</dt><dd>' + SP.esc(caporali(p[c[0]])) + '</dd></div>';
    });
    var inbreve = righe.length ? '<section class="sp-sezione"><div class="sp-titolo-sezione"><h2 class="sp-tenda">In breve</h2></div>' +
      '<div class="sp-vetro sp-pannello sp-inbreve sp-su"><dl>' + righe.slice(0, 5).join('') + '</dl>' + (righe.length > 5 ? '<dl>' + righe.slice(5).join('') + '</dl>' : '') +
      '</div></section>' : '';
    $('scheda').outerHTML = '<div class="sp-scheda">' + card + '<div class="sp-scheda-testa">' + nome + numeri + radar + '</div></div>' + inbreve;
    if (radar) {
      window.Shakhtar.radar($('radar'), ASSI.map(function (a) { return { righe: a.righe, valore: p.caratteristiche[a.k] }; }), x.nome);
    }
  }

  var id = new URLSearchParams(location.search).get('id');
  SP.carica(['config', 'rosa', 'locandine', 'statistiche', 'sponsor', 'storia']).then(function (d) {
    var x = SP.persone(d.rosa, d.locandine, d.config).filter(function (y) { return y.card && y.card.id === id; })[0];
    if (!x) {
      /* indirizzo sbagliato o persona non ancora presentata: si torna alla Rosa */
      location.replace('rosa.html');
      return;
    }
    scheda(x, d.statistiche);
    $('striscia').outerHTML = SP.striscia(d.sponsor);
    SP.footer($('sp-footer'), d.config, d.storia);
  }).catch(function (e) {
    if (window.console) { console.error(e); }
  }).then(function () {
    window.Shakhtar.avvia();
  });
})();
