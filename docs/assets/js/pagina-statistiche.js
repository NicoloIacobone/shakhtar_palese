/* Statistiche: titolo e torneo, tre numeri della squadra, "I migliori" (gol e MVP), la tabella "Tutti i giocatori".
   Montaggio come la pagina di esempio PaginaStatistiche: su schermo largo a sinistra numeri e migliori, a destra la tabella.
   Solo i giocatori (lo staff no), gli stessi della Rosa; chi non ha una riga in statistiche.json ha tutto a zero.
   I tre numeri vengono dalla nostra riga di classifica (g, gf, gs); se manca, dalle partite giocate del calendario. */
(function () {
  'use strict';
  var SP = window.SP, $ = function (id) { return document.getElementById(id); };
  var VUOTO = '<div class="sp-vetro sp-vuoto sp-su"><p>Ancora nessuna partita giocata.</p></div>';

  /* Lo stesso confronto di Shakhtar.ordina() in bundle.js, cosi' l'ordine di partenza e quello dopo un tocco su "Gol"
     coincidono: la colonna scelta, poi piu' gol, poi piu' MVP, poi il nome scritto nella riga (nome e cognome). */
  function per(chiave) {
    return function (a, b) {
      return b.s[chiave] - a.s[chiave] || b.s.gol - a.s.gol || b.s.mvp - a.s.mvp || a.nome.localeCompare(b.nome, 'it');
    };
  }

  function squadra(torneo) {
    var riga = (torneo.classifica || []).filter(function (r) { return r.squadra === SP.nostraSquadra; })[0];
    if (riga) { return { g: riga.g, gf: riga.gf, gs: riga.gs }; }
    var giocate = (torneo.calendario || []).filter(function (m) { return m.stato === 'giocata'; });
    return giocate.reduce(function (t, m) {
      var casa = m.casa === SP.nostraSquadra;
      t.gf += casa ? m.gol_casa : m.gol_ospite;
      t.gs += casa ? m.gol_ospite : m.gol_casa;
      return t;
    }, { g: giocate.length, gf: 0, gs: 0 });
  }

  function numeri(n) {
    return '<dl class="sp-numeri sp-numeri--3 sp-su">' + [['partite', n.g], ['gol fatti', n.gf], ['gol subiti', n.gs]].map(function (c) {
      return '<div class="sp-vetro"><dt>' + c[0] + '</dt><dd>' + (Number(c[1]) || 0) + '</dd></div>';
    }).join('') + '</dl>';
  }

  function migliore(x, dicitura, sotto, numero, nascosto) {
    return '<a class="sp-migliore sp-vetro sp-su sp-migliore--stretto" href="' + SP.esc(x.link) + '">' + SP.miniatura(x, 84) +
      '<span class="sp-persona__testo"><span class="sp-persona__sotto">' + dicitura + '</span><span class="sp-persona__nome">' + SP.esc(x.nome) +
      '</span><span class="sp-persona__sotto">' + SP.esc(sotto) + '</span></span><span class="sp-migliore__numero">' + numero +
      '<span class="sp-nascosto"> ' + nascosto + '</span></span></a>';
  }
  /* Capocannoniere e piu' volte MVP. Se nessuno ha ancora un MVP, il secondo riquadro non c'e' (proposta, da approvare). */
  function migliori(giocatori) {
    var gol = giocatori.slice().sort(per('gol'))[0], mvp = giocatori.slice().sort(per('mvp'))[0];
    var blocchi = '';
    if (gol && gol.s.gol > 0) {
      blocchi += migliore(gol, 'Capocannoniere', gol.p.ruolo + ', numero ' + gol.p.numero, gol.s.gol, 'gol');
    }
    if (mvp && mvp.s.mvp > 0) {
      blocchi += migliore(mvp, 'Più volte MVP', 'Scelto dall\'arbitro ' + mvp.s.mvp + (mvp.s.mvp === 1 ? ' volta' : ' volte'), mvp.s.mvp,
        mvp.s.mvp === 1 ? 'volta MVP' : 'volte MVP');
    }
    return blocchi ? '<div class="sp-pila">' + blocchi + '</div>' : VUOTO;
  }

  function tabella(giocatori) {
    var testa = '<thead><tr><th scope="col">Giocatore</th>' +
      '<th scope="col" data-nome="gol" aria-sort="descending"><button type="button">Gol</button></th>' +
      '<th scope="col" data-nome="MVP"><button type="button">MVP</button></th>' +
      '<th scope="col" data-nome="gialli"><button type="button"><abbr title="Ammonizioni"><span class="sp-tel">Gia</span><span class="sp-largo">Gialli</span></abbr></button></th>' +
      '<th scope="col" data-nome="rossi"><button type="button"><abbr title="Espulsioni"><span class="sp-tel">Ros</span><span class="sp-largo">Rossi</span></abbr></button></th></tr></thead>';
    var corpo = giocatori.slice().sort(per('gol')).map(function (x) {
      var foto = x.card ? '<img src="' + SP.esc(x.card.thumb) + '" alt="" width="32" height="32" loading="lazy">' : '';
      return '<tr><td><a class="sp-statistiche__nome" href="' + SP.esc(x.link) + '">' + foto + SP.esc(x.nome) + '</a></td>' +
        '<td class="sp-ordinata">' + x.s.gol + '</td><td>' + x.s.mvp + '</td><td>' + x.s.ammonizioni + '</td><td>' + x.s.espulsioni + '</td></tr>';
    }).join('');
    return '<div class="sp-vetro sp-pannello sp-statistiche sp-su"><table data-nota="nota-ord">' + testa + '<tbody>' + corpo + '</tbody></table></div>';
  }

  SP.carica(['config', 'tornei', 'rosa', 'locandine', 'statistiche', 'sponsor', 'storia']).then(function (d) {
    var torneo = SP.torneo(d.tornei) || {};
    if (torneo.nostra_squadra) { SP.nostraSquadra = torneo.nostra_squadra; }
    $('sottotitolo').textContent = [torneo.nome, torneo.stagione].filter(Boolean).join(' ');

    var righe = {};
    ((d.statistiche && d.statistiche.giocatori) || []).forEach(function (s) { righe[s.numero] = s; });
    var giocatori = SP.persone(d.rosa, d.locandine, d.config).filter(function (x) { return !x.staff; }).map(function (x) {
      var s = righe[x.p.numero] || {};
      x.s = { gol: Number(s.gol) || 0, mvp: Number(s.mvp) || 0, ammonizioni: Number(s.ammonizioni) || 0, espulsioni: Number(s.espulsioni) || 0 };
      return x;
    });

    var n = squadra(torneo);
    if (!(n.g > 0)) {
      /* Torneo non cominciato: la frase al posto dei numeri, dei migliori e della tabella; i titoli restano (NessunaPartita). */
      $('numeri').outerHTML = VUOTO;
      $('migliori').outerHTML = VUOTO;
      $('nota-ord').remove();
      $('tabella').outerHTML = VUOTO;
    } else {
      $('numeri').outerHTML = numeri(n);
      $('migliori').outerHTML = migliori(giocatori);
      $('tabella').outerHTML = giocatori.length ? tabella(giocatori) : VUOTO;
      if (!giocatori.length) { $('nota-ord').remove(); }
    }
    $('striscia').outerHTML = SP.striscia(d.sponsor);
    SP.footer($('sp-footer'), d.config, d.storia);
  }).catch(function (e) {
    if (window.console) { console.error(e); }
  }).then(function () {
    window.Shakhtar.avvia();
  });
})();
