/* statistiche.js — leader card, tabella ordinabile (desktop) e lista di card (mobile).
   Rosa e statistiche si incrociano sul numero di maglia. */

(async function statistiche() {
  const elLeader = document.getElementById('leader');
  const elTh     = document.getElementById('intestazioni-stat');
  const elTbody  = document.getElementById('corpo-stat');
  const elLista  = document.getElementById('lista-stat');
  const elFiltri = document.getElementById('filtri-ruolo');

  /* Colonne: chiave, etichetta breve, etichetta estesa per screen reader.
     Aggiungerne una = aggiungere una riga qui e il campo nel JSON. */
  const COLONNE = [
    { k: 'numero',        et: '#',    lungo: 'Numero di maglia' },
    { k: 'giocatore',     et: 'Giocatore', lungo: 'Giocatore', testo: true, sx: true },
    { k: 'ruolo_sigla',   et: 'Ruolo', lungo: 'Ruolo', testo: true, sx: true },
    { k: 'presenze',      et: 'PG',   lungo: 'Partite giocate' },
    { k: 'minuti',        et: 'Min',  lungo: 'Minuti giocati' },
    { k: 'gol',           et: 'Gol',  lungo: 'Gol' },
    { k: 'assist',        et: 'Ass',  lungo: 'Assist' },
    { k: 'ammonizioni',   et: 'Gialli', lungo: 'Ammonizioni' },
    { k: 'espulsioni',    et: 'Rossi', lungo: 'Espulsioni' },
    { k: 'mvp',           et: 'MVP',  lungo: 'Migliore in campo' },
    { k: 'papere',        et: 'Papere', lungo: 'Papere' },
    { k: 'gol_sbagliati', et: 'Sbagliati', lungo: 'Gol sbagliati' },
    { k: 'ritardi',       et: 'Ritardi', lungo: 'Ritardi agli allenamenti' },
    { k: 'multe_euro',    et: 'Multe €', lungo: 'Multe in euro' },
  ];

  let righe = [], ruoloAttivo = 'tutti';
  let ordinaPer = 'gol', direzione = 'desc';

  try {
    const [cfg, r, s, l] = await Promise.all([
      SP.dati('config.json'),
      SP.dati('rosa.json'),
      SP.dati('statistiche.json'),
      SP.dati('locandine.json').catch(() => ({ locandine: [] })),
    ]);
    const stat = {};
    (s.giocatori || []).forEach((x) => { stat[x.numero] = x; });

    // Stessa regola della pagina Rosa: chi non e' ancora stato presentato non
    // deve comparire nemmeno qui, altrimenti il suo nome uscirebbe in anticipo.
    const soloPresentati = cfg.rosa?.mostra_solo_presentati !== false;
    const conFoto = new Set((l.locandine || [])
      .filter((x) => x.valida !== false && x.numero != null)
      .map((x) => x.numero));

    righe = (r.giocatori || [])
      .filter((g) => !soloPresentati || conFoto.has(g.numero))
      .map((g) => ({
      numero: g.numero,
      giocatore: `${g.cognome} ${g.nome.charAt(0)}.`,
      cognome: g.cognome,
      ruolo: g.ruolo,
      ruolo_sigla: g.ruolo_sigla || g.ruolo,
      presenze: 0, minuti: 0, gol: 0, assist: 0, ammonizioni: 0, espulsioni: 0,
      mvp: 0, papere: 0, gol_sbagliati: 0, ritardi: 0, multe_euro: 0,
      ...(stat[g.numero] || {}),
    }));

    if (!righe.length) {
      const vuoto = '<p class="vuoto">Le statistiche compaiono qui mano a mano che presentiamo i giocatori.</p>';
      elLista.innerHTML = vuoto;
      elLeader.innerHTML = '';
      document.querySelector('.tabella-wrap')?.setAttribute('hidden', '');
      elFiltri.hidden = true;
      return;
    }
  } catch (e) {
    console.error(e);
    SP.errore(elLista, e.message);
    SP.errore(elLeader, e.message);
    return;
  }

  /* ------------------------------------------------------ leader card --- */
  function leader(etichetta, chiave, descrizione) {
    const migliore = [...righe].sort((a, b) => b[chiave] - a[chiave])[0];
    if (!migliore || !migliore[chiave]) {
      return `<div class="leader"><span class="et">${SP.esc(etichetta)}</span>
        <span class="nm" style="color:var(--testo-debole)">nessuno, per ora</span>
        <span class="vl">0</span><span class="ds">${SP.esc(descrizione)}</span></div>`;
    }
    return `<div class="leader">
      <span class="et">${SP.esc(etichetta)}</span>
      <span class="nm">${SP.esc(migliore.cognome)} <span style="color:var(--testo-debole);font-weight:600">#${SP.esc(migliore.numero)}</span></span>
      <span class="vl">${SP.esc(migliore[chiave])}</span>
      <span class="ds">${SP.esc(descrizione)}</span>
    </div>`;
  }
  elLeader.innerHTML = [
    leader('Capocannoniere', 'gol', 'gol segnati'),
    leader('Re degli assist', 'assist', 'assist serviti'),
    leader('Uomo dei cartellini', 'ammonizioni', 'ammonizioni rimediate'),
    leader('Re delle papere', 'papere', 'papere, a giudizio insindacabile'),
    leader('Cassa comune', 'multe_euro', 'euro di multe versate'),
  ].join('');

  /* -------------------------------------------------- filtri per ruolo --- */
  const ruoli = ['tutti', ...new Set(righe.map((x) => x.ruolo))];
  elFiltri.innerHTML = ruoli.map((r) =>
    `<button class="chip" type="button" data-ruolo="${SP.esc(r)}" aria-pressed="${r === 'tutti'}">
      ${r === 'tutti' ? 'Tutti' : SP.esc(SP.plurale(r))}</button>`).join('');
  elFiltri.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ruolo]');
    if (!b) return;
    ruoloAttivo = b.dataset.ruolo;
    elFiltri.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
    disegna();
  });

  /* ------------------------------------------------------ intestazioni --- */
  elTh.innerHTML = COLONNE.map((c) =>
    `<th class="ordinabile ${c.sx ? 'sx' : 'num'}" scope="col" data-k="${c.k}"
         title="${SP.esc(c.lungo)}" tabindex="0" role="columnheader" aria-sort="none">${c.et}</th>`).join('');

  function attivaOrdinamento(k) {
    // Stessa colonna: inverte. Colonna nuova: numeri dal piu' alto, testo dalla A.
    if (ordinaPer === k) direzione = direzione === 'asc' ? 'desc' : 'asc';
    else { ordinaPer = k; direzione = COLONNE.find((c) => c.k === k)?.testo ? 'asc' : 'desc'; }
    disegna();
  }
  elTh.addEventListener('click', (e) => {
    const th = e.target.closest('[data-k]');
    if (th) attivaOrdinamento(th.dataset.k);
  });
  elTh.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const th = e.target.closest('[data-k]');
    if (th) { e.preventDefault(); attivaOrdinamento(th.dataset.k); }
  });

  /* ------------------------------------------------------------ render --- */
  function ordinate() {
    const col = COLONNE.find((c) => c.k === ordinaPer) || COLONNE[0];
    const segno = direzione === 'asc' ? 1 : -1;
    return righe
      .filter((x) => ruoloAttivo === 'tutti' || x.ruolo === ruoloAttivo)
      .sort((a, b) => {
        const va = a[ordinaPer], vb = b[ordinaPer];
        const cmp = col.testo ? String(va).localeCompare(String(vb), 'it') : (va - vb);
        return cmp !== 0 ? cmp * segno : a.numero - b.numero; // a parita', per numero di maglia
      });
  }

  function disegna() {
    const lista = ordinate();

    elTh.querySelectorAll('[data-k]').forEach((th) => th.setAttribute(
      'aria-sort', th.dataset.k === ordinaPer ? (direzione === 'asc' ? 'ascending' : 'descending') : 'none'));

    elTbody.innerHTML = lista.map((x) => `<tr>${COLONNE.map((c) =>
      `<td class="${c.sx ? 'sx' : 'num'}">${SP.esc(x[c.k])}</td>`).join('')}</tr>`).join('');

    // Su mobile la tabella diventa una lista di card: stessi dati, zero scroll orizzontale.
    elLista.innerHTML = lista.length ? lista.map((x) => `
      <article class="stat-card">
        <div class="stat-card-testa">
          <span class="n">${SP.esc(x.numero)}</span>
          <span class="nm">${SP.esc(x.giocatore)}</span>
          <span class="rl">${SP.esc(x.ruolo_sigla)}</span>
        </div>
        <div class="stat-griglia">
          <div><b>${SP.esc(x.presenze)}</b><small>PG</small></div>
          <div><b>${SP.esc(x.minuti)}</b><small>min</small></div>
          <div><b>${SP.esc(x.gol)}</b><small>gol</small></div>
          <div><b>${SP.esc(x.assist)}</b><small>assist</small></div>
          <div><b>${SP.esc(x.ammonizioni)}</b><small>gialli</small></div>
          <div><b>${SP.esc(x.espulsioni)}</b><small>rossi</small></div>
          <div><b>${SP.esc(x.mvp)}</b><small>MVP</small></div>
          <div><b>${SP.esc(x.papere)}</b><small>papere</small></div>
          <div><b>${SP.esc(x.gol_sbagliati)}</b><small>sbagliati</small></div>
          <div><b>${SP.esc(x.ritardi)}</b><small>ritardi</small></div>
          <div><b>${SP.esc(x.multe_euro)}</b><small>multe €</small></div>
        </div>
      </article>`).join('') : '<p class="vuoto">Nessun giocatore con questo ruolo.</p>';
  }

  /* Su mobile non c'e' l'intestazione da cliccare: un select fa lo stesso lavoro. */
  const sceltaOrdine = document.createElement('label');
  sceltaOrdine.className = 'solo-mobile';
  sceltaOrdine.style.cssText = 'display:block;margin-bottom:1rem;font-size:.85rem;color:var(--testo-tenue)';
  sceltaOrdine.innerHTML = `Ordina per
    <select id="ordina-mobile" style="width:100%;margin-top:.3rem;padding:.6rem;border-radius:8px;
      background:var(--superficie);color:var(--testo);border:1px solid var(--bordo)">
      ${COLONNE.filter((c) => !c.testo).map((c) =>
        `<option value="${c.k}"${c.k === 'gol' ? ' selected' : ''}>${SP.esc(c.lungo)}</option>`).join('')}
    </select>`;
  elLista.parentNode.insertBefore(sceltaOrdine, elLista);
  sceltaOrdine.querySelector('select').addEventListener('change', (e) => {
    ordinaPer = e.target.value; direzione = 'desc'; disegna();
  });

  disegna();
})();
