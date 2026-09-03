/* =========================================================================
   main.js — roba condivisa da tutte le pagine:
   tema chiaro/scuro, menu mobile, dati di config nel footer, bottone condividi
   e un paio di funzioni di utilita' usate dagli altri script.
   Tutti i path sono RELATIVI perche' il sito sta in una sottocartella
   (https://nicoloiacobone.github.io/shakhtar_palese/).
   ========================================================================= */

const SP = (() => {
  const cache = new Map();

  /* Radice del sito, ricavata da dove sta questo script (.../assets/js/main.js).
     Serve perche' main.js viene caricato anche da admin/, che sta una cartella
     piu' in basso: cosi' data/ si risolve correttamente da qualsiasi profondita',
     senza mai ricorrere a path assoluti (il sito vive in una sottocartella). */
  const RADICE = new URL('../../', document.currentScript.src).href;

  /* Carica un JSON da data/ una sola volta per pagina. */
  async function dati(nomeFile) {
    if (cache.has(nomeFile)) return cache.get(nomeFile);
    const p = fetch(`${RADICE}data/${nomeFile}`, { cache: 'no-cache' }).then((r) => {
      if (!r.ok) throw new Error(`data/${nomeFile}: HTTP ${r.status}`);
      return r.json();
    });
    cache.set(nomeFile, p);
    return p;
  }

  /* Testo -> HTML sicuro. I dati vengono da JSON che scrivo io, ma meglio abituarsi bene. */
  const esc = (v) =>
    String(v ?? '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const MESI = ['gennaio','febbraio','marzo','aprile','maggio','giugno',
                'luglio','agosto','settembre','ottobre','novembre','dicembre'];
  const GIORNI = ['domenica','lunedi','martedi','mercoledi','giovedi','venerdi','sabato'];

  /* "2026-09-10" -> "gio 10 settembre 2026" (senza dipendere dal locale del browser) */
  function dataIt(iso, conGiorno = true) {
    if (!iso) return '';
    const [a, m, g] = String(iso).split('-').map(Number);
    if (!a || !m || !g) return String(iso);
    const d = new Date(a, m - 1, g);
    const pref = conGiorno ? GIORNI[d.getDay()].slice(0, 3) + ' ' : '';
    return `${pref}${g} ${MESI[m - 1]} ${a}`;
  }

  /* Data + ora ISO -> oggetto Date locale. Ora opzionale (default 00:00). */
  function quando(iso, ora) {
    const [a, m, g] = String(iso || '').split('-').map(Number);
    const [h, min] = String(ora || '00:00').split(':').map(Number);
    if (!a) return null;
    return new Date(a, m - 1, g, h || 0, min || 0, 0, 0);
  }

  /* Mostra un messaggio d'errore al posto del contenuto, invece di lasciare la pagina muta. */
  function errore(el, msg) {
    if (!el) return;
    el.innerHTML = `<div class="avviso errore"><b>Contenuto non caricato.</b> ${esc(msg)}<br>
      <small>Se stai aprendo il file con doppio click, usa invece un server locale:
      <code>./.venv/bin/python -m http.server</code></small></div>`;
  }

  const slug = (s) => String(s).toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  /* Riga "risultato" usata sia in home sia in tornei: stessa forma, stesso colore d'esito. */
  function rigaRisultato(m, noi) {
    const inCasa = m.casa === noi;
    const mio = inCasa ? m.gol_casa : m.gol_ospite;
    const suo = inCasa ? m.gol_ospite : m.gol_casa;
    const esito = mio > suo ? 'V' : mio === suo ? 'N' : 'P';
    return `<article class="risultato" data-esito="${esito}">
      <div class="sq ${inCasa ? 'noi' : ''}">${esc(m.casa)}</div>
      <div class="punteggio">${esc(m.gol_casa)}<span style="color:var(--testo-debole)">&ndash;</span>${esc(m.gol_ospite)}</div>
      <div class="sq ${inCasa ? '' : 'noi'}">${esc(m.ospite)}</div>
      <div class="data">${dataIt(m.data)}${m.note ? ' &middot; ' + esc(m.note) : ''}</div>
    </article>`;
  }

  /* La card di una persona (giocatore o staff), usata in home e nella pagina Rosa.
     Con `href` diventa un link, senza diventa un bottone che apre la scheda. */
  function cardPersona(p, foto, opts = {}) {
    const nomeCompleto = `${p.nome} ${p.cognome}`;
    const distintivo = p.numero != null
      ? `<span class="numero">${esc(p.numero)}</span>`
      : `<span class="ruolo-staff">${esc(p.ruolo_sigla || p.codice || 'staff')}</span>`;
    const img = foto
      ? `<img src="${esc(foto.thumb)}" alt="${esc(nomeCompleto)}" width="${esc(foto.thumb_w)}"
             height="${esc(foto.thumb_h)}" loading="lazy" decoding="async">`
      : `<img src="assets/img/placeholder-giocatore.svg"
             alt="Foto di ${esc(p.cognome)} non ancora disponibile"
             width="400" height="600" loading="lazy" decoding="async">`;
    const dentro = `
      <div class="foto">${distintivo}${img}</div>
      <div class="info">
        <div class="cognome">${esc(p.cognome)}</div>
        <div class="nome-pic">${esc(p.nome)}</div>
        <span class="ruolo">${esc(p.ruolo_sigla || p.codice || '')}</span>
      </div>`;
    return opts.href
      ? `<a class="player-card" href="${opts.href}" aria-label="${esc(nomeCompleto)}">${dentro}</a>`
      : `<button class="player-card" type="button" data-chiave="${esc(p._chiave)}"
           aria-label="Apri la scheda di ${esc(nomeCompleto)}">${dentro}</button>`;
  }

  /* Etichette dei filtri: "Portiere" -> "Portieri". */
  const PLURALI = { Portiere: 'Portieri', Difensore: 'Difensori', Centrocampista: 'Centrocampisti', Attaccante: 'Attaccanti' };
  const plurale = (ruolo) => PLURALI[ruolo] || ruolo;

  /* Chiave con cui una persona si collega alla sua locandina:
     i giocatori col numero di maglia, lo staff col cognome. */
  const chiavePersona = (p) => (p.numero != null ? `n${p.numero}` : `s${slug(p.cognome)}`);
  const chiaveLocandina = (l) => (l.numero != null ? `n${l.numero}` : `s${slug(l.cognome || '')}`);

  return { dati, esc, dataIt, quando, errore, slug, rigaRisultato, plurale,
           cardPersona, chiavePersona, chiaveLocandina };
})();

/* ---------------------------------------------------------------- tema --- */
(function tema() {
  const SALVATO = 'sp-tema';
  const applica = (t) => {
    document.documentElement.setAttribute('data-tema', t);
    document.querySelectorAll('[data-azione="tema"]').forEach((b) => {
      b.setAttribute('aria-label', t === 'chiaro' ? 'Passa al tema scuro' : 'Passa al tema chiaro');
      // L'icona mostra DOVE si va, non dove si e': col tema scuro attivo si
      // vede il sole ("passa al chiaro"), cosi' icona e aria-label concordano.
      b.querySelector('[data-icona-sole]')?.toggleAttribute('hidden', t === 'chiaro');
      b.querySelector('[data-icona-luna]')?.toggleAttribute('hidden', t !== 'chiaro');
    });
  };
  // Default scuro; se l'utente ha gia' scelto, vince la sua scelta.
  let iniziale = 'scuro';
  try { iniziale = localStorage.getItem(SALVATO) || 'scuro'; } catch (e) { /* private browsing */ }
  applica(iniziale);

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-azione="tema"]');
    if (!b) return;
    const nuovo = document.documentElement.getAttribute('data-tema') === 'chiaro' ? 'scuro' : 'chiaro';
    applica(nuovo);
    try { localStorage.setItem(SALVATO, nuovo); } catch (e) { /* ignora */ }
  });
})();

/* --------------------------------------------------------- menu mobile --- */
(function menu() {
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-azione="menu"]');
    const nav = document.getElementById('nav');
    if (!nav) return;
    if (b) {
      const aperto = nav.getAttribute('data-aperto') === 'true';
      nav.setAttribute('data-aperto', String(!aperto));
      b.setAttribute('aria-expanded', String(!aperto));
      return;
    }
    // clic fuori dal menu -> chiudi
    if (nav.getAttribute('data-aperto') === 'true' && !e.target.closest('#nav')) {
      nav.setAttribute('data-aperto', 'false');
      document.querySelector('[data-azione="menu"]')?.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const nav = document.getElementById('nav');
    if (nav?.getAttribute('data-aperto') === 'true') {
      nav.setAttribute('data-aperto', 'false');
      document.querySelector('[data-azione="menu"]')?.setAttribute('aria-expanded', 'false');
    }
  });
})();

/* ------------------------------------------- pagina corrente nella nav --- */
(function navCorrente() {
  const qui = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.querySelectorAll('#nav a[href]').forEach((a) => {
    if (a.getAttribute('href').toLowerCase() === qui) a.setAttribute('aria-current', 'page');
  });
})();

/* ------------------------------------- condividi (Web Share + fallback) --- */
(function condividi() {
  function toast(msg) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.setAttribute('data-visibile', 'true');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.setAttribute('data-visibile', 'false'), 2200);
  }

  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-azione="condividi"]');
    if (!b) return;
    const dati = {
      title: document.title,
      text: document.querySelector('meta[name="description"]')?.content || document.title,
      url: location.href,
    };
    if (navigator.share) {
      try { await navigator.share(dati); return; } catch (err) { if (err.name === 'AbortError') return; }
    }
    try {
      await navigator.clipboard.writeText(location.href);
      toast('Link copiato negli appunti');
    } catch (err) {
      toast('Copia il link dalla barra del browser');
    }
  });
})();

/* -------------------------------- footer e contatti da data/config.json --- */
(async function riempiConfig() {
  let cfg;
  try { cfg = await SP.dati('config.json'); } catch (e) { console.error(e); return; }

  const ig = cfg.social.instagram, tk = cfg.social.tiktok, mail = cfg.social.email;
  const valori = {
    'sito-nome': cfg.sito.nome,
    'sito-tagline': cfg.sito.tagline,
    'email': mail,
    'instagram': '@' + ig,
    'tiktok': '@' + tk,
    'campo-nome': cfg.campo.nome,
    'campo-indirizzo': cfg.campo.indirizzo,
    'campo-instagram': '@' + cfg.campo.instagram,
    'anno': String(new Date().getFullYear()),
  };
  const href = {
    'email': 'mailto:' + mail,
    'instagram': 'https://instagram.com/' + ig,
    'tiktok': 'https://tiktok.com/@' + tk,
    'campo-instagram': 'https://instagram.com/' + cfg.campo.instagram,
    'campo-maps': cfg.campo.maps_url,
  };

  // data-solo-href = "riempi solo il link, non toccare il contenuto".
  // Serve sui bottoni e sulle icone social, che dentro hanno un SVG da non cancellare.
  // Attenzione: e' un attributo VUOTO, quindi va letto con hasAttribute e non
  // con dataset (dataset.soloHref sarebbe la stringa vuota, cioe' falsy).
  document.querySelectorAll('[data-config]').forEach((el) => {
    const k = el.dataset.config;
    if (valori[k] !== undefined && !el.hasAttribute('data-solo-href')) el.textContent = valori[k];
    if (el.tagName === 'A' && href[k]) el.href = href[k];
  });
})();
