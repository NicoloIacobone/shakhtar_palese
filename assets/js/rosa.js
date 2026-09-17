/* rosa.js — la rosa presentata una persona al giorno.
   Compaiono solo le persone che hanno gia' la loro locandina pubblicata, cioe'
   con "pubblicato": true in data/locandine.json — le foto possono essere
   caricate tutte in anticipo, e' il flag a decidere quando escono
   (regola attivabile da data/config.json -> rosa.mostra_solo_presentati).
   Le altre restano nei dati, pronte, e appaiono da sole al prossimo sync.
   La griglia mette in cima l'ultimo presentato: reparti dagli attaccanti ai
   portieri e, dentro il reparto, dalla locandina piu' recente.
   La foto NON e' scritta in rosa.json: i giocatori si collegano col numero di
   maglia, staff e tifosi col cognome.
   La scheda aperta mostra anche lo spider chart delle caratteristiche (da 1 a
   10, scritte in rosa.json sotto "caratteristiche" e modificabili dal pannello
   locale). Oltre ai reparti i filtri sono tre: "Staff", "Pelati" (chi ha la
   lunghezza dei capelli a PELATO_MAX, cioe' i pelati veri), "De Tullio",
   che raduna la dinastia, e "Tifosi", che porta in griglia il blocco in fondo.
   Staff e tifosi sono due liste separate di rosa.json ma si comportano allo
   stesso modo: stessa card, stessa scheda, stesso blocco a fine pagina. */

(async function rosa() {
  const griglia    = document.getElementById('griglia-rosa');
  const grigliaSt  = document.getElementById('griglia-staff');
  const bloccoSt   = document.getElementById('blocco-staff');
  const grigliaTf  = document.getElementById('griglia-tifosi');
  const bloccoTf   = document.getElementById('blocco-tifosi');
  const filtri     = document.getElementById('filtri-ruolo');
  const notaFiltro = document.getElementById('nota-filtro');
  const avanzam    = document.getElementById('avanzamento-rosa');
  const intro      = document.getElementById('intro-rosa');
  const modale     = document.getElementById('scheda-giocatore');
  const dentro     = document.getElementById('scheda-contenuto');
  const PLACEHOLDER = 'assets/img/placeholder-giocatore.svg';

  let persone = [], statPerNumero = {}, fotoPerChiave = {}, filtroAttivo = 'tutti';
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
      ...(r.tifosi || []).map((p) => marca(p, 'tifoso')),
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
    } else {
      // Ci siamo tutti (o la regola "solo presentati" e' spenta): la barra non
      // ha piu' niente da dire e sparisce. Se un domani entra qualcuno di nuovo
      // in rosa, il conteggio "N di M" qui sopra torna da solo.
      avanzam.hidden = true;
    }
  }
  if (intro && soloPresentati && presentati === 0) {
    intro.textContent = 'La presentazione della rosa comincia a breve. Torna fra poco.';
  }

  /* ------------------------------------------------------------ filtri --- */
  /* Oltre ai reparti ci sono quattro filtri che non sono ruoli: "Staff" e
     "Tifosi" portano nella griglia principale chi di solito sta nei blocchi in
     fondo, "Pelati" tiene i pelati veri e "De Tullio" raduna la dinastia. Tutti
     compaiono solo se hanno qualcuno dentro: un chip che apre una griglia vuota
     non serve. */
  const PELATO_MAX = 1;                       // pelato = capelli a 1, non "cortissimi"
  const DINASTIA = 'De Tullio';               // il cognome che si merita un filtro suo
  const capelli = (p) => p.caratteristiche?.lunghezza_capelli;
  const giocatoriVisibili = () => visibili().filter((p) => p._tipo === 'giocatore');
  const staffVisibile     = () => visibili().filter((p) => p._tipo === 'staff');
  const tifosiVisibili    = () => visibili().filter((p) => p._tipo === 'tifoso');
  // Chi non ha ancora le caratteristiche non e' un pelato: e' uno di cui non si sa
  // niente. Senza questo controllo un campo mancante varrebbe 0 e finirebbe primo.
  const pelati = () => giocatoriVisibili()
    .filter((g) => Number.isFinite(capelli(g)) && capelli(g) <= PELATO_MAX)
    .sort((a, b) => capelli(a) - capelli(b) || (a.numero ?? 0) - (b.numero ?? 0));
  // Confronto sul cognome ripulito (SP.slug), cosi' regge un "de tullio" scritto
  // storto nel JSON. Guarda anche lo staff: se un domani ce n'e' uno, sta qui.
  const dinastia = () => visibili()
    .filter((p) => SP.slug(p.cognome || '') === SP.slug(DINASTIA))
    .sort(perGriglia);

  const ruoli = [...new Set(giocatoriVisibili().map((g) => g.ruolo))]
    .sort((a, b) => pesoRuolo(a) - pesoRuolo(b));
  const FILTRI = [
    { id: 'tutti', et: 'Tutti' },
    ...ruoli.map((r) => ({ id: r, et: SP.plurale(r) })),
    ...(staffVisibile().length ? [{ id: 'staff', et: 'Staff' }] : []),
    ...(tifosiVisibili().length ? [{ id: 'tifosi', et: 'Tifosi' }] : []),
    ...(pelati().length ? [{ id: 'pelati', et: 'Pelati' }] : []),
    ...(dinastia().length ? [{ id: 'dinastia', et: DINASTIA }] : []),
  ];
  const NOTE_FILTRO = {
    pelati: `Solo chi ha la lunghezza dei capelli a ${PELATO_MAX}: i pelati veri.`,
    dinastia: `Tutti i ${DINASTIA} della rosa in una griglia sola.`,
  };
  // Con uno o due giocatori i filtri non servono a niente: li mostro da 3 in su.
  if (FILTRI.length > 2 && giocatoriVisibili().length > 2) {
    filtri.innerHTML = FILTRI.map((f) =>
      `<button class="chip" type="button" data-filtro="${SP.esc(f.id)}" aria-pressed="${f.id === 'tutti'}">
         ${SP.esc(f.et)}</button>`).join('');
    filtri.addEventListener('click', (e) => {
      const b = e.target.closest('[data-filtro]');
      if (!b) return;
      filtroAttivo = b.dataset.filtro;
      filtri.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
      disegna();
    });
  } else {
    filtri.hidden = true;
  }

  /* ------------------------------------------------------- le griglie --- */
  function disegna() {
    const aParte = filtroAttivo === 'tutti';   // col filtro attivo i blocchi in fondo spariscono
    let lista, vuoto = 'Nessuno con questo ruolo.';
    if (filtroAttivo === 'staff') {
      lista = staffVisibile().sort(perGriglia);
      vuoto = 'Nessuno dello staff presentato, per ora.';
    } else if (filtroAttivo === 'tifosi') {
      lista = tifosiVisibili().sort(perGriglia);
      vuoto = 'Nessun tifoso presentato, per ora.';
    } else if (filtroAttivo === 'pelati') {
      lista = pelati();
      vuoto = 'Nessun pelato. Per adesso.';
    } else if (filtroAttivo === 'dinastia') {
      lista = dinastia();
      vuoto = `Nessun ${DINASTIA} presentato, per ora.`;
    } else {
      lista = giocatoriVisibili()
        .filter((g) => filtroAttivo === 'tutti' || g.ruolo === filtroAttivo)
        .sort(perGriglia);
    }

    if (notaFiltro) {
      notaFiltro.textContent = NOTE_FILTRO[filtroAttivo] || '';
      notaFiltro.hidden = !notaFiltro.textContent;
    }

    griglia.innerHTML = lista.length
      ? lista.map((g) => SP.cardPersona(g, fotoPerChiave[g._chiave])).join('')
      : `<p class="vuoto" style="grid-column:1/-1">${soloPresentati && presentati === 0
          ? 'Ancora nessuno presentato. Le card arrivano una al giorno su Instagram.'
          : vuoto}</p>`;

    // Staff e tifosi non hanno reparti: resta l'ordine di uscita.
    const inFondo = (blocco, griglia, gente) => {
      if (!blocco) return;
      blocco.hidden = !aParte || gente.length === 0;
      griglia.innerHTML = gente.map((p) => SP.cardPersona(p, fotoPerChiave[p._chiave])).join('');
    };
    inFondo(bloccoSt, grigliaSt, staffVisibile().sort(perGriglia));
    inFondo(bloccoTf, grigliaTf, tifosiVisibili().sort(perGriglia));
  }
  disegna();

  /* --------------------------------------------------- spider chart --- */
  /* Le cinque caratteristiche di rosa.json, da 1 a 10. L'ORDINE di questa lista
     e' anche la posizione sul grafico: la prima sta in alto, le altre in senso
     orario. Per aggiungerne una basta metterla qui (e nel pannello e in
     check_data.py): il pentagono diventa un esagono da solo. */
  const CARATTERISTICHE = [
    { k: 'fame_gol',           righe: ['Fame', 'di gol'] },
    { k: 'fiducia_presidente', righe: ['Fiducia nel', 'presidente'] },
    { k: 'fiducia_allenatore', righe: ['Fiducia', "nell'allenatore"] },
    { k: 'lunghezza_pene',     righe: ['Lunghezza', 'pene'] },
    { k: 'lunghezza_capelli',  righe: ['Lunghezza', 'capelli'] },
  ];
  const CAR_MAX = 10;
  const CAR_ANELLI = [2, 4, 6, 8, 10];

  const valoreCar = (car, k) => {
    const n = Number(car?.[k]);
    return Number.isFinite(n) ? Math.max(0, Math.min(CAR_MAX, n)) : null;
  };
  /* Il grafico esce solo se c'e' almeno un valore: cosi' chi non e' ancora stato
     "valutato" ha la scheda di prima, senza un pentagono schiacciato al centro. */
  const haCaratteristiche = (p) => CARATTERISTICHE.some((c) => valoreCar(p.caratteristiche, c.k) !== null);

  function spider(p) {
    const car = p.caratteristiche || {};
    const R = 86, CX = 170, CY = 128, PASSO = 12;
    const angolo = (i) => (-90 + i * (360 / CARATTERISTICHE.length)) * Math.PI / 180;
    const punto = (i, raggio) => {
      const a = angolo(i);
      return [CX + Math.cos(a) * raggio, CY + Math.sin(a) * raggio];
    };
    const poligono = (raggi) => raggi
      .map((r, i) => punto(i, r).map((n) => n.toFixed(1)).join(',')).join(' ');

    const valori = CARATTERISTICHE.map((c) => valoreCar(car, c.k) ?? 0);
    const raggi = valori.map((v) => (v / CAR_MAX) * R);

    const anelli = CAR_ANELLI.map((liv) =>
      `<polygon class="rc-griglia" points="${poligono(CARATTERISTICHE.map(() => (liv / CAR_MAX) * R))}"/>`).join('');
    const assi = CARATTERISTICHE.map((c, i) => {
      const [x, y] = punto(i, R);
      return `<line class="rc-asse" x1="${CX}" y1="${CY}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`;
    }).join('');
    const punte = raggi.map((r, i) => {
      const [x, y] = punto(i, r);
      return `<circle class="rc-punto" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.8"/>`;
    }).join('');

    const etichette = CARATTERISTICHE.map((c, i) => {
      const [x, y] = punto(i, R + 14);
      const ux = Math.cos(angolo(i)), uy = Math.sin(angolo(i));
      const ancora = ux > 0.2 ? 'start' : ux < -0.2 ? 'end' : 'middle';
      const n = c.righe.length;
      // L'etichetta si appoggia al vertice: sopra se l'asse punta in alto,
      // sotto se punta in basso, centrata sulle due punte laterali.
      const base = uy < -0.5 ? y - 6 - (n - 1) * PASSO
                 : uy > 0.5  ? y + 14
                 : y - ((n - 1) * PASSO) / 2 + 4;
      const xs = x.toFixed(1);
      const righe = c.righe.map((t, j) => {
        const num = j === n - 1
          ? ` <tspan class="rc-num">${valoreCar(car, c.k) ?? '&ndash;'}</tspan>` : '';
        return `<tspan x="${xs}"${j ? ` dy="${PASSO}"` : ''}>${SP.esc(t)}${num}</tspan>`;
      }).join('');
      return `<text class="rc-et" x="${xs}" y="${base.toFixed(1)}" text-anchor="${ancora}">${righe}</text>`;
    }).join('');

    const riassunto = CARATTERISTICHE
      .map((c) => `${c.righe.join(' ').toLowerCase()} ${valoreCar(car, c.k) ?? 'non assegnata'}`)
      .join(', ');

    return `<svg class="radar" viewBox="0 0 340 250" role="img"
        aria-label="Caratteristiche di ${SP.esc(p.nome + ' ' + p.cognome)}, da 1 a ${CAR_MAX}: ${SP.esc(riassunto)}">
      ${anelli}${assi}
      <polygon class="rc-area" points="${poligono(raggi)}"/>
      ${punte}${etichette}
    </svg>`;
  }

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

    const OCCHIELLO = { staff: 'Staff', tifoso: 'Tifosi' };
    const occhiello = OCCHIELLO[p._tipo]
      ? `${OCCHIELLO[p._tipo]} &middot; ${SP.esc(p.ruolo)}`
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

      ${haCaratteristiche(p) ? `<div class="scheda-sezione">
        <h3>Caratteristiche</h3>
        ${spider(p)}
        <p class="rc-nota">Valori da 1 a 10, assegnati a insindacabile giudizio dello spogliatoio.</p>
      </div>` : ''}

      ${st ? `<div class="scheda-sezione">
        <h3>Statistiche</h3>
        <div class="scheda-stat">
          ${stat('gol', st.gol)}${stat('gialli', st.ammonizioni)}${stat('rossi', st.espulsioni)}
          ${stat('MVP', st.mvp)}
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
