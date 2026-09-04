/* rosa.js — la rosa presentata una persona al giorno.
   Compaiono solo le persone che hanno gia' la loro locandina pubblicata, cioe'
   con "pubblicato": true in data/locandine.json — le foto possono essere
   caricate tutte in anticipo, e' il flag a decidere quando escono
   (regola attivabile da data/config.json -> rosa.mostra_solo_presentati).
   Le altre restano nei dati, pronte, e appaiono da sole al prossimo sync.
   La griglia mette in cima l'ultimo presentato: reparti dagli attaccanti ai
   portieri e, dentro il reparto, dalla locandina piu' recente.
   La foto NON e' scritta in rosa.json: i giocatori si collegano col numero di
   maglia, lo staff col cognome. */

(async function rosa() {
  const griglia    = document.getElementById('griglia-rosa');
  const grigliaSt  = document.getElementById('griglia-staff');
  const bloccoSt   = document.getElementById('blocco-staff');
  const filtri     = document.getElementById('filtri-ruolo');
  const avanzam    = document.getElementById('avanzamento-rosa');
  const intro      = document.getElementById('intro-rosa');
  const modale     = document.getElementById('scheda-giocatore');
  const dentro     = document.getElementById('scheda-contenuto');
  const PLACEHOLDER = 'assets/img/placeholder-giocatore.svg';

  let persone = [], statPerNumero = {}, fotoPerChiave = {}, ruoloAttivo = 'tutti';
  let soloPresentati = true;

  try {
    const [cfg, r, s, l] = await Promise.all([
      SP.dati('config.json'),
      SP.dati('rosa.json'),
      SP.dati('statistiche.json').catch(() => ({ giocatori: [] })),
      SP.dati('locandine.json').catch(() => ({ locandine: [] })),
    ]);
    soloPresentati = cfg.rosa?.mostra_solo_presentati !== false;

    (s.giocatori || []).forEach((x) => { statPerNumero[x.numero] = x; });
    // Se una persona ha piu' locandine vince la piu' recente (le prime della lista).
    (l.locandine || []).forEach((x) => {
      const k = SP.chiaveLocandina(x);
      if (SP.pubblicata(x) && !fotoPerChiave[k]) fotoPerChiave[k] = x;
    });

    const marca = (p, tipo) => ({ ...p, _tipo: tipo, _chiave: SP.chiavePersona(p) });
    persone = [
      ...(r.giocatori || []).map((p) => marca(p, 'giocatore')),
      ...(r.staff || []).map((p) => marca(p, 'staff')),
    ];
  } catch (e) {
    console.error(e);
    SP.errore(griglia, e.message);
    return;
  }

  const haFoto = (p) => Boolean(fotoPerChiave[p._chiave]);
  const visibili = () => (soloPresentati ? persone.filter(haFoto) : persone);

  /* ------------------------------------------- ordine delle griglie --- */
  /* L'ultimo presentato sta sempre in cima. Quindi: prima per reparto, in ordine
     inverso rispetto a come esce la squadra (attaccanti, centrocampisti,
     difensori, portieri), poi per data di uscita dalla piu' recente. Uscendo
     POR -> DEF -> CEN -> ATT i due criteri coincidono; separarli serve solo
     perche' il giorno che presenti qualcuno fuori sequenza il suo reparto resti
     compatto, invece di spezzarsi in due. */
  const ORDINE_RUOLI = ['Attaccante', 'Centrocampista', 'Difensore', 'Portiere'];
  const pesoRuolo = (ruolo) => {
    const i = ORDINE_RUOLI.indexOf(ruolo);
    return i === -1 ? ORDINE_RUOLI.length : i;   // un ruolo che non conosco va in fondo
  };
  const uscitoIl = (p) => fotoPerChiave[p._chiave]?.data || '';
  const perGriglia = (a, b) => {
    const da = uscitoIl(a), db = uscitoIl(b);
    return pesoRuolo(a.ruolo) - pesoRuolo(b.ruolo)
      // Chi non ha ancora la locandina va in coda al suo reparto, non in cima:
      // senza questa riga il "piu' recente per primo" lo premierebbe. Succede
      // solo con mostra_solo_presentati a false.
      || (db ? 1 : 0) - (da ? 1 : 0)
      || db.localeCompare(da)                    // poi il piu' recente per primo
      || (a.numero ?? 0) - (b.numero ?? 0);
  };

  /* ------------------------------------ quante persone sono gia' uscite --- */
  const presentati = persone.filter(haFoto).length;
  const totale = persone.length;
  if (avanzam) {
    if (soloPresentati && presentati < totale) {
      const perc = Math.round((presentati / totale) * 100);
      avanzam.innerHTML = `<span class="barra"><span style="width:${perc}%"></span></span>
        <span><b>${presentati}</b> di ${totale} presentati &middot; i prossimi arrivano uno al giorno</span>`;
    } else if (soloPresentati) {
      avanzam.innerHTML = `<span class="barra"><span style="width:100%"></span></span>
        <span>Presentati tutti e <b>${totale}</b>. Adesso si gioca.</span>`;
    } else {
      avanzam.hidden = true;
    }
  }
  if (intro && soloPresentati && presentati === 0) {
    intro.textContent = 'La presentazione della rosa comincia a breve. Torna fra poco.';
  }

  /* ------------------------------------------------- filtri per ruolo --- */
  const giocatoriVisibili = () => visibili().filter((p) => p._tipo === 'giocatore');
  const ruoli = ['tutti', ...[...new Set(giocatoriVisibili().map((g) => g.ruolo))]
    .sort((a, b) => pesoRuolo(a) - pesoRuolo(b))];
  // Con uno o due giocatori i filtri non servono a niente: li mostro da 3 in su.
  if (ruoli.length > 2 && giocatoriVisibili().length > 2) {
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
  } else {
    filtri.hidden = true;
  }

  /* ------------------------------------------------------- le griglie --- */
  function disegna() {
    const lista = giocatoriVisibili()
      .filter((g) => ruoloAttivo === 'tutti' || g.ruolo === ruoloAttivo)
      .sort(perGriglia);

    griglia.innerHTML = lista.length
      ? lista.map((g) => SP.cardPersona(g, fotoPerChiave[g._chiave])).join('')
      : `<p class="vuoto" style="grid-column:1/-1">${soloPresentati && presentati === 0
          ? 'Ancora nessuno presentato. Le card arrivano una al giorno su Instagram.'
          : 'Nessuno con questo ruolo.'}</p>`;

    // Lo staff non ha reparti: resta l'ordine di uscita.
    const staff = visibili().filter((p) => p._tipo === 'staff').sort(perGriglia);
    bloccoSt.hidden = staff.length === 0;
    grigliaSt.innerHTML = staff.map((p) => SP.cardPersona(p, fotoPerChiave[p._chiave])).join('');
  }
  disegna();

  /* --------------------------------------------- scheda in una modale --- */
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.player-card[data-chiave]');
    if (card) apriScheda(card.dataset.chiave);
  });

  function apriScheda(chiave) {
    const p = persone.find((x) => x._chiave === chiave);
    if (!p) return;
    const f = fotoPerChiave[chiave];
    const st = p.numero != null ? statPerNumero[p.numero] : null;

    // Un campo vuoto non si mostra: meglio una scheda corta che una piena di trattini.
    const dato = (et, vl) => vl ? `<div class="dato"><dt>${SP.esc(et)}</dt><dd>${SP.esc(vl)}</dd></div>` : '';
    const stat = (et, vl) => `<div><b>${SP.esc(vl ?? 0)}</b><small>${et}</small></div>`;
    const gruppo = (titolo, dati) => dati.trim()
      ? `<div class="scheda-sezione"><h3>${titolo}</h3><dl class="dati">${dati}</dl></div>` : '';

    const occhiello = p._tipo === 'staff'
      ? `Staff &middot; ${SP.esc(p.ruolo)}`
      : `#${SP.esc(p.numero)} &middot; ${SP.esc(p.ruolo)}`;

    dentro.innerHTML = `
      <button class="btn-icona modale-chiudi" type="button" data-chiudi aria-label="Chiudi la scheda">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
      <div class="scheda-testa">
        <div class="scheda-foto">
          <img src="${SP.esc(f ? (f.web || f.file) : PLACEHOLDER)}"
               alt="${SP.esc(p.nome + ' ' + p.cognome)}" width="400" height="600" loading="lazy" decoding="async">
        </div>
        <div>
          <p class="occhiello">${occhiello}</p>
          <h2 class="scheda-nome">${SP.esc(p.nome)} ${SP.esc(p.cognome)}</h2>
          ${p.soprannome ? `<p class="scheda-sopr">&ldquo;${SP.esc(p.soprannome)}&rdquo;</p>` : ''}
          ${f && f.didascalia ? `<p class="scheda-dida">${SP.esc(f.didascalia)}</p>` : ''}
        </div>
      </div>

      ${gruppo('Dati di base', [
        dato('Numero', p.numero),
        dato('Ruolo', p.ruolo),
        dato('Piede preferito', p.piede),
        dato('Provenienza', p.provenienza),
        dato('Classe', p.classe),
      ].join(''))}

      ${gruppo('Segni particolari', [
        dato('Posizione preferita', p.posizione_preferita),
        dato('Frase preferita', p.frase_preferita),
        dato('Superstizione pre-partita', p.superstizione),
        dato('Rito post-allenamento', p.rito_post_allenamento),
        dato('Skill fuori dal campo', p.skill_fuori_campo),
      ].join(''))}

      ${st ? `<div class="scheda-sezione">
        <h3>Statistiche</h3>
        <div class="scheda-stat">
          ${stat('presenze', st.presenze)}${stat('minuti', st.minuti)}${stat('gol', st.gol)}
          ${stat('assist', st.assist)}${stat('gialli', st.ammonizioni)}${stat('rossi', st.espulsioni)}
          ${stat('MVP', st.mvp)}${stat('papere', st.papere)}${stat('gol sbagliati', st.gol_sbagliati)}
          ${stat('ritardi', st.ritardi)}${stat('multe €', st.multe_euro)}
        </div>
        <p style="margin-top:1rem"><a href="statistiche.html">Confrontalo con gli altri &rarr;</a></p>
      </div>` : ''}`;

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
