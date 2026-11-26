/* Shakhtar Palese · funzioni comuni del sito.
   I contenuti arrivano tutti da data/*.json. Il disegno e i comportamenti sono quelli del design system
   (bundle.css, bundle.js): qui si legge solo dai dati e si scrive l'HTML dei componenti, uguale alle anteprime.
   Ogni pagina ha il suo script, che alla fine chiama Shakhtar.avvia() una volta sola. */
(function () {
  'use strict';

  var SP = {};

  /* ---------- testo ---------- */
  SP.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  /* "La Breda" -> "la-breda", "Jalapeños" -> "jalapenos", "De Tullio" -> "de-tullio" */
  SP.slug = function (s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  };
  SP.iniziali = function (nome) {
    var parole = String(nome || '').trim().split(/\s+/).filter(Boolean);
    return parole.slice(0, 2).map(function (p) { return p.charAt(0).toUpperCase(); }).join('');
  };

  /* ---------- dati ---------- */
  SP.json = function (nome) {
    return fetch('data/' + nome + '.json', { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) { throw new Error('data/' + nome + '.json: ' + r.status); }
      return r.json();
    });
  };
  SP.carica = function (nomi) {
    return Promise.all(nomi.map(SP.json)).then(function (lista) {
      var d = {};
      nomi.forEach(function (n, i) { d[n] = lista[i]; });
      return d;
    });
  };
  /* Un file che puo' mancare (media.json): se non c'e' o non si legge, la pagina va avanti senza. */
  SP.facoltativo = function (nome) {
    return SP.json(nome).catch(function (e) { if (window.console) { console.warn(e); } return null; });
  };
  SP.torneo = function (tornei) {
    var lista = (tornei && tornei.tornei) || [];
    return lista.filter(function (t) { return t.id === tornei.corrente; })[0] || lista[0] || null;
  };

  /* ---------- date e orari (regole della voce: 21.00, "Lunedì 30 novembre", "30 nov", "lun, 20.00") ---------- */
  var GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
  var GIORNI_BREVI = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
  var MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  var MESI_BREVI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  function parti(data) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data || '');
    if (!m) { return null; }
    var y = +m[1], mo = +m[2], d = +m[3];
    return { y: y, mo: mo, d: d, gs: new Date(Date.UTC(y, mo - 1, d)).getUTCDay() };
  }
  SP.ora = function (ora) { return String(ora || '').replace(':', '.'); };
  SP.dataLunga = function (data) {
    var p = parti(data);
    if (!p) { return ''; }
    var g = GIORNI[p.gs];
    return g.charAt(0).toUpperCase() + g.slice(1) + ' ' + p.d + ' ' + MESI[p.mo - 1];
  };
  SP.dataMedia = function (data) { var p = parti(data); return p ? p.d + ' ' + MESI[p.mo - 1] : ''; };
  SP.dataBreve = function (data) { var p = parti(data); return p ? p.d + ' ' + MESI_BREVI[p.mo - 1] : ''; };
  SP.giornoBreve = function (data) { var p = parti(data); return p ? GIORNI_BREVI[p.gs] : ''; };
  /* Inizio di una partita nell'ora italiana, con lo scarto giusto d'inverno (+01:00) e d'estate (+02:00).
     L'ora legale va dall'ultima domenica di marzo all'ultima domenica di ottobre, alle 01:00 UTC. */
  function ultimaDomenica(y, mese0) {
    var fine = new Date(Date.UTC(y, mese0 + 1, 0));
    return Date.UTC(y, mese0, fine.getUTCDate() - fine.getUTCDay(), 1);
  }
  SP.inizio = function (data, ora) {
    var p = parti(data), o = /^(\d{1,2}):(\d{2})$/.exec(ora || '');
    if (!p || !o) { return null; }
    var inverno = Date.UTC(p.y, p.mo - 1, p.d, +o[1] - 1, +o[2]);
    var estate = inverno >= ultimaDomenica(p.y, 2) && inverno < ultimaDomenica(p.y, 9);
    var ms = estate ? inverno - 3600000 : inverno;
    var hh = ('0' + o[1]).slice(-2);
    return { ms: ms, iso: data + 'T' + hh + ':' + o[2] + ':00' + (estate ? '+02:00' : '+01:00') };
  };

  /* ---------- partite ---------- */
  SP.nostraSquadra = 'Shakhtar Palese';
  /* Stemma in un riquadro quadrato. Il nostro e' lo stemma a colori; le avversarie stanno in assets/stemmi/<nome>.png.
     Se il file non c'e', SP.stemmiMancanti() mette il tondo con le iniziali. alt: vuoto accanto al nome scritto. */
  SP.stemma = function (nome, alt) {
    var a = alt ? SP.esc(nome) : '';
    if (nome === SP.nostraSquadra) {
      return '<img class="sp-stemma" src="assets/img/stemma-colori-512.png" alt="' + a + '">';
    }
    return '<img class="sp-stemma" src="assets/stemmi/' + SP.slug(nome) + '.png" alt="' + a + '" data-iniziali="' +
      SP.esc(SP.iniziali(nome)) + '" data-nome="' + SP.esc(nome) + '">';
  };
  SP.stemmiMancanti = function (ambito) {
    Array.prototype.forEach.call((ambito || document).querySelectorAll('img.sp-stemma[data-iniziali]'), function (img) {
      function vuoto() {
        var s = document.createElement('span');
        s.className = 'sp-stemma sp-stemma--vuoto';
        s.textContent = img.getAttribute('data-iniziali');
        if (img.alt) { s.setAttribute('role', 'img'); s.setAttribute('aria-label', img.alt); } else { s.setAttribute('aria-hidden', 'true'); }
        img.replaceWith(s);
      }
      if (img.complete && img.naturalWidth === 0 && img.currentSrc) { vuoto(); } else { img.addEventListener('error', vuoto, { once: true }); }
    });
  };
  SP.esito = function (m) {
    var noiCasa = m.casa === SP.nostraSquadra;
    var noi = noiCasa ? m.gol_casa : m.gol_ospite, loro = noiCasa ? m.gol_ospite : m.gol_casa;
    return noi > loro ? 'vittoria' : noi < loro ? 'sconfitta' : 'pareggio';
  };
  SP.parolaEsito = { vittoria: 'Vittoria', pareggio: 'Pareggio', sconfitta: 'Sconfitta' };
  /* Differenza reti sempre con il segno, e con il meno vero. */
  SP.dr = function (n) { n = Number(n) || 0; return n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '0'; };
  SP.punteggio = function (m) { return m.gol_casa + '–' + m.gol_ospite; };
  /* Highlights e foto di ogni partita: le sottocartelle del Google Drive della squadra, da data/media.json
     (lo scrive tools/sync_media.py). Variante A scelta da Nicolo' il 25 novembre 2026: due link normali sotto la
     scheda, in una nuova scheda; niente anteprime, video o iframe, quindi nessuna richiesta a Google prima del tocco.
     Un link compare solo se l'indirizzo e' davvero una cartella di drive.google.com. */
  SP.media = {};
  var DRIVE = /^https:\/\/drive\.google\.com\/drive\/folders\/[\w-]+$/;
  /* Icone chieste da Nicolo' il 26 nov 2026: play in un rettangolo arrotondato per gli highlights, macchina
     fotografica per le foto. Decorative (aria-hidden), colore del testo. */
  function iconaMedia(d) {
    return '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" fill-rule="evenodd"><path d="' + d + '"/></svg>';
  }
  var VOCI_MEDIA = [
    ['highlights', 'Highlights', iconaMedia('M3 2.5h10a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H3a3 3 0 0 1-3-3v-5a3 3 0 0 1 3-3zM6.5 5.25v5.5L11 8z')],
    ['foto', 'Foto', iconaMedia('M5.4 2h5.2l1.2 2H14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2.2zM8 5.6a3.4 3.4 0 1 0 0 6.8a3.4 3.4 0 1 0 0-6.8zM8 7.1a1.9 1.9 0 1 0 0 3.8a1.9 1.9 0 1 0 0-3.8z')]
  ];
  function linkMedia(m) {
    var x = m.id && SP.media[m.id];
    if (!x) { return ''; }
    var partita = SP.esc(m.casa + ' v ' + m.ospite);
    var link = VOCI_MEDIA.filter(function (v) { return DRIVE.test(x[v[0]] || ''); }).map(function (v) {
      return '<a class="sp-link" href="' + SP.esc(x[v[0]]) + '" target="_blank" rel="noopener">' + v[2] + v[1] +
        '<span class="sp-nascosto"> di ' + partita + ', su Google Drive (si apre in una nuova scheda)</span></a>';
    });
    return link.length ? '<p class="sp-risultato__media">' + link.join('') + '</p>' : '';
  }
  /* Scheda del risultato: data ed esito in alto, stemmi ai lati del punteggio, casa a sinistra. */
  SP.risultato = function (m, classi) {
    var e = SP.esito(m);
    return '<article class="sp-risultato sp-vetro sp-su' + (classi ? ' ' + classi : '') + '"><div class="sp-risultato__testa"><span class="sp-tenue">' + SP.esc(SP.dataMedia(m.data)) +
      '</span><span class="sp-esito sp-esito--' + e + '">' + SP.parolaEsito[e] + '</span></div>' +
      '<div class="sp-risultato__punti">' + SP.stemma(m.casa, true) + '<span class="sp-risultato__gol">' + SP.punteggio(m) + '</span>' + SP.stemma(m.ospite, true) + '</div>' +
      '<p class="sp-risultato__squadre">' + SP.esc(m.casa + ' v ' + m.ospite) + '</p>' + linkMedia(m) + '</article>';
  };
  SP.ordinaPerData = function (a, b) { return ((a.data || '9999') + (a.ora || '')).localeCompare((b.data || '9999') + (b.ora || '')); };

  /* ---------- persone ---------- */
  var REPARTI = ['Portiere', 'Difensore', 'Centrocampista', 'Attaccante'];
  /* Tutte le persone da mostrare, nell'ordine della rosa: portiere, difensori, centrocampisti, attaccanti, staff.
     Ognuna con la sua card (giocatori agganciati dal numero di maglia, staff dal cognome, come in locandine.json).
     Con "mostra_solo_presentati" restano solo quelle con la card pubblicata. */
  SP.persone = function (rosa, locandine, config) {
    var card = {};
    ((locandine && locandine.locandine) || []).forEach(function (l) {
      if (!l.pubblicato) { return; }
      card[l.numero != null ? 'n' + l.numero : 's' + SP.slug(l.cognome)] = l;
    });
    var soloPresentati = !(config && config.rosa && config.rosa.mostra_solo_presentati === false);
    var giocatori = ((rosa && rosa.giocatori) || []).map(function (p, i) {
      return { p: p, staff: false, card: card['n' + p.numero] || null, i: i };
    });
    giocatori.sort(function (a, b) {
      var ra = REPARTI.indexOf(a.p.ruolo), rb = REPARTI.indexOf(b.p.ruolo);
      return (ra < 0 ? 9 : ra) - (rb < 0 ? 9 : rb) || a.i - b.i;
    });
    var staff = ((rosa && rosa.staff) || []).map(function (p, i) {
      return { p: p, staff: true, card: card['s' + SP.slug(p.cognome)] || null, i: i };
    });
    return giocatori.concat(staff).filter(function (x) { return !soloPresentati || x.card; }).map(function (x) {
      x.nome = x.p.nome + ' ' + x.p.cognome;
      x.link = x.card ? 'giocatore.html?id=' + encodeURIComponent(x.card.id) : '';
      return x;
    });
  };
  /* Miniatura tonda: la parte alta della card (il ritaglio lo fa bundle.css). */
  SP.miniatura = function (x, lato) {
    if (!x.card) { return ''; }
    return '<img class="sp-persona__foto" src="' + SP.esc(x.card.thumb) + '" alt="" width="' + lato + '" height="' + lato + '" loading="lazy">';
  };

  /* ---------- simboli ---------- */
  SP.simbolo = function (nome, misura, tratto) { return window.Shakhtar ? window.Shakhtar.simbolo(nome, misura, tratto) : ''; };

  /* ---------- striscia degli sponsor: l'ultima cosa dentro sp-contenuto ---------- */
  SP.striscia = function (sponsor) {
    var lista = ((sponsor && sponsor.sponsor) || []).filter(function (s) { return s.attivo !== false && s.livello === 'main' && s.logo; });
    if (!lista.length) { return ''; }
    var giri = '';
    for (var g = 0; g < 8; g++) {
      giri += '<div class="sp-striscia__giro"' + (g ? ' aria-hidden="true"' : '') + '>' + lista.map(function (s) {
        return '<img src="' + SP.esc(s.logo) + '" alt="' + (g ? '' : SP.esc(s.nome)) + '" height="28">';
      }).join('') + '</div>';
    }
    return '<div class="sp-striscia sp-su" role="group" aria-label="I nostri sponsor"><div class="sp-striscia__pista">' + giri + '</div></div>';
  };

  /* ---------- footer, da config.json (e storia.json per il piccone) ---------- */
  SP.footer = function (el, config, storia) {
    if (!el || !config) { return; }
    var sito = config.sito || {}, social = config.social || {}, campo = config.campo || {};
    var tagline = String(sito.tagline || '').split('\n').map(SP.esc).join('<br> ');
    var tondi = '';
    if (social.email) { tondi += '<a class="sp-tondo" href="mailto:' + SP.esc(social.email) + '" aria-label="Scrivici una mail">' + SP.simbolo('busta') + '</a>'; }
    if (social.instagram) { tondi += '<a class="sp-tondo" href="https://www.instagram.com/' + SP.esc(social.instagram) + '/" target="_blank" rel="noopener" aria-label="Instagram">' + SP.simbolo('macchina') + '</a>'; }
    if (social.tiktok) { tondi += '<a class="sp-tondo" href="https://www.tiktok.com/@' + SP.esc(social.tiktok) + '" target="_blank" rel="noopener" aria-label="TikTok">' + SP.simbolo('nota') + '</a>'; }
    var targa = storia && storia.targa && storia.targa.attivo !== false;
    SP._storia = storia;
    el.innerHTML =
      '<div class="sp-footer__su">' +
        '<div class="sp-footer__chi"><img src="assets/img/stemma-colori-512.png" alt="" width="48" height="53"><div>' +
          '<p class="sp-footer__nome">' + SP.esc(sito.nome) + '</p>' +
          (tagline ? '<p class="sp-footer__tagline">' + tagline + '</p>' : '') +
        '</div></div>' +
        (tondi ? '<div class="sp-footer__social">' + tondi + '</div>' : '') +
        (campo.nome ? '<a class="sp-footer__campo" href="' + SP.esc(campo.maps_url || '#') + '">' + SP.simbolo('segnaposto') +
          '<span><span class="sp-forte">' + SP.esc(campo.nome) + '</span><span class="sp-tenue">' + SP.esc(campo.indirizzo) +
          '. <span class="sp-riga-sotto">Apri la mappa</span></span></span></a>' : '') +
      '</div>' +
      '<div class="sp-footer__giu"><span class="sp-tenue">© ' + new Date().getFullYear() + ' ' + SP.esc(sito.nome) +
        '. <a class="sp-link" href="privacy.html">Privacy e cookie</a></span>' +
        (targa ? '<button type="button" class="sp-footer__piccone" aria-label="Targa dei fondatori" data-targa>' + SP.simbolo('piccone', 22) + '</button>' : '') +
      '</div>';
  };

  /* ---------- targa dei fondatori: approvata da Nicolo' il 23 novembre 2026 ----------
     Si apre dal piccone del footer. Testi da storia.json ("targa") e dal sito di oggi; i nomi da rosa.json.
     Con "solo_presentati": true mostra solo chi ha gia' la card pubblicata. */
  var targaAperta = null;
  function rigaTarga(p) {
    var numero = p.numero != null;
    return '<div class="sp-persona"><span class="sp-persona__testo"><span class="sp-persona__nome">' + SP.esc(p.nome + ' ' + p.cognome) + '</span>' +
      (numero ? '' : '<span class="sp-persona__sotto">' + SP.esc(p.ruolo || '') + '</span>') + '</span>' +
      (numero ? '<span class="sp-persona__numero">' + SP.esc(p.numero) + '</span>' : '') + '</div>';
  }
  function gruppoTarga(titolo, lista) {
    if (!lista.length) { return ''; }
    return '<section class="sp-sezione"><div class="sp-titolo-sezione"><h3 class="sp-h2 sp-tenda">' + titolo + '</h3></div>' +
      '<div class="sp-vetro sp-pannello sp-su">' + lista.map(rigaTarga).join('') + '</div></section>';
  }
  SP.targa = function (storia, bottone) {
    if (targaAperta) { targaAperta.showModal(); return; }
    SP.carica(['rosa', 'locandine']).then(function (d) {
      var t = (storia && storia.targa) || {};
      var usciti = {};
      ((d.locandine && d.locandine.locandine) || []).forEach(function (l) {
        if (l.pubblicato) { usciti[l.numero != null ? 'n' + l.numero : 's' + SP.slug(l.cognome)] = true; }
      });
      var filtra = function (lista, chiave) { return t.solo_presentati ? lista.filter(function (p) { return usciti[chiave(p)]; }) : lista.slice(); };
      var giocatori = filtra(d.rosa.giocatori || [], function (p) { return 'n' + p.numero; }).sort(function (a, b) { return a.numero - b.numero; });
      var staff = filtra(d.rosa.staff || [], function (p) { return 's' + SP.slug(p.cognome); });
      var nascosti = (d.rosa.giocatori || []).length + (d.rosa.staff || []).length - giocatori.length - staff.length;
      var dlg = document.createElement('dialog');
      dlg.className = 'sp-targa';
      dlg.setAttribute('aria-labelledby', 'sp-targa-titolo');
      dlg.innerHTML = '<div class="sp-contenuto">' +
        '<div class="sp-targa__chiudi"><button type="button" class="sp-tondo" aria-label="Chiudi la targa" data-chiudi>' + SP.simbolo('chiudi') + '</button></div>' +
        '<div class="sp-titolo-pagina sp-su" style="padding-top:0"><div>' +
          (t.occhiello ? '<p class="sp-targa__occhiello">' + SP.esc(t.occhiello) + '</p>' : '') +
          '<h2 class="sp-h1" id="sp-targa-titolo">' + SP.esc(t.titolo || 'Targa dei fondatori') + '</h2>' +
          (t.testo ? '<p class="sp-titolo-pagina__attacco">' + SP.esc(t.testo) + '</p>' : '') +
        '</div></div>' +
        '<div class="sp-due sp-due--pari">' + gruppoTarga('In campo', giocatori) +
          '<div class="sp-colonna">' + gruppoTarga('Fuori dal campo', staff) +
          (nascosti > 0 ? '<p class="sp-tenue">e altri ' + nascosti + ', che escono una locandina alla volta.</p>' : '') + '</div></div>' +
        '<p class="sp-targa__firma">Shakhtar · in ucraino, minatore</p>' +
        '<a class="sp-bottone sp-bottone--vetro sp-su" href="storia.html">Com’è andata</a>' +
      '</div>';
      dlg.addEventListener('click', function (e) { if (e.target.closest('[data-chiudi]')) { dlg.close(); } });
      dlg.addEventListener('close', function () { if (bottone) { bottone.focus(); } });
      document.body.appendChild(dlg);
      targaAperta = dlg;
      dlg.showModal();
      dlg.scrollTop = 0;
      if (window.Shakhtar) { window.Shakhtar.comparsa(dlg); }
    }).catch(function (e) { if (window.console) { console.error(e); } });
  };
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-targa]');
    if (b) { SP.targa(SP._storia, b); }
  });

  window.SP = SP;
})();
