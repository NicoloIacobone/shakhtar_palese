/* Partite (tornei.html): calendario, risultati, classifica completa, regolamento. Una pagina sola da scorrere.
   Montaggio come la pagina di esempio PaginaPartite del design system: i blocchi sono nell'ordine del telefono,
   su schermo largo li rimette a posto la griglia (sp-due--partite). */
(function () {
  'use strict';
  var SP = window.SP, $ = function (id) { return document.getElementById(id); };
  var plurale = function (n, uno, tanti) { return n + ' ' + (n === 1 ? uno : tanti); };

  function rigaCalendario(m, i, meta) {
    var classi = 'sp-cal__riga' + (i === 0 || i === meta ? ' sp-cal__riga--prima' : '') + (i >= 5 ? ' sp-oltre' : '');
    var quando = m.data ? '<b>' + SP.esc(SP.dataBreve(m.data)) + '</b><span>' + SP.esc(SP.giornoBreve(m.data) + (m.ora ? ', ' + SP.ora(m.ora) : '')) + '</span>' :
      '<b>Data da definire</b>';
    var squadra = function (nome) {
      return '<span class="sp-squadra' + (nome === SP.nostraSquadra ? ' sp-forte' : '') + '">' + SP.stemma(nome) + SP.esc(nome) + '</span>';
    };
    return '<div class="' + classi + '"><span class="sp-cal__quando">' + quando + '</span><span class="sp-cal__squadre">' + squadra(m.casa) + squadra(m.ospite) +
      '</span><span class="sp-cal__giornata">' + SP.esc(m.girone) + (m.giornata != null ? '<br>Giornata ' + SP.esc(m.giornata) : '') + '</span></div>';
  }

  function calendario(torneo) {
    var lista = (torneo.calendario || []).filter(function (m) { return m.stato === 'da_giocare'; }).sort(SP.ordinaPerData);
    if (!lista.length) {
      $('cal-nota').remove();
      $('cal').outerHTML = '<div class="sp-vetro sp-vuoto sp-su"><p>Nessuna partita in programma.</p></div>';
      return;
    }
    $('cal-nota').textContent = plurale(lista.length, 'partita da giocare', 'partite da giocare');
    var meta = Math.ceil(lista.length / 2);
    $('cal').outerHTML = '<div class="sp-vetro sp-pannello sp-calendario sp-su" id="cal" style="--sp-righe:' + meta + '">' +
      lista.map(function (m, i) { return rigaCalendario(m, i, meta); }).join('') + '</div>' +
      (lista.length > 5 ? '<a class="sp-bottone sp-bottone--vetro sp-mostra sp-mostra--tel sp-su" href="#calendario" role="button" aria-controls="cal">Mostra tutte e ' + lista.length + '</a>' : '');
  }

  function risultati(torneo) {
    var lista = (torneo.calendario || []).filter(function (m) { return m.stato === 'giocata'; }).sort(SP.ordinaPerData).reverse();
    if (!lista.length) {
      $('ris-nota').remove();
      $('ris').outerHTML = '<div class="sp-vetro sp-vuoto sp-su"><p>Ancora nessuna partita giocata.</p></div>';
      return;
    }
    var conta = { vittoria: 0, pareggio: 0, sconfitta: 0 };
    lista.forEach(function (m) { conta[SP.esito(m)]++; });
    $('ris-nota').textContent = [
      conta.vittoria ? plurale(conta.vittoria, 'vittoria', 'vittorie') : '',
      conta.pareggio ? plurale(conta.pareggio, 'pareggio', 'pareggi') : '',
      conta.sconfitta ? plurale(conta.sconfitta, 'sconfitta', 'sconfitte') : ''
    ].filter(Boolean).join(', ');
    /* su telefono i primi quattro, su schermo largo i primi sei; poi il bottone */
    $('ris').outerHTML = '<div class="sp-pila sp-griglia-2" id="ris">' + lista.map(function (m, i) {
      return SP.risultato(m, i >= 6 ? 'sp-oltre-sempre' : i >= 4 ? 'sp-oltre' : '');
    }).join('') + '</div>' +
      (lista.length > 4 ? '<a class="sp-bottone sp-bottone--vetro sp-mostra' + (lista.length > 6 ? '' : ' sp-mostra--tel') +
        ' sp-su" href="#risultati" role="button" aria-controls="ris">Mostra tutti e ' + lista.length + '</a>' : '');
  }

  function classifica(torneo) {
    var righe = torneo.classifica || [];
    $('cla-nota').textContent = plurale(righe.length, 'squadra', 'squadre');
    $('cla').outerHTML = '<div class="sp-vetro sp-classifica sp-classifica--completa sp-su"><table><thead><tr><th scope="col">Pos</th><th scope="col">Squadra</th>' +
      '<th scope="col" class="sp-col-g"><abbr title="Giocate">G</abbr></th><th scope="col"><abbr title="Vinte">V</abbr></th><th scope="col"><abbr title="Pareggiate">N</abbr></th>' +
      '<th scope="col"><abbr title="Perse">P</abbr></th><th scope="col" class="sp-col-dr"><abbr title="Differenza reti">DR</abbr></th>' +
      '<th scope="col" class="sp-col-pt"><span class="sp-tel">Pt</span><span class="sp-largo">Punti</span></th></tr></thead><tbody>' +
      righe.map(function (r) {
        return '<tr' + (r.squadra === SP.nostraSquadra ? ' class="sp-noi"' : '') + '><td>' + r.pos + '</td><td><span class="sp-squadra">' + SP.stemma(r.squadra) +
          SP.esc(r.squadra) + '</span></td><td>' + r.g + '</td><td>' + r.v + '</td><td>' + r.n + '</td><td>' + r.p + '</td><td>' + SP.dr(r.dr) + '</td><td>' + r.punti + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function regolamento(torneo) {
    var gruppi = (torneo.regolamento && torneo.regolamento.gruppi) || [];
    if (!gruppi.length) { $('regolamento').remove(); return; }
    $('reg-nota').textContent = plurale(gruppi.length, 'capitolo', 'capitoli');
    $('reg').outerHTML = '<div class="sp-vetro sp-pannello sp-su">' + gruppi.map(function (g, i) {
      return '<div class="sp-regola"><button type="button" class="sp-regola__titolo" aria-expanded="false" aria-controls="regola-' + i + '">' + SP.esc(g.titolo) +
        SP.simbolo('avanti') + '</button><ul class="sp-regola__testo" id="regola-' + i + '" hidden>' +
        (g.voci || []).map(function (v) { return '<li>' + SP.esc(v) + '</li>'; }).join('') + '</ul></div>';
    }).join('') + '</div>';
  }

  Promise.all([SP.carica(['config', 'tornei', 'sponsor', 'storia']), SP.facoltativo('media')]).then(function (r) {
    var d = r[0];
    SP.media = (r[1] && r[1].partite) || {};
    var torneo = SP.torneo(d.tornei);
    if (torneo) {
      if (torneo.nostra_squadra) { SP.nostraSquadra = torneo.nostra_squadra; }
      $('sottotitolo').textContent = [torneo.nome, torneo.stagione].filter(Boolean).join(' ');
      calendario(torneo);
      risultati(torneo);
      classifica(torneo);
      regolamento(torneo);
    }
    $('striscia').outerHTML = SP.striscia(d.sponsor);
    SP.footer($('sp-footer'), d.config, d.storia);
    SP.stemmiMancanti();
  }).catch(function (e) {
    if (window.console) { console.error(e); }
  }).then(function () {
    window.Shakhtar.avvia();
    /* arrivando da un link con l'ancora (#classifica dalla home) la sezione va raggiunta dopo che il contenuto c'e' */
    if (location.hash) { var a = document.getElementById(location.hash.slice(1)); if (a) { a.scrollIntoView(); } }
  });
})();
