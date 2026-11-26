/* Home: prossime partite, ultimi risultati, classifica a tre righe, marcatori, la rosa, striscia degli sponsor.
   Montaggio come la pagina di esempio PaginaHome del design system. */
(function () {
  'use strict';
  var SP = window.SP, $ = function (id) { return document.getElementById(id); };
  /* Dopo l'inizio, finche' i dati non la danno per giocata, la partita resta "In campo adesso." per al massimo
     tre ore; poi esce dalle prossime (risultato in arrivo o partita rinviata). Approvato da Nicolo' il 23 novembre 2026. */
  var IN_CAMPO_MS = 3 * 60 * 60 * 1000;

  function scheda(m, torneo, prossima, campoMaps) {
    var squadre = '<div class="sp-partita__squadre">' +
      '<div class="sp-partita__squadra">' + SP.stemma(m.casa) + SP.esc(m.casa) + '</div>' +
      '<span class="sp-partita__v">v</span>' +
      '<div class="sp-partita__squadra">' + SP.stemma(m.ospite) + SP.esc(m.ospite) + '</div></div>';
    var giorno = m.data ? SP.esc(SP.dataLunga(m.data)) + (m.ora ? '<span class="sp-partita__ora-tel">, ' + SP.ora(m.ora) + '</span>' : '') : 'Data da definire';
    var quando = '<div class="sp-partita__quando"><p class="sp-partita__torneo">' + SP.esc(torneo.nome) + '</p>' +
      '<p class="sp-partita__giorno">' + giorno + '</p>' +
      '<p class="sp-partita__campo">' + (m.data && m.ora ? '<span class="sp-partita__ora-largo">Ore ' + SP.ora(m.ora) + ', </span>' : '') + SP.esc(m.campo) + '</p></div>';
    /* Conto alla rovescia, "Dove giochiamo" e condividi: su telefono in tutte le schede (richiesta di Nicolo' del
       26 novembre 2026), su schermo largo solo nella prossima (sito.css 14 nasconde gli altri). Senza ora: al posto
       del conto "Orario da definire", solo su telefono. */
    var stato = '';
    if (m.inizio && m.inizio.ms <= Date.now()) {
      stato = '<p class="sp-in-campo sp-finestra">In campo adesso.</p>';
    } else if (m.inizio) {
      stato = '<div class="sp-conto" data-inizio="' + m.inizio.iso + '">' +
        ['giorni', 'ore', 'minuti'].map(function (n) { return '<div class="sp-conto__casella sp-finestra"><b>0</b><span>' + n + '</span></div>'; }).join('') + '</div>';
    } else {
      stato = '<p class="sp-in-campo sp-finestra sp-solo-tel">Orario da definire</p>';
    }
    var titolo = m.casa + ' v ' + m.ospite;
    var testo = [m.data ? SP.dataLunga(m.data) + (m.ora ? ', ' + SP.ora(m.ora) : '') : '', m.campo].filter(Boolean).join(', ');
    var fine = '<div class="sp-partita__fine">' + stato + '<div class="sp-partita__azioni">' +
      (campoMaps ? '<a class="sp-bottone" href="' + SP.esc(campoMaps) + '">Dove giochiamo</a>' : '') +
      '<button type="button" class="sp-condividi sp-finestra" data-condividi data-titolo="' + SP.esc(titolo) + '" data-testo="' + SP.esc(testo) +
      '" aria-label="Condividi la partita ' + SP.esc(m.casa + ' contro ' + m.ospite) + '">' + SP.simbolo('condividi') + '</button></div></div>';
    return '<article class="sp-partita sp-vetro sp-su' + (prossima ? ' sp-partita--prossima' : '') + '">' + squadre + quando + fine + '</article>';
  }

  function prossime(el, torneo, config) {
    var ora = Date.now();
    var lista = (torneo.calendario || []).filter(function (m) { return m.stato === 'da_giocare'; }).map(function (m) {
      m.inizio = SP.inizio(m.data, m.ora);
      return m;
    }).filter(function (m) { return !m.inizio || m.inizio.ms + IN_CAMPO_MS > ora; }).sort(SP.ordinaPerData);
    if (!lista.length) {
      el.outerHTML = '<div class="sp-vetro sp-vuoto sp-su"><p>Nessuna partita in programma.</p></div>';
      return;
    }
    var maps = config.campo && config.campo.maps_url;
    el.outerHTML = '<div class="sp-fila sp-partite">' + scheda(lista[0], torneo, true, maps) +
      '<div class="sp-partite__dopo">' + lista.slice(1, 5).map(function (m) { return scheda(m, torneo, false, maps); }).join('') + '</div></div>';
  }

  function classifica(el, torneo) {
    var righe = torneo.classifica || [];
    var i = righe.map(function (r) { return r.squadra; }).indexOf(SP.nostraSquadra);
    /* noi e le due squadre sopra; se siamo primi o secondi, prima, seconda e terza */
    var da = i < 0 ? 0 : Math.max(0, i - 2);
    el.outerHTML = '<div class="sp-vetro sp-classifica sp-su"><table><thead><tr><th scope="col">Pos</th><th scope="col">Squadra</th>' +
      '<th scope="col" class="sp-col-g"><abbr title="Giocate">G</abbr></th><th scope="col"><abbr title="Differenza reti">DR</abbr></th><th scope="col">Punti</th></tr></thead><tbody>' +
      righe.slice(da, da + 3).map(function (r) {
        return '<tr' + (r.squadra === SP.nostraSquadra ? ' class="sp-noi"' : '') + '><td>' + r.pos + '</td><td><span class="sp-squadra">' + SP.stemma(r.squadra) +
          SP.esc(r.squadra) + '</span></td><td>' + r.g + '</td><td>' + SP.dr(r.dr) + '</td><td>' + r.punti + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function risultati(el, torneo) {
    var giocate = (torneo.calendario || []).filter(function (m) { return m.stato === 'giocata'; }).sort(SP.ordinaPerData).reverse();
    /* "Dettagli" apre una finestra con i dettagli della partita (scelta di Nicolo' del 26 novembre 2026) */
    giocate.forEach(function (m) { SP.partite[m.id] = m; });
    el.outerHTML = giocate.length ? '<div class="sp-fila">' + giocate.slice(0, 3).map(function (m) { return SP.risultato(m, '', 'finestra'); }).join('') + '</div>' :
      '<div class="sp-vetro sp-vuoto sp-su"><p>Ancora nessuna partita giocata.</p></div>';
  }

  /* il portiere non puo' essere MVP: per la parita' conta 0, come nella pagina Statistiche */
  var mvp = function (x) { return SP.portiere(x.p) ? 0 : x.s.mvp; };
  function marcatori(el, persone, statistiche) {
    var numeri = {};
    ((statistiche && statistiche.giocatori) || []).forEach(function (s) { numeri[s.numero] = s; });
    /* a parita' di gol: piu' MVP, poi l'ordine alfabetico */
    var lista = persone.filter(function (x) { return !x.staff && numeri[x.p.numero] && numeri[x.p.numero].gol > 0; }).map(function (x) {
      x.s = numeri[x.p.numero];
      return x;
    }).sort(function (a, b) { return b.s.gol - a.s.gol || mvp(b) - mvp(a) || a.nome.localeCompare(b.nome, 'it'); });
    if (!lista.length) {
      el.outerHTML = '<div class="sp-vetro sp-vuoto sp-su"><p>Ancora nessuna partita giocata.</p></div>';
      return;
    }
    var sotto = function (x) { return SP.esc(x.p.ruolo + ', numero ' + x.p.numero); };
    var primo = lista[0];
    el.outerHTML = '<div class="sp-pila"><a class="sp-migliore sp-vetro sp-su" href="' + SP.esc(primo.link) + '">' + SP.miniatura(primo, 84) +
      '<span class="sp-persona__testo"><span class="sp-persona__sotto">Capocannoniere</span><span class="sp-persona__nome">' + SP.esc(primo.nome) +
      '</span><span class="sp-persona__sotto">' + sotto(primo) + '</span></span><span class="sp-migliore__numero">' + primo.s.gol +
      '<span class="sp-nascosto"> gol</span></span></a>' +
      (lista.length > 1 ? '<div class="sp-vetro sp-pannello sp-su">' + lista.slice(1, 3).map(function (x) {
        return '<a class="sp-persona" href="' + SP.esc(x.link) + '">' + SP.miniatura(x, 48) + '<span class="sp-persona__testo"><span class="sp-persona__nome">' +
          SP.esc(x.nome) + '</span><span class="sp-persona__sotto">' + sotto(x) + '</span></span><span class="sp-persona__numero">' + x.s.gol +
          '<span class="sp-nascosto"> gol</span></span></a>';
      }).join('') + '</div>' : '') + '</div>';
  }

  function rosa(el, link, persone) {
    link.textContent = 'Tutti e ' + persone.length;
    el.outerHTML = '<div class="sp-vetro sp-pannello sp-persone-2 sp-su">' + persone.slice(0, 6).map(function (x, i) {
      return '<a class="sp-persona' + (i >= 4 ? ' sp-persona--largo' : '') + '" href="' + SP.esc(x.link) + '">' + SP.miniatura(x, 48) +
        '<span class="sp-persona__testo"><span class="sp-persona__nome">' + SP.esc(x.nome) + '</span><span class="sp-persona__sotto">' + SP.esc(x.p.ruolo) +
        '</span></span>' + (x.staff ? '' : '<span class="sp-persona__numero">' + x.p.numero + '</span>') + '</a>';
    }).join('') + '</div>';
  }

  SP.pagina(['tornei', 'rosa', 'locandine', 'statistiche', '?media', '?dettagli'], function (d) {
    var torneo = SP.torneo(d.tornei);
    if (torneo && torneo.nostra_squadra) { SP.nostraSquadra = torneo.nostra_squadra; }
    var persone = SP.persone(d.rosa, d.locandine, d.config);
    if (torneo) {
      prossime($('prossime'), torneo, d.config);
      classifica($('classifica'), torneo);
      risultati($('risultati'), torneo);
    }
    marcatori($('marcatori'), persone, d.statistiche);
    rosa($('rosa'), $('rosa-tutti'), persone);
  });
})();
