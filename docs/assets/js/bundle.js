/* Shakhtar Palese · comportamenti dei componenti. Uno script classico, nessuna libreria, nessuna chiamata di rete.
   Uso: Shakhtar.avvia() a fine pagina. Ogni funzione si puo' chiamare da sola dopo aver aggiunto contenuto dai dati. */
(function () {
  'use strict';
  var doc = document;
  var html = doc.documentElement;

  /* I simboli del sito: disegni al tratto su una griglia di 24, estremita' arrotondate. Vedi il componente Simboli. */
  var SIMBOLI = {
    "casa": "<path d=\"M4 11l8-7 8 7v8a1 1 0 01-1 1h-4v-6h-6v6H5a1 1 0 01-1-1v-8z\"/>",
    "campo": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\"/><path d=\"M12 5v14\"/><circle cx=\"12\" cy=\"12\" r=\"2.6\"/>",
    "persone": "<circle cx=\"9\" cy=\"8\" r=\"3.2\"/><path d=\"M3 19.5c0-3.2 2.7-5.5 6-5.5s6 2.3 6 5.5M15.5 5a3.2 3.2 0 010 6M17.5 14.4c2 .7 3.5 2.6 3.5 5.1\"/>",
    "barre": "<path d=\"M5 20V11M12 20V4M19 20v-7\"/>",
    "quadrati": "<rect x=\"4\" y=\"4\" width=\"6.5\" height=\"6.5\" rx=\"1.5\"/><rect x=\"13.5\" y=\"4\" width=\"6.5\" height=\"6.5\" rx=\"1.5\"/><rect x=\"4\" y=\"13.5\" width=\"6.5\" height=\"6.5\" rx=\"1.5\"/><rect x=\"13.5\" y=\"13.5\" width=\"6.5\" height=\"6.5\" rx=\"1.5\"/>",
    "calendario": "<rect x=\"3.5\" y=\"5\" width=\"17\" height=\"15.5\" rx=\"2.5\"/><path d=\"M3.5 10h17M8 3v4M16 3v4\"/>",
    "podio": "<path d=\"M9 20V6h6v14M3 20v-9h6M15 20v-6h6v6M2 20h20\"/>",
    "fischietto": "<circle cx=\"8.5\" cy=\"14.5\" r=\"5.5\"/><path d=\"M8.5 9H21v4.5l-7 1.5M6 3.5l1 2M10.5 3v2.2\"/>",
    "condividi": "<path d=\"M12 15V3.5M7.5 8L12 3.5 16.5 8M6 12H5a1 1 0 00-1 1v6a1 1 0 001 1h14a1 1 0 001-1v-6a1 1 0 00-1-1h-1\"/>",
    "segnaposto": "<path d=\"M12 21s-6.5-6-6.5-11a6.5 6.5 0 0113 0c0 5-6.5 11-6.5 11z\"/><circle cx=\"12\" cy=\"10\" r=\"2.4\"/>",
    "busta": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2.5\"/><path d=\"M3.5 7.5l8.5 6 8.5-6\"/>",
    "macchina": "<path d=\"M4 8h3l1.5-2.5h7L17 8h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z\"/><circle cx=\"12\" cy=\"13\" r=\"3.5\"/>",
    "nota": "<path d=\"M9 18V5l10-2v13\"/><circle cx=\"6.5\" cy=\"18\" r=\"2.5\"/><circle cx=\"16.5\" cy=\"16\" r=\"2.5\"/>",
    "piccone": "<path d=\"M5 20L15 10M8.5 5.5c4.5-1.5 9 .5 10.5 5.5\"/>",
    "maglia": "<path d=\"M8 3L3 6l2 4 2-1v11h10V9l2 1 2-4-5-3c0 1.7-1.8 3-4 3S8 4.7 8 3z\"/>",
    "megafono": "<path d=\"M3 10v4h3l8 4V6l-8 4H3zM7 14v4.5h2.5V15.3M18 9.5a3.5 3.5 0 010 5\"/>",
    "libro": "<path d=\"M12 6C10 4.5 7 4 4 4v14c3 0 6 .5 8 2 2-1.5 5-2 8-2V4c-3 0-6 .5-8 2zM12 6v14\"/>",
    "chiudi": "<path d=\"M6 6l12 12M18 6L6 18\"/>"
  };
  /* Tre simboli hanno una griglia loro. */
  var SPECIALI = {
    "avanti": "<svg aria-hidden=\"true\" width=\"10\" height=\"16\" viewBox=\"0 0 10 16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M2 2l6 6-6 6\"/></svg>",
    "indietro": "<svg aria-hidden=\"true\" width=\"10\" height=\"16\" viewBox=\"0 0 10 16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M8 2L2 8l6 6\"/></svg>",
    "pausa": "<svg aria-hidden=\"true\" width=\"16\" height=\"16\" viewBox=\"0 0 16 16\" fill=\"currentColor\"><rect x=\"3\" y=\"2\" width=\"3.5\" height=\"12\" rx=\"1\"/><rect x=\"9.5\" y=\"2\" width=\"3.5\" height=\"12\" rx=\"1\"/></svg>",
    "riprendi": "<svg aria-hidden=\"true\" width=\"16\" height=\"16\" viewBox=\"0 0 16 16\" fill=\"currentColor\"><path d=\"M4.5 2.4v11.2a.6.6 0 00.9.5l9-5.6a.6.6 0 000-1l-9-5.6a.6.6 0 00-.9.5z\"/></svg>"
  };

  function calmo() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function tutti(sel, ambito) {
    return Array.prototype.slice.call((ambito || doc).querySelectorAll(sel));
  }

  /* simbolo('casa') -> stringa SVG. misura in px (24), tratto 1.8 (2 nelle scorciatoie). Il colore e' quello del testo intorno. */
  function simbolo(nome, misura, tratto) {
    if (SPECIALI[nome]) { return SPECIALI[nome]; }
    if (!SIMBOLI[nome]) { return ''; }
    var m = misura || 24;
    return '<svg aria-hidden="true" width="' + m + '" height="' + m + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (tratto || 1.8) +
      '" stroke-linecap="round" stroke-linejoin="round">' + SIMBOLI[nome] + '</svg>';
  }

  /* ---- Finestre: allinea il tessuto di ogni finestra a quello del fondo ----
     La posizione si prende dall'impaginazione (offsetLeft/offsetTop), non da getBoundingClientRect: cosi' non risente della comparsa. */
  function posizione(el, app) {
    var x = 0, y = 0, n = el;
    while (n && n !== app) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    if (n !== app) { var a = app.getBoundingClientRect(), r = el.getBoundingClientRect(); return { x: r.left - a.left, y: r.top - a.top }; }
    for (n = el.parentNode; n && n !== app; n = n.parentNode) { x -= n.scrollLeft || 0; y -= n.scrollTop || 0; }
    return { x: x, y: y };
  }
  function finestre(ambito) {
    tutti('.sp-finestra, .sp-noi', ambito).forEach(function (el) {
      var app = el.closest('.sp-app');
      if (!app) { return; }
      var passo = parseFloat(getComputedStyle(app).getPropertyValue('--passo-tessuto')) || 768;
      var bersaglio = el, dx = 0, dy = 0;
      if (el.classList.contains('sp-noi')) {
        bersaglio = el.querySelector('td');
        if (!bersaglio) { return; }
        var ps = getComputedStyle(bersaglio, '::before');
        dx = parseFloat(ps.left) || 0; dy = parseFloat(ps.top) || 0;
      }
      var p = posizione(bersaglio, app);
      var fx = -(((p.x + dx) % passo) + passo) % passo, fy = -(((p.y + dy) % passo) + passo) % passo;
      el.style.setProperty('--sp-fx', Math.round(fx) + 'px');
      el.style.setProperty('--sp-fy', Math.round(fy) + 'px');
    });
  }
  var inAttesa = false;
  function finestrePresto() {
    if (inAttesa) { return; }
    inAttesa = true;
    (window.requestAnimationFrame || setTimeout)(function () { inAttesa = false; finestre(); });
  }

  /* ---- Comparsa: titoli (.sp-tenda) e blocchi (.sp-su) partono quando entrano nello schermo di 24 px ---- */
  function comparsa(ambito) {
    var els = tutti('.sp-su:not(.sp-ok), .sp-tenda:not(.sp-ok)', ambito);
    if (!els.length) { return; }
    if (calmo() || !('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('sp-ok'); }); return; }
    var primoGiro = true;
    var io = new IntersectionObserver(function (voci) {
      var entrate = voci.filter(function (v) { return v.isIntersecting; });
      if (primoGiro) {
        entrate.sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left; });
      }
      entrate.forEach(function (v, i) {
        if (primoGiro && i > 0) { v.target.classList.add('sp-r' + Math.min(i, 4)); }
        v.target.classList.add('sp-ok');
        io.unobserve(v.target);
      });
      primoGiro = false;
    }, { rootMargin: '0px 0px -24px 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---- La striscia dell'header si disegna solo quando si arriva sul sito, non a ogni pagina ---- */
  function striscia(ambito) {
    var h = (ambito || doc).querySelector('.sp-header');
    if (!h) { return; }
    var gia = false;
    try { gia = window.sessionStorage.getItem('sp-striscia') === '1'; window.sessionStorage.setItem('sp-striscia', '1'); } catch (e) { /* senza memoria si disegna ogni volta */ }
    if (!gia) { h.classList.add('sp-header--entra'); }
  }

  /* ---- Conto alla rovescia: <div class="sp-conto" data-inizio="2026-11-30T20:00:00+01:00"> con tre <b> ---- */
  function conto(el) {
    var inizio = new Date(el.getAttribute('data-inizio')).getTime();
    if (isNaN(inizio)) { return; }
    var caselle = tutti('.sp-conto__casella', el);
    var nomi = [['giorno', 'giorni'], ['ora', 'ore'], ['minuto', 'minuti']];
    function aggiorna() {
      if (!el.isConnected) { return; }
      var ms = inizio - Date.now();
      if (ms <= 0) {
        var p = doc.createElement('p');
        p.className = 'sp-in-campo sp-finestra';
        p.textContent = 'In campo adesso.';
        el.replaceWith(p);
        finestre(p.parentNode);
        return;
      }
      var minuti = Math.floor(ms / 60000);
      var v = [Math.floor(minuti / 1440), Math.floor((minuti % 1440) / 60), minuti % 60];
      caselle.forEach(function (c, i) {
        var b = c.querySelector('b'), s = c.querySelector('span');
        if (b) { b.textContent = v[i]; }
        if (s) { s.textContent = nomi[i][v[i] === 1 ? 0 : 1]; }
      });
      setTimeout(aggiorna, 60000 - (Date.now() % 60000) + 50);
    }
    aggiorna();
  }

  /* ---- Avviso breve che sparisce da solo ---- */
  function avviso(testo, ambito) {
    var app = (ambito && ambito.closest && ambito.closest('.sp-app')) || doc.querySelector('.sp-app') || doc.body;
    var zona = app.querySelector('.sp-avvisi');
    if (!zona) {
      zona = doc.createElement('div');
      zona.className = 'sp-avvisi';
      zona.setAttribute('role', 'status');
      zona.setAttribute('aria-live', 'polite');
      app.appendChild(zona);
    }
    var a = doc.createElement('div');
    a.className = 'sp-avviso';
    a.textContent = testo;
    zona.appendChild(a);
    void a.offsetWidth;
    a.classList.add('sp-ok');
    setTimeout(function () { a.classList.remove('sp-ok'); setTimeout(function () { a.remove(); }, 300); }, 2600);
    return a;
  }

  /* ---- Condividi: finestra del sistema; dove manca copia il link e lo dice ---- */
  function condividi(bottone) {
    var dati = { title: bottone.getAttribute('data-titolo') || doc.title, text: bottone.getAttribute('data-testo') || '', url: bottone.getAttribute('data-url') || window.location.href };
    if (navigator.share) {
      navigator.share(dati).catch(function () { /* chiusa dall'utente: niente da dire */ });
      return;
    }
    var fatto = function () { avviso('Link copiato.', bottone); };
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(dati.url).then(fatto, fatto); } else { fatto(); }
  }

  /* ---- Carosello della Storia ---- */
  function carosello(el) {
    var pista = el.querySelector('.sp-carosello__pista');
    var foto = tutti('.sp-carosello__foto', el);
    var punti = el.querySelector('.sp-carosello__punti');
    var pausa = el.querySelector('.sp-carosello__pausa');
    if (!pista || foto.length < 2) { if (pausa) { pausa.hidden = true; } return; }
    var i = 0, fermo = false, x0 = null, timer = null;
    if (punti) { punti.innerHTML = foto.map(function () { return '<span></span>'; }).join(''); }
    function vai(n) {
      i = (n + foto.length) % foto.length;
      pista.style.transform = 'translateX(' + (-100 * i) + '%)';
      if (punti) { tutti('span', punti).forEach(function (p, k) { p.classList.toggle('sp-ora', k === i); }); }
      foto.forEach(function (f, k) { f.setAttribute('aria-hidden', k === i ? 'false' : 'true'); });
    }
    function parti() { clearInterval(timer); if (!calmo() && !fermo) { timer = setInterval(function () { if (!doc.hidden) { vai(i + 1); } }, 4000); } }
    if (pausa) {
      if (calmo()) { pausa.hidden = true; }
      pausa.addEventListener('click', function () {
        fermo = !fermo;
        pausa.innerHTML = simbolo(fermo ? 'riprendi' : 'pausa');
        pausa.setAttribute('aria-label', fermo ? 'Riprendi lo scorrimento delle foto' : 'Metti in pausa lo scorrimento delle foto');
        parti();
      });
    }
    function giu(ev) { x0 = ev.touches ? ev.touches[0].clientX : ev.clientX; }
    function su(ev) {
      if (x0 === null) { return; }
      var x = ev.changedTouches ? ev.changedTouches[0].clientX : ev.clientX, dx = x - x0;
      x0 = null;
      if (Math.abs(dx) > 40) { vai(i + (dx < 0 ? 1 : -1)); parti(); }
    }
    el.addEventListener('touchstart', giu, { passive: true });
    el.addEventListener('touchend', su);
    el.addEventListener('mousedown', giu);
    el.addEventListener('mouseup', su);
    /* su telefono si restringe tra il momento in cui tocca l'header e 180 px dopo */
    function intervallo() {
      var scr = el.parentNode;
      while (scr && scr !== doc.body && !/(auto|scroll)/.test(getComputedStyle(scr).overflowY)) { scr = scr.parentNode; }
      var su = scr && scr !== doc.body ? el.getBoundingClientRect().top - scr.getBoundingClientRect().top + scr.scrollTop : el.getBoundingClientRect().top + window.pageYOffset;
      var da = Math.max(0, Math.round(su - (parseFloat(getComputedStyle(el).top) || 0)));
      el.style.setProperty('--sp-carosello-da', da + 'px');
      el.style.setProperty('--sp-carosello-a', (da + 180) + 'px');
    }
    if (!(window.scrollY > 0)) { intervallo(); }
    window.addEventListener('resize', function () { if (!(window.scrollY > 0)) { intervallo(); } });
    vai(0);
    parti();
  }

  /* ---- Tabella delle statistiche: un tocco su un'intestazione riordina ---- */
  function ordina(tabella) {
    var corpo = tabella.tBodies[0];
    var teste = tutti('thead th', tabella);
    var nota = tabella.getAttribute('data-nota') ? doc.getElementById(tabella.getAttribute('data-nota')) : null;
    function numero(riga, col) { return parseFloat(riga.cells[col].textContent) || 0; }
    function per(col) {
      var righe = tutti('tr', corpo);
      righe.sort(function (a, b) {
        /* a parita' vale la regola dei marcatori: piu' gol, poi piu' MVP, poi l'alfabeto */
        return numero(b, col) - numero(a, col) || numero(b, 1) - numero(a, 1) || numero(b, 2) - numero(a, 2) ||
          a.cells[0].textContent.trim().localeCompare(b.cells[0].textContent.trim(), 'it');
      });
      righe.forEach(function (r) {
        corpo.appendChild(r);
        tutti('td', r).forEach(function (td, k) { td.classList.toggle('sp-ordinata', k === col); });
      });
      teste.forEach(function (th, k) { if (k === col) { th.setAttribute('aria-sort', 'descending'); } else { th.removeAttribute('aria-sort'); } });
      if (nota) { nota.textContent = 'ordinati per ' + (teste[col].getAttribute('data-nome') || teste[col].textContent.trim().toLowerCase()); }
    }
    teste.forEach(function (th, k) {
      var b = th.querySelector('button');
      if (b) { b.addEventListener('click', function () { per(k); }); }
    });
  }

  /* ---- Voci del regolamento: aprono e chiudono il loro testo ---- */
  function regole(ambito) {
    tutti('.sp-regola__titolo', ambito).forEach(function (b) {
      if (b.dataset.spPronto) { return; }
      b.dataset.spPronto = '1';
      b.addEventListener('click', function () {
        var aperta = b.getAttribute('aria-expanded') === 'true';
        var testo = doc.getElementById(b.getAttribute('aria-controls'));
        b.setAttribute('aria-expanded', aperta ? 'false' : 'true');
        if (testo) { testo.hidden = aperta; }
        finestrePresto();
      });
    });
  }

  /* ---- "Mostra tutte": scopre le righe con classe sp-oltre del blocco indicato da aria-controls ---- */
  function mostra(ambito) {
    tutti('.sp-mostra[aria-controls]', ambito).forEach(function (b) {
      if (b.dataset.spPronto) { return; }
      b.dataset.spPronto = '1';
      b.addEventListener('click', function (ev) {
        var blocco = doc.getElementById(b.getAttribute('aria-controls'));
        if (!blocco) { return; }
        ev.preventDefault();
        blocco.classList.add('sp-aperto');
        b.hidden = true;
        comparsa(blocco);
        finestrePresto();
      });
    });
  }

  /* ---- Grafico delle caratteristiche: cinque assi da 1 a 10 ----
     assi = [{ righe: ['Lunghezza capelli'], valore: 10 }, ...] nell'ordine: in alto, a destra, in basso a destra, in basso a sinistra, a sinistra. */
  function radar(svg, assi, nome) {
    var cx = 155.5, cy = 122, R = 80, n = 5;
    function punto(k, v) {
      var a = -Math.PI / 2 + k * 2 * Math.PI / n, r = R * v / 10;
      return (Math.round((cx + r * Math.cos(a)) * 10) / 10) + ',' + (Math.round((cy + r * Math.sin(a)) * 10) / 10);
    }
    function giro(v) { var p = []; for (var k = 0; k < n; k++) { p.push(punto(k, typeof v === 'number' ? v : v[k])); } return p.join(' '); }
    var valori = assi.map(function (a) { return Math.max(0, Math.min(10, Number(a.valore) || 0)); });
    var raggi = '';
    for (var k = 0; k < n; k++) { raggi += 'M' + cx + ' ' + cy + 'L' + punto(k, 10).replace(',', ' '); }
    var posti = [{ x: 155.5, y: 26, a: 'middle' }, { x: 240, y: 90, a: 'start' }, { x: 212, y: 208, a: 'middle' }, { x: 100, y: 208, a: 'middle' }, { x: 71, y: 90, a: 'end' }];
    var testi = assi.map(function (a, k) {
      var p = posti[k], righe = a.righe || [a.nome || ''];
      var dentro = righe.map(function (r, j) {
        var ultimo = j === righe.length - 1;
        return '<tspan x="' + p.x + '"' + (j ? ' dy="16"' : '') + '>' + r + (ultimo ? ' <tspan font-weight="700">' + valori[k] + '</tspan>' : '') + '</tspan>';
      }).join('');
      return '<text x="' + p.x + '" y="' + p.y + '" text-anchor="' + p.a + '">' + dentro + '</text>';
    }).join('');
    svg.setAttribute('viewBox', '0 0 311 236');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Grafico delle caratteristiche' + (nome ? ' di ' + nome : '') + ': ' + assi.map(function (a, k) { return (a.righe || [a.nome]).join(' ').toLowerCase() + ' ' + valori[k]; }).join(', '));
    svg.innerHTML = '<polygon class="sp-radar__griglia" points="' + giro(10) + '"/><polygon class="sp-radar__griglia" points="' + giro(5) + '"/>' +
      '<path class="sp-radar__griglia" d="' + raggi + '"/><polygon class="sp-radar__valori" points="' + giro(valori) + '"/>' +
      '<g class="sp-radar__punti">' + valori.map(function (v, k) { var c = punto(k, v).split(','); return '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="3.5"/>'; }).join('') + '</g>' + testi;
  }

  /* ---- Card a tutto schermo ---- */
  function card(link) {
    var img = link.querySelector('img');
    var velo = doc.createElement('div');
    velo.className = 'sp-card-piena';
    velo.setAttribute('role', 'dialog');
    velo.setAttribute('aria-modal', 'true');
    velo.setAttribute('aria-label', img ? img.alt : 'Card');
    velo.innerHTML = '<img src="' + (link.getAttribute('href') || (img && img.src)) + '" alt="' + (img ? img.alt.replace(/"/g, '&quot;') : '') + '">' +
      '<button type="button" class="sp-tondo" aria-label="Chiudi">' + simbolo('chiudi') + '</button>';
    function chiudi() { velo.remove(); doc.removeEventListener('keydown', tasto); link.focus(); }
    function tasto(ev) { if (ev.key === 'Escape') { chiudi(); } }
    velo.addEventListener('click', chiudi);
    doc.addEventListener('keydown', tasto);
    (link.closest('.sp-app') || doc.body).appendChild(velo);
    velo.querySelector('button').focus();
  }

  /* ---- Avvio ---- */
  var ascolta = false;
  function avvia(ambito) {
    html.classList.add('sp-js');
    striscia(ambito);
    tutti('.sp-conto[data-inizio]', ambito).forEach(conto);
    tutti('.sp-carosello', ambito).forEach(carosello);
    tutti('.sp-statistiche table', ambito).forEach(ordina);
    regole(ambito);
    mostra(ambito);
    tutti('.sp-condividi[data-condividi], .sp-tondo[data-condividi]', ambito).forEach(function (b) { b.addEventListener('click', function () { condividi(b); }); });
    tutti('a.sp-card', ambito).forEach(function (a) { a.addEventListener('click', function (ev) { ev.preventDefault(); card(a); }); });
    finestre(ambito);
    comparsa(ambito);
    if (!ascolta) {
      ascolta = true;
      window.addEventListener('resize', finestrePresto);
      window.addEventListener('load', finestrePresto);
      doc.addEventListener('scroll', function (ev) { if (ev.target && ev.target.classList && ev.target.classList.contains('sp-fila')) { finestrePresto(); } }, true);
      if (doc.fonts && doc.fonts.ready) { doc.fonts.ready.then(finestrePresto); }
      if ('ResizeObserver' in window) { var ro = new ResizeObserver(finestrePresto); tutti('.sp-app').forEach(function (a) { ro.observe(a); }); }
    }
  }

  window.Shakhtar = { avvia: avvia, simbolo: simbolo, simboli: Object.keys(SIMBOLI).concat(Object.keys(SPECIALI)), finestre: finestre, comparsa: comparsa, conto: conto,
    carosello: carosello, avviso: avviso, condividi: condividi, ordina: ordina, regole: regole, mostra: mostra, radar: radar, card: card };
})();
