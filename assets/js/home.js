/* home.js — prossima partita + countdown, ultimi 3 risultati, ultime locandine. */

(async function home() {
  const elProssima  = document.getElementById('prossima-partita');
  const elRisultati = document.getElementById('ultimi-risultati');
  const elLocandine = document.getElementById('ultime-locandine');

  /* ---------------------------------------- torneo corrente e partite --- */
  try {
    const t = await SP.dati('tornei.json');
    const torneo = t.tornei.find((x) => x.id === t.corrente) || t.tornei[0];
    if (!torneo) throw new Error('nessun torneo in tornei.json');
    const noi = torneo.nostra_squadra;

    // Prossima partita = prima "da_giocare" in ordine cronologico.
    const daGiocare = torneo.calendario
      .filter((m) => m.stato === 'da_giocare')
      .sort((a, b) => (a.data + a.ora).localeCompare(b.data + b.ora));
    disegnaProssima(daGiocare[0], torneo, noi);

    // Ultimi 3 risultati, dal piu' recente.
    const giocate = torneo.calendario
      .filter((m) => m.stato === 'giocata')
      .sort((a, b) => (b.data + b.ora).localeCompare(a.data + a.ora))
      .slice(0, 3);
    disegnaRisultati(giocate, noi);
  } catch (e) {
    console.error(e);
    SP.errore(elProssima, e.message);
    SP.errore(elRisultati, e.message);
  }

  function disegnaProssima(m, torneo, noi) {
    if (!m) {
      elProssima.innerHTML = `<div class="card"><h2>Nessuna partita in calendario</h2>
        <p class="sottotitolo">Il ${SP.esc(torneo.nome)} per ora tace. Aggiungi la prossima in
        <code>data/tornei.json</code>.</p></div>`;
      return;
    }
    const inCasa = m.casa === noi;
    const avversario = inCasa ? m.ospite : m.casa;
    elProssima.innerHTML = `
      <div class="card prossima">
        <div class="prossima-testa">
          <span class="badge-placeholder" style="color:var(--arancio);border-color:var(--arancio)">${SP.esc(torneo.nome)}</span>
          <span style="color:var(--testo-debole);font-size:.8rem">Giornata ${SP.esc(m.giornata)} &middot; ${inCasa ? 'in casa' : 'in trasferta'}</span>
        </div>
        <div class="sfida">
          <div class="sfida-squadra ${inCasa ? 'noi' : ''}">${SP.esc(m.casa)}</div>
          <div class="sfida-vs">VS</div>
          <div class="sfida-squadra ${inCasa ? '' : 'noi'}">${SP.esc(m.ospite)}</div>
        </div>
        <div class="dettagli-partita">
          <span>${SP.dataIt(m.data)}</span><span>ore ${SP.esc(m.ora)}</span><span>${SP.esc(m.campo)}</span>
        </div>
        <div class="countdown" id="countdown" aria-live="off">
          <div><b data-cd="g">--</b><small>giorni</small></div>
          <div><b data-cd="h">--</b><small>ore</small></div>
          <div><b data-cd="m">--</b><small>min</small></div>
          <div><b data-cd="s">--</b><small>sec</small></div>
        </div>
        <p class="sr-only" id="countdown-testo" aria-live="polite"></p>
      </div>`;
    avviaCountdown(SP.quando(m.data, m.ora), avversario);
  }

  /* Countdown client-side: nessun orario del server, solo l'orologio del telefono. */
  function avviaCountdown(quando, avversario) {
    const box = document.getElementById('countdown');
    if (!box || !quando) return;
    const campi = {
      g: box.querySelector('[data-cd="g"]'), h: box.querySelector('[data-cd="h"]'),
      m: box.querySelector('[data-cd="m"]'), s: box.querySelector('[data-cd="s"]'),
    };
    const testo = document.getElementById('countdown-testo');

    function tick() {
      let diff = quando.getTime() - Date.now();
      if (diff <= 0) {
        box.innerHTML = `<div style="grid-column:1/-1"><b>Si gioca!</b>
          <small>fischio d'inizio contro ${SP.esc(avversario)}</small></div>`;
        clearInterval(timer);
        return;
      }
      const s = Math.floor(diff / 1000);
      const due = (n) => String(n).padStart(2, '0');
      campi.g.textContent = Math.floor(s / 86400);
      campi.h.textContent = due(Math.floor(s / 3600) % 24);
      campi.m.textContent = due(Math.floor(s / 60) % 60);
      campi.s.textContent = due(s % 60);
      if (testo) testo.textContent = `Mancano ${campi.g.textContent} giorni e ${campi.h.textContent} ore.`;
    }
    tick();
    const timer = setInterval(tick, 1000);
  }

  function disegnaRisultati(partite, noi) {
    if (!partite.length) {
      elRisultati.innerHTML = '<p class="vuoto">Ancora nessuna partita giocata. Meglio cosi&#39;, per ora.</p>';
      return;
    }
    elRisultati.innerHTML = partite.map((m) => SP.rigaRisultato(m, noi)).join('');
  }

  /* ------------------------------------------------ ultime 4 locandine --- */
  try {
    const l = await SP.dati('locandine.json');
    const ultime = (l.locandine || []).slice(0, 4);
    if (!ultime.length) {
      elLocandine.innerHTML = `<p class="vuoto" style="grid-column:1/-1">Nessuna locandina ancora pubblicata.
        Lancia <code>sync.command</code> dopo aver messo le immagini in <code>foto_presentazione/</code>.</p>`;
      return;
    }
    elLocandine.innerHTML = ultime.map((x) => `
      <a class="locandina" href="convocati.html" aria-label="Locandina di ${SP.esc(x.giocatore || x.cognome)}">
        <img src="${SP.esc(x.thumb)}" alt="Locandina di ${SP.esc(x.giocatore || x.cognome)}"
             width="${SP.esc(x.thumb_w)}" height="${SP.esc(x.thumb_h)}" loading="lazy" decoding="async">
        <div class="didascalia"><b>${SP.esc(x.giocatore || x.cognome)}</b><small>#${SP.esc(x.numero ?? '?')} &middot; ${SP.dataIt(x.data, false)}</small></div>
      </a>`).join('');
  } catch (e) {
    console.error(e);
    SP.errore(elLocandine, e.message);
  }
})();
