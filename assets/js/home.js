/* home.js — prossima partita + countdown, ultimi 3 risultati, ultimi presentati. */

(async function home() {
  const elProssima  = document.getElementById('prossima-partita');
  const elRisultati = document.getElementById('ultimi-risultati');
  const elPresentati = document.getElementById('ultimi-presentati');

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

    // Ultimi 3 risultati NOSTRI, dal piu' recente. Il calendario contiene tutte
    // le partite del girone: in home interessano solo quelle che giochiamo noi
    // (le altre finirebbero anche colorate a caso, non avendo un nostro esito).
    const giocate = torneo.calendario
      .filter((m) => m.stato === 'giocata' && (m.casa === noi || m.ospite === noi))
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
      elProssima.innerHTML = `<div class="card">
        <h2>Calendario in arrivo</h2>
        <p class="sottotitolo">Il ${SP.esc(torneo.nome)} non è ancora cominciato: appena escono
        date e avversari li trovi qui, con il conto alla rovescia.</p>
        <div class="gruppo-btn" style="margin-top:1rem">
          <a class="btn btn-fantasma" href="tornei.html">Vai al torneo</a>
        </div>
      </div>`;
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
      elRisultati.innerHTML = `<p class="vuoto">Non abbiamo ancora giocato niente.
        Imbattuti, se vogliamo vedere il bicchiere mezzo pieno.</p>`;
      return;
    }
    elRisultati.innerHTML = partite.map((m) => SP.rigaRisultato(m, noi)).join('');
  }

  /* ------------------------------------------ ultimi presentati (rosa) --- */
  try {
    const [cfg, r, l] = await Promise.all([
      SP.dati('config.json'),
      SP.dati('rosa.json'),
      SP.dati('locandine.json').catch(() => ({ locandine: [] })),
    ]);

    // Le locandine sono gia' in ordine cronologico inverso: le uso per sapere
    // chi e' stato presentato per ultimo.
    const persone = [
      ...(r.giocatori || []).map((p) => ({ ...p, _chiave: SP.chiavePersona(p) })),
      ...(r.staff || []).map((p) => ({ ...p, _chiave: SP.chiavePersona(p) })),
    ];
    const perChiave = Object.fromEntries(persone.map((p) => [p._chiave, p]));

    const ultimi = [];
    for (const loc of l.locandine || []) {
      if (loc.valida === false) continue;
      const p = perChiave[SP.chiaveLocandina(loc)];
      if (p && !ultimi.some((u) => u.p._chiave === p._chiave)) ultimi.push({ p, loc });
      if (ultimi.length === 4) break;
    }

    const mancano = persone.length - (l.locandine || []).filter((x) => x.valida !== false).length;
    const sotto = document.getElementById('sottotitolo-presentati');
    if (sotto && cfg.rosa?.mostra_solo_presentati !== false) {
      sotto.textContent = mancano > 0
        ? `Ne mancano ancora ${mancano}. Uno al giorno, su Instagram e qui.`
        : 'Ci siamo tutti.';
    }

    if (!ultimi.length) {
      elPresentati.innerHTML = `<p class="vuoto" style="grid-column:1/-1">
        Le presentazioni cominciano a breve.</p>`;
      return;
    }
    elPresentati.innerHTML = ultimi
      .map(({ p, loc }) => SP.cardPersona(p, loc, { href: 'rosa.html' }))
      .join('');
  } catch (e) {
    console.error(e);
    SP.errore(elPresentati, e.message);
  }
})();
