/* tornei.js — classifica + calendario. Gestisce piu' tornei: quello corrente
   e l'archivio, scelti con i chip in alto. */

(async function tornei() {
  const elScelta   = document.getElementById('scelta-torneo');
  const elClass    = document.getElementById('classifica');
  const elCal      = document.getElementById('calendario');
  const elTitolo   = document.getElementById('titolo-torneo');
  const elSotto    = document.getElementById('sottotitolo-torneo');

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
  if (!attivo) { elClass.innerHTML = '<p class="vuoto">Nessun torneo in data/tornei.json.</p>'; return; }

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
    const STATI = { in_corso: 'in corso', concluso: 'concluso', in_programma: 'in programma' };

    elTitolo.textContent = attivo.nome;
    const ig = attivo.instagram
      ? ` &middot; <a href="https://instagram.com/${SP.esc(attivo.instagram)}" target="_blank" rel="noopener">@${SP.esc(attivo.instagram)}</a>`
      : ' &middot; <span style="color:var(--testo-debole)">Instagram del torneo: da definire</span>';
    elSotto.innerHTML = `Stagione ${SP.esc(attivo.stagione)} &middot; ${SP.esc(STATI[attivo.stato] || attivo.stato)}${ig}`;

    /* ------------------------------------------------------ classifica --- */
    if (!attivo.classifica || !attivo.classifica.length) {
      elClass.innerHTML = '<p class="vuoto">Questo torneo non ha una classifica (erano amichevoli).</p>';
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

    /* ------------------------------------------- calendario e risultati --- */
    const partite = [...(attivo.calendario || [])].sort((a, b) =>
      (a.data + a.ora).localeCompare(b.data + b.ora));
    if (!partite.length) { elCal.innerHTML = '<p class="vuoto">Calendario non ancora pubblicato.</p>'; return; }

    elCal.innerHTML = partite.map((m) => {
      if (m.stato === 'giocata') return SP.rigaRisultato(m, noi);
      const inCasa = m.casa === noi;
      return `<article class="risultato" data-esito="">
        <div class="sq ${inCasa ? 'noi' : ''}">${SP.esc(m.casa)}</div>
        <div class="punteggio" style="color:var(--testo-debole);font-size:.8rem">${SP.esc(m.ora)}</div>
        <div class="sq ${inCasa ? '' : 'noi'}">${SP.esc(m.ospite)}</div>
        <div class="data">${SP.dataIt(m.data)} &middot; ${SP.esc(m.campo)} &middot; da giocare</div>
      </article>`;
    }).join('');
  }

  disegna();
})();
