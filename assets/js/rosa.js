/* rosa.js — griglia delle player card + scheda giocatore in modale.
   La foto NON e' scritta in rosa.json: si ricava incrociando il numero di maglia
   con le locandine (una sola immagine, due usi: qui e nella pagina Convocati). */

(async function rosa() {
  const griglia = document.getElementById('griglia-rosa');
  const filtri  = document.getElementById('filtri-ruolo');
  const modale  = document.getElementById('scheda-giocatore');
  const dentro  = document.getElementById('scheda-contenuto');
  const PLACEHOLDER = 'assets/img/placeholder-giocatore.svg';

  let giocatori = [], statPerNumero = {}, fotoPerNumero = {}, ruoloAttivo = 'tutti';

  try {
    const [r, s, l] = await Promise.all([
      SP.dati('rosa.json'),
      SP.dati('statistiche.json').catch(() => ({ giocatori: [] })),
      SP.dati('locandine.json').catch(() => ({ locandine: [] })),
    ]);
    giocatori = r.giocatori || [];
    (s.giocatori || []).forEach((x) => { statPerNumero[x.numero] = x; });
    // Se un giocatore ha piu' locandine vince la piu' recente (le prime della lista).
    (l.locandine || []).forEach((x) => {
      if (x.numero != null && !fotoPerNumero[x.numero]) fotoPerNumero[x.numero] = x;
    });
  } catch (e) {
    console.error(e);
    SP.errore(griglia, e.message);
    return;
  }

  /* ------------------------------------------------- filtri per ruolo --- */
  const ruoli = ['tutti', ...new Set(giocatori.map((g) => g.ruolo))];
  filtri.innerHTML = ruoli.map((r) =>
    `<button class="chip" type="button" data-ruolo="${SP.esc(r)}" aria-pressed="${r === 'tutti'}">
       ${r === 'tutti' ? 'Tutti' : SP.esc(SP.plurale(r))}</button>`).join('');
  filtri.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ruolo]');
    if (!b) return;
    ruoloAttivo = b.dataset.ruolo;
    filtri.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
    disegna();
  });

  /* ------------------------------------------------------ la griglia --- */
  function disegna() {
    const lista = giocatori
      .filter((g) => ruoloAttivo === 'tutti' || g.ruolo === ruoloAttivo)
      .sort((a, b) => a.numero - b.numero);

    if (!lista.length) { griglia.innerHTML = '<p class="vuoto">Nessun giocatore con questo ruolo.</p>'; return; }

    griglia.innerHTML = lista.map((g) => {
      const f = fotoPerNumero[g.numero];
      const alt = `${g.nome} ${g.cognome}, numero ${g.numero}`;
      const foto = f
        ? `<img src="${SP.esc(f.thumb)}" alt="${SP.esc(alt)}" width="${SP.esc(f.thumb_w)}" height="${SP.esc(f.thumb_h)}" loading="lazy" decoding="async">`
        : `<img src="${PLACEHOLDER}" alt="Foto di ${SP.esc(g.cognome)} non ancora disponibile" width="400" height="600" loading="lazy" decoding="async">`;
      return `<button class="player-card" type="button" data-numero="${SP.esc(g.numero)}">
          <div class="foto"><span class="numero">${SP.esc(g.numero)}</span>${foto}</div>
          <div class="info">
            <div class="cognome">${SP.esc(g.cognome)}</div>
            <div class="nome-pic">${SP.esc(g.nome)}</div>
            <span class="ruolo">${SP.esc(g.ruolo_sigla || g.ruolo)}</span>
          </div>
        </button>`;
    }).join('');
  }
  disegna();

  /* --------------------------------------------- scheda in una modale --- */
  griglia.addEventListener('click', (e) => {
    const card = e.target.closest('[data-numero]');
    if (card) apriScheda(Number(card.dataset.numero));
  });

  function apriScheda(numero) {
    const g = giocatori.find((x) => x.numero === numero);
    if (!g) return;
    const f = fotoPerNumero[numero];
    const st = statPerNumero[numero];

    const dato = (et, vl) => vl ? `<div class="dato"><dt>${SP.esc(et)}</dt><dd>${SP.esc(vl)}</dd></div>` : '';
    const stat = (et, vl) => `<div><b>${SP.esc(vl ?? 0)}</b><small>${SP.esc(et)}</small></div>`;

    dentro.innerHTML = `
      <button class="btn-icona modale-chiudi" type="button" data-chiudi aria-label="Chiudi la scheda">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
      <div class="scheda-testa">
        <div class="scheda-foto">
          <img src="${SP.esc(f ? (f.web || f.file) : PLACEHOLDER)}"
               alt="${SP.esc(g.nome + ' ' + g.cognome)}" width="400" height="600" loading="lazy" decoding="async">
        </div>
        <div>
          <p class="occhiello">#${SP.esc(g.numero)} &middot; ${SP.esc(g.ruolo)}</p>
          <h2 class="scheda-nome">${SP.esc(g.nome)} ${SP.esc(g.cognome)}</h2>
          <p class="scheda-sopr">&ldquo;${SP.esc(g.soprannome || 'senza soprannome, per ora')}&rdquo;</p>
          <dl class="dati">
            ${dato('Numero', g.numero)}
            ${dato('Ruolo', g.ruolo)}
            ${dato('Piede', g.piede)}
            ${dato('Provenienza', g.provenienza)}
          </dl>
        </div>
      </div>
      <div class="scheda-sezione">
        <dl class="dati">
          ${dato('Tormentone', g.tormentone)}
          ${dato('Superstizione', g.superstizione)}
          ${dato('Difetto tattico dichiarato', g.difetto_tattico)}
          ${dato('Obiettivo nel torneo', g.obiettivo)}
        </dl>
      </div>
      <div class="scheda-sezione">
        <h3>Statistiche</h3>
        ${st ? `<div class="scheda-stat">
            ${stat('presenze', st.presenze)}${stat('minuti', st.minuti)}${stat('gol', st.gol)}
            ${stat('assist', st.assist)}${stat('gialli', st.ammonizioni)}${stat('rossi', st.espulsioni)}
            ${stat('MVP', st.mvp)}${stat('papere', st.papere)}${stat('gol sbagliati', st.gol_sbagliati)}
            ${stat('ritardi', st.ritardi)}${stat('multe &euro;', st.multe_euro)}
          </div>` : '<p class="sottotitolo">Nessuna statistica registrata per questo giocatore.</p>'}
        <p style="margin-top:1rem"><a href="statistiche.html">Confrontalo con gli altri &rarr;</a></p>
      </div>`;

    if (typeof modale.showModal === 'function') modale.showModal();
    else modale.setAttribute('open', ''); // fallback per browser molto vecchi
    dentro.querySelector('[data-chiudi]')?.focus();
  }

  // Chiusura: bottone, ESC (nativo di <dialog>) e clic sullo sfondo.
  modale.addEventListener('click', (e) => {
    if (e.target.closest('[data-chiudi]')) { modale.close(); return; }
    const box = dentro.getBoundingClientRect();
    const fuori = e.clientY < box.top || e.clientY > box.bottom || e.clientX < box.left || e.clientX > box.right;
    if (fuori) modale.close();
  });
})();
