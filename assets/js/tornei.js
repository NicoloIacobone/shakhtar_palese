/* tornei.js — classifica + calendario. Gestisce piu' tornei: quello corrente
   e l'archivio, scelti con i chip in alto. */

(async function tornei() {
  const elScelta   = document.getElementById('scelta-torneo');
  const elClass    = document.getElementById('classifica');
  const elCal      = document.getElementById('calendario');
  const elTitolo   = document.getElementById('titolo-torneo');
  const elSotto    = document.getElementById('sottotitolo-torneo');
  const elRegole   = document.getElementById('regolamento-torneo');
  const bloccoReg  = document.getElementById('blocco-regolamento');

  let tutti = [], attivo = null;

  try {
    const d = await SP.dati('tornei.json');
    tutti = d.tornei || [];
    attivo = tutti.find((t) => t.id === d.corrente) || tutti[0];
  } catch (e) {
    console.error(e);
    SP.errore(elClass, e.message);
    SP.errore(elCal, e.message);
    return;
  }
  if (!attivo) { elClass.innerHTML = '<p class="vuoto">Nessun torneo in programma.</p>'; return; }

  elScelta.innerHTML = tutti.map((t) =>
    `<button class="chip" type="button" data-id="${SP.esc(t.id)}" aria-pressed="${t.id === attivo.id}">
      ${SP.esc(t.nome)} <span style="opacity:.7">${SP.esc(t.stagione)}</span></button>`).join('');
  elScelta.addEventListener('click', (e) => {
    const b = e.target.closest('[data-id]');
    if (!b) return;
    attivo = tutti.find((t) => t.id === b.dataset.id);
    elScelta.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
    disegna();
  });

  function disegna() {
    const noi = attivo.nostra_squadra;
    const STATI = { in_corso: 'in corso', concluso: 'concluso', in_programma: 'non ancora iniziato' };

    elTitolo.textContent = attivo.nome;
    const ig = attivo.instagram
      ? ` &middot; <a href="https://instagram.com/${SP.esc(attivo.instagram)}" target="_blank" rel="noopener">@${SP.esc(attivo.instagram)}</a>`
      : ' &middot; <span style="color:var(--testo-debole)">Instagram del torneo: da definire</span>';
    elSotto.innerHTML = `Stagione ${SP.esc(attivo.stagione)} &middot; ${SP.esc(STATI[attivo.stato] || attivo.stato)}${ig}`;

    /* ------------------------------------------------------ classifica --- */
    // Se nessuno ha ancora giocato, la classifica e' una fila di zeri: meglio
    // dirlo, invece di lasciare pensare che siamo messi malissimo.
    const nonIniziato = (attivo.classifica || []).every((r) => !r.g);
    const daAnnunciare = (attivo.classifica || []).filter((r) => r.squadra === 'TBA').length;

    if (!attivo.classifica || !attivo.classifica.length) {
      elClass.innerHTML = '<p class="vuoto">Questo torneo non ha una classifica.</p>';
    } else if (nonIniziato) {
      elClass.innerHTML = `<div class="card">
        <h3 style="margin-bottom:.3rem">Non abbiamo ancora giocato</h3>
        <p class="sottotitolo" style="margin:0">
          ${attivo.classifica.length} squadre al via${daAnnunciare
            ? `, di cui ${daAnnunciare} ancora da annunciare` : ''}.
          La classifica comincia a riempirsi dalla prima giornata.</p>
      </div>`;
    } else {
      const col = [['punti','Pt'],['g','G'],['v','V'],['n','N'],['p','P'],['gf','GF'],['gs','GS'],['dr','DR']];
      const righe = [...attivo.classifica].sort((a, b) => a.pos - b.pos);
      elClass.innerHTML = `
        <div class="tabella-wrap">
          <table class="tab">
            <caption class="sr-only">Classifica del ${SP.esc(attivo.nome)}</caption>
            <thead><tr>
              <th class="num" scope="col">Pos</th><th class="sx" scope="col">Squadra</th>
              ${col.map(([, et]) => `<th class="num" scope="col">${et}</th>`).join('')}
            </tr></thead>
            <tbody>${righe.map((r) => `
              <tr class="${r.squadra === noi ? 'noi' : ''}">
                <td class="num">${SP.esc(r.pos)}</td>
                <td class="sx">${SP.esc(r.squadra)}${r.squadra === noi ? ' 🐆' : ''}</td>
                ${col.map(([k]) => `<td class="num">${k === 'dr' && r[k] > 0 ? '+' : ''}${SP.esc(r[k])}</td>`).join('')}
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <p class="nota-scroll">&rarr; scorri la tabella di lato per vedere tutte le colonne.</p>
        <p class="sottotitolo" style="font-size:.8rem;margin-top:.6rem">
          Pt punti &middot; G giocate &middot; V vinte &middot; N pareggiate &middot; P perse &middot;
          GF gol fatti &middot; GS gol subiti &middot; DR differenza reti. La riga arancione siamo noi.</p>`;
    }

    /* ------------------------------------------------- come funziona --- */
    // Il regolamento non ce l'hanno tutti i tornei (l'archivio no): se manca,
    // la sezione non esiste proprio, invece di restare li' vuota.
    const gruppi = attivo.regolamento?.gruppi || [];
    if (bloccoReg) bloccoReg.hidden = gruppi.length === 0;
    if (elRegole) {
      elRegole.innerHTML = gruppi.map((g) => `
        <div class="card">
          <h3 class="regola-titolo">${SP.esc(g.titolo)}</h3>
          <ul class="regole">${(g.voci || []).map((v) => `<li>${SP.esc(v)}</li>`).join('')}</ul>
        </div>`).join('');
    }

    /* ------------------------------------------- calendario e risultati --- */
    // Prima le partite con una data, in ordine cronologico; poi quelle ancora
    // da fissare, in ordine di giornata. Ordinando sulla sola stringa della
    // data, quelle vuote finirebbero in cima al calendario.
    const partite = [...(attivo.calendario || [])].sort((a, b) =>
      (a.data ? 0 : 1) - (b.data ? 0 : 1)
      || (a.data + a.ora).localeCompare(b.data + b.ora)
      || (a.giornata || 0) - (b.giornata || 0));
    if (!partite.length) {
      elCal.innerHTML = `<p class="vuoto">Il calendario non è ancora uscito.
        Appena c'è, date e avversari compaiono qui.</p>`;
      return;
    }

    elCal.innerHTML = partite.map((m) => {
      if (m.stato === 'giocata') return SP.rigaRisultato(m, noi);
      const inCasa = m.casa === noi;
      const daFissare = !m.data || m.stato === 'da_definire';
      // Giorno e ora stanno insieme nella riga sotto, non in mezzo alle due
      // squadre: al posto del punteggio ci va "VS", altrimenti l'orario si
      // legge come il risultato della partita.
      const riga = [
        m.girone ? SP.esc(m.girone) : null,
        m.giornata != null ? `giornata ${SP.esc(m.giornata)}` : null,
        daFissare ? '<b>data e ora da definire</b>' : `${SP.dataIt(m.data)}, ore ${SP.esc(m.ora)}`,
        SP.esc(m.campo),
        m.stato === 'rinviata' ? '<b>rinviata</b>' : null,
      ].filter(Boolean).join(' &middot; ');
      return `<article class="risultato" data-esito="">
        <div class="sq ${inCasa ? 'noi' : ''}">${SP.esc(m.casa)}</div>
        <div class="punteggio vs">VS</div>
        <div class="sq ${inCasa ? '' : 'noi'}">${SP.esc(m.ospite)}</div>
        <div class="data">${riga}</div>
      </article>`;
    }).join('');
  }

  disegna();
})();
