/* =========================================================================
   admin.js — editor locale dei JSON del sito.
   Non salva niente da solo: carica da ../data/, ti fa modificare, e ti fa
   scaricare il file aggiornato da mettere al posto di quello vecchio.
   ========================================================================= */

(function admin() {
  const elTab      = document.getElementById('tab');
  const elPannello = document.getElementById('pannello');
  const elMessaggi = document.getElementById('messaggi');
  const elStato    = document.getElementById('stato-validazione');

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* Cosa e' caricato in memoria, per nome di file JSON. */
  const doc = {};

  /* I campi si indirizzano col punto quando stanno dentro un oggetto annidato:
     'caratteristiche.fame_gol' legge e scrive riga.caratteristiche.fame_gol.
     Senza punto e' un campo normale, come e' sempre stato. */
  const leggi = (obj, k) => k.split('.').reduce((o, pezzo) => (o == null ? undefined : o[pezzo]), obj);
  const scrivi = (obj, k, v) => {
    const pezzi = k.split('.');
    const ultimo = pezzi.pop();
    const dentro = pezzi.reduce((o, pezzo) => (o[pezzo] ??= {}), obj);
    dentro[ultimo] = v;
  };

  /* Le caratteristiche dello spider chart. Stessa lista, stessi nomi di campo, in
     tre posti: qui, in assets/js/rosa.js (che le disegna) e in tools/check_data.py
     (che le controlla). Se ne aggiungi una, aggiungila in tutti e tre. */
  const CAR_MIN = 1, CAR_MAX = 10;
  const CARATTERISTICHE = [
    { k: 'lunghezza_capelli',  et: 'Capelli' },
    { k: 'lunghezza_pene',     et: 'Pene' },
    { k: 'fame_gol',           et: 'Fame di gol' },
    { k: 'fiducia_presidente', et: 'Fiducia nel presidente' },
    { k: 'fiducia_allenatore', et: "Fiducia nell'allenatore" },
  ];
  const CARATTERISTICHE_DEFAULT = Object.fromEntries(CARATTERISTICHE.map((c) => [c.k, 5]));

  /* -----------------------------------------------------------------------
     Definizione delle sezioni. Per aggiungere un campo a una tabella basta
     aggiungere una voce a "campi": tipo 'int' obbliga a un numero, 'scala' un
     cursore da 1 a 10, 'fisso' una casella che si legge e non si tocca; 'obbl'
     evidenzia il campo se lo lasci vuoto. Con "soloModifica" la sezione non fa
     aggiungere ne' togliere righe: lavora su una lista che comanda altrove.
     ----------------------------------------------------------------------- */
  const SEZIONI = [
    {
      id: 'rosa', titolo: 'Rosa', file: 'rosa.json',
      aiuto: 'Un giocatore per riga. Il numero di maglia è la chiave che collega tutto il resto ' +
             '(statistiche e locandine): se lo cambi qui, cambialo anche nelle statistiche. ' +
             'I campi lasciati vuoti semplicemente non compaiono nella scheda sul sito.',
      lista: (d) => d.giocatori,
      nuova: () => ({ numero: 0, nome: '', cognome: '', ruolo: 'Centrocampista', ruolo_sigla: 'CEN',
                      piede: 'destro', provenienza: '', classe: '', soprannome: '',
                      posizione_preferita: '', frase_preferita: '', superstizione: '',
                      rito_post_allenamento: '', skill_fuori_campo: '' }),
      campi: [
        { k: 'numero', et: '#', tipo: 'int', obbl: true },
        { k: 'nome', et: 'Nome', obbl: true },
        { k: 'cognome', et: 'Cognome', obbl: true },
        { k: 'ruolo', et: 'Ruolo', tipo: 'select', obbl: true,
          opzioni: ['Portiere', 'Difensore', 'Centrocampista', 'Attaccante'] },
        { k: 'ruolo_sigla', et: 'Sigla', tipo: 'select', opzioni: ['POR', 'DEF', 'CEN', 'ATT'] },
        { k: 'soprannome', et: 'Soprannome', lungo: true },
        // testo libero, non una tendina: qui ci va la risposta divertente,
        // non solo "destro" o "sinistro"
        { k: 'piede', et: 'Piede preferito', lungo: true },
        { k: 'provenienza', et: 'Provenienza' },
        { k: 'classe', et: 'Classe', tipo: 'int' },
        { k: 'posizione_preferita', et: 'Posizione preferita', lungo: true },
        { k: 'frase_preferita', et: 'Frase preferita', lungo: true },
        { k: 'superstizione', et: 'Superstizione pre-partita', lungo: true },
        { k: 'rito_post_allenamento', et: 'Rito post-allenamento', lungo: true },
        { k: 'skill_fuori_campo', et: 'Skill fuori dal campo', lungo: true },
      ],
    },
    {
      id: 'staff', titolo: 'Staff', file: 'rosa.json',
      aiuto: 'Chi non scende in campo. Non ha numero di maglia: la locandina si collega col ' +
             'cognome, quindi il file va chiamato COGNOME_SIGLA (es. DI_FRANCO_ALL.jpg).',
      lista: (d) => (d.staff || (d.staff = [])),
      nuova: () => ({ codice: 'ALL', nome: '', cognome: '', ruolo: 'Allenatore',
                      ruolo_sigla: 'ALL', provenienza: '', classe: '', soprannome: '',
                      posizione_preferita: '', frase_preferita: '', superstizione: '',
                      rito_post_allenamento: '', skill_fuori_campo: '' }),
      campi: [
        { k: 'codice', et: 'Sigla', tipo: 'select', obbl: true,
          opzioni: ['ALL', 'PRS', 'SMM', 'DS', 'PREP', 'MAG'] },
        { k: 'nome', et: 'Nome', obbl: true },
        { k: 'cognome', et: 'Cognome', obbl: true },
        { k: 'ruolo', et: 'Ruolo per esteso', obbl: true, lungo: true },
        { k: 'soprannome', et: 'Soprannome', lungo: true },
        { k: 'provenienza', et: 'Provenienza' },
        { k: 'classe', et: 'Classe', tipo: 'int' },
        { k: 'posizione_preferita', et: 'Posizione preferita', lungo: true },
        { k: 'frase_preferita', et: 'Frase preferita', lungo: true },
        { k: 'superstizione', et: 'Superstizione pre-partita', lungo: true },
        { k: 'rito_post_allenamento', et: 'Rito post-allenamento', lungo: true },
        { k: 'skill_fuori_campo', et: 'Skill fuori dal campo', lungo: true },
      ],
    },
    {
      id: 'tifosi', titolo: 'Tifosi', file: 'rosa.json',
      aiuto: 'Chi sta dall\'altra parte della rete. Funziona esattamente come lo staff: ' +
             'niente numero di maglia, la locandina si collega col cognome, quindi il file ' +
             'va chiamato COGNOME_SIGLA (es. ROSSI_TIF.jpg). Il cognome deve essere diverso ' +
             'da quelli dello staff, altrimenti le due locandine si scambiano la foto.',
      lista: (d) => (d.tifosi || (d.tifosi = [])),
      nuova: () => ({ codice: 'TIF', nome: '', cognome: '', ruolo: 'Tifoso',
                      ruolo_sigla: 'TIF', provenienza: '', classe: '', soprannome: '',
                      posizione_preferita: '', frase_preferita: '', superstizione: '',
                      rito_post_allenamento: '', skill_fuori_campo: '' }),
      campi: [
        { k: 'codice', et: 'Sigla', tipo: 'select', obbl: true, opzioni: ['TIF', 'ULT'] },
        { k: 'nome', et: 'Nome', obbl: true },
        { k: 'cognome', et: 'Cognome', obbl: true },
        { k: 'ruolo', et: 'Ruolo per esteso', obbl: true, lungo: true },
        { k: 'soprannome', et: 'Soprannome', lungo: true },
        { k: 'provenienza', et: 'Provenienza' },
        { k: 'classe', et: 'Classe', tipo: 'int' },
        { k: 'posizione_preferita', et: 'Posizione preferita', lungo: true },
        { k: 'frase_preferita', et: 'Frase preferita', lungo: true },
        { k: 'superstizione', et: 'Superstizione pre-partita', lungo: true },
        { k: 'rito_post_allenamento', et: 'Rito post-allenamento', lungo: true },
        { k: 'skill_fuori_campo', et: 'Skill fuori dal campo', lungo: true },
      ],
    },
    {
      id: 'caratteristiche', titolo: 'Caratteristiche', file: 'rosa.json', soloModifica: true,
      aiuto: 'Le cinque caratteristiche dello spider chart che si apre nella scheda del giocatore, ' +
             'da 1 a 10. Trascina il cursore, il numero a fianco si aggiorna da solo. ' +
             'Le righe sono quelle della Rosa: qui non si aggiungono né si tolgono giocatori. ' +
             'Il file da scaricare è lo stesso della Rosa (rosa.json), quindi scaricalo una volta ' +
             'sola dopo aver sistemato tutte e due le schede.',
      lista: (d) => d.giocatori,
      /* Un giocatore aggiunto dalla scheda Rosa non ha ancora le caratteristiche:
         gliele metto a 5 (il centro della scala) appena apro questa scheda, cosi'
         nel JSON scaricato non resta mai un blocco a meta'. */
      normalizza: (righe) => righe.forEach((r) => {
        r.caratteristiche = { ...CARATTERISTICHE_DEFAULT, ...(r.caratteristiche || {}) };
      }),
      campi: [
        { k: 'numero', et: '#', tipo: 'fisso' },
        { k: 'cognome', et: 'Chi', tipo: 'fisso' },
        ...CARATTERISTICHE.map((c) => ({ k: `caratteristiche.${c.k}`, et: c.et, tipo: 'scala' })),
      ],
    },
    {
      id: 'statistiche', titolo: 'Statistiche', file: 'statistiche.json',
      aiuto: 'Una riga per giocatore. Il numero deve esistere nella rosa, altrimenti check_data.py protesta. ' +
             'Papere, gol sbagliati, ritardi e multe sono le categorie ironiche: restano numeri veri.',
      lista: (d) => d.giocatori,
      nuova: () => ({ numero: 0, presenze: 0, minuti: 0, gol: 0, assist: 0, ammonizioni: 0,
                      espulsioni: 0, mvp: 0, papere: 0, gol_sbagliati: 0, ritardi: 0, multe_euro: 0 }),
      campi: [
        { k: 'numero', et: '#', tipo: 'int', obbl: true },
        { k: 'presenze', et: 'Presenze', tipo: 'int' },
        { k: 'minuti', et: 'Minuti', tipo: 'int' },
        { k: 'gol', et: 'Gol', tipo: 'int' },
        { k: 'assist', et: 'Assist', tipo: 'int' },
        { k: 'ammonizioni', et: 'Gialli', tipo: 'int' },
        { k: 'espulsioni', et: 'Rossi', tipo: 'int' },
        { k: 'mvp', et: 'MVP', tipo: 'int' },
        { k: 'papere', et: 'Papere', tipo: 'int' },
        { k: 'gol_sbagliati', et: 'Sbagliati', tipo: 'int' },
        { k: 'ritardi', et: 'Ritardi', tipo: 'int' },
        { k: 'multe_euro', et: 'Multe €', tipo: 'int' },
      ],
      /* mostra il nome accanto al numero, cosi' non si edita alla cieca */
      etichettaRiga: (r) => {
        const g = (doc['rosa.json']?.giocatori || []).find((x) => x.numero === Number(r.numero));
        return g ? `${g.cognome} ${g.nome}` : '— non in rosa —';
      },
    },
    {
      id: 'classifica', titolo: 'Classifica', file: 'tornei.json', torneo: true,
      aiuto: 'Classifica del torneo scelto qui sopra. I punti devono valere 3×V + N e la differenza reti GF − GS: ' +
             'check_data.py te lo ricorda se sbagli.',
      lista: (d, t) => t.classifica,
      nuova: () => ({ pos: 0, squadra: '', punti: 0, g: 0, v: 0, n: 0, p: 0, gf: 0, gs: 0, dr: 0 }),
      campi: [
        { k: 'pos', et: 'Pos', tipo: 'int', obbl: true },
        { k: 'squadra', et: 'Squadra', obbl: true, lungo: true },
        { k: 'punti', et: 'Pt', tipo: 'int' },
        { k: 'g', et: 'G', tipo: 'int' }, { k: 'v', et: 'V', tipo: 'int' },
        { k: 'n', et: 'N', tipo: 'int' }, { k: 'p', et: 'P', tipo: 'int' },
        { k: 'gf', et: 'GF', tipo: 'int' }, { k: 'gs', et: 'GS', tipo: 'int' },
        { k: 'dr', et: 'DR', tipo: 'int' },
      ],
      extra: ricalcolaClassifica,
    },
    {
      id: 'calendario', titolo: 'Calendario e prossima partita', file: 'tornei.json', torneo: true,
      aiuto: 'La "prossima partita" della home è la prima riga con stato da_giocare, in ordine di data e ora: ' +
             'è evidenziata in arancione. Per registrare un risultato metti i gol e passa lo stato a "giocata".',
      lista: (d, t) => t.calendario,
      nuova: () => ({ id: 'nuova-' + Date.now().toString(36), giornata: 0, data: '', ora: '20:30',
                      casa: '', ospite: '', gol_casa: null, gol_ospite: null,
                      stato: 'da_giocare', campo: 'De Palo Sporting Center', note: '' }),
      campi: [
        { k: 'id', et: 'Id', obbl: true },
        { k: 'giornata', et: 'G.', tipo: 'int' },
        { k: 'data', et: 'Data', tipo: 'date', obbl: true },
        { k: 'ora', et: 'Ora', tipo: 'time', obbl: true },
        { k: 'casa', et: 'Casa', obbl: true, lungo: true },
        { k: 'ospite', et: 'Ospite', obbl: true, lungo: true },
        { k: 'gol_casa', et: 'Gol C', tipo: 'int', vuotoNull: true },
        { k: 'gol_ospite', et: 'Gol O', tipo: 'int', vuotoNull: true },
        { k: 'stato', et: 'Stato', tipo: 'select', obbl: true,
          opzioni: ['da_giocare', 'giocata', 'rinviata'] },
        { k: 'campo', et: 'Campo', lungo: true },
        { k: 'note', et: 'Note', lungo: true },
      ],
    },
    {
      /* L'unica scheda che non e' una tabella: dentro ci sta il simulatore 3D,
         che ha un editor suo. Il JSON se lo scarica da solo, col bottone in
         fondo al suo pannello — qui non c'e' niente da caricare in memoria,
         per questo non ha "file". */
      id: 'maglia', titolo: 'Maglia', pagina: 'maglia',
      aiuto: 'Il simulatore della maglia, in versione modificabile. Sul sito la stessa maglia ' +
             'si puo\' solo girare e ingrandire: i loghi si spostano solo da qui, e solo ' +
             'con il server locale acceso. Quando sei contento premi «Scarica maglia.json» ' +
             'in fondo al pannello a destra, metti il file in data/ e fai push.',
    },
  ];

  let sezioneAttiva = SEZIONI[0];
  let idxTorneo = 0;

  /* ------------------------------------------------------- caricamento --- */
  (async function carica() {
    const files = [...new Set(SEZIONI.map((s) => s.file).filter(Boolean))];
    try {
      const risposte = await Promise.all(files.map(async (f) => {
        const r = await fetch(`../data/${f}`, { cache: 'no-cache' });
        if (!r.ok) throw new Error(`../data/${f}: HTTP ${r.status}`);
        return [f, await r.json()];
      }));
      risposte.forEach(([f, d]) => { doc[f] = d; });
      const corr = (doc['tornei.json'].tornei || []).findIndex((t) => t.id === doc['tornei.json'].corrente);
      idxTorneo = corr >= 0 ? corr : 0;
      disegnaTab();
      disegna();
    } catch (e) {
      elPannello.innerHTML = `<div class="avviso errore">
        <b>Non riesco a caricare i dati.</b> ${esc(e.message)}
        <p style="margin:.6rem 0 0">Questo pannello va aperto tramite un server locale, non con doppio click sul file.
        Dalla cartella del progetto:</p>
        <p><code>./.venv/bin/python -m http.server</code> &rarr; poi apri
        <code>http://localhost:8000/admin/</code></p></div>`;
    }
  })();

  /* -------------------------------------------------------------- tab --- */
  function disegnaTab() {
    elTab.innerHTML = SEZIONI.map((s) =>
      `<button type="button" role="tab" data-id="${s.id}" aria-selected="${s === sezioneAttiva}">${esc(s.titolo)}</button>`
    ).join('');
    elTab.onclick = (e) => {
      const b = e.target.closest('[data-id]');
      if (!b) return;
      sezioneAttiva = SEZIONI.find((s) => s.id === b.dataset.id);
      disegnaTab();
      disegna();
    };
  }

  /* ---------------------------------------------------------- pannello --- */
  function torneoAttivo() { return (doc['tornei.json'].tornei || [])[idxTorneo]; }

  function righeAttive() {
    const s = sezioneAttiva;
    return s.torneo ? s.lista(doc[s.file], torneoAttivo()) : s.lista(doc[s.file]);
  }

  function disegna() {
    const s = sezioneAttiva;
    if (s.pagina === 'maglia') { disegnaMaglia(s); return; }
    const righe = righeAttive() || [];
    s.normalizza?.(righe);

    const sceltaTorneo = s.torneo ? `
      <label style="font-size:.85rem;color:var(--testo-tenue)">Torneo
        <select id="scelta-torneo" style="margin-left:.4rem;padding:.35rem .5rem;border-radius:6px;
          background:var(--superficie);color:var(--testo);border:1px solid var(--bordo)">
          ${(doc['tornei.json'].tornei || []).map((t, i) =>
            `<option value="${i}"${i === idxTorneo ? ' selected' : ''}>${esc(t.nome)} ${esc(t.stagione)}</option>`).join('')}
        </select>
      </label>` : '';

    elPannello.innerHTML = `
      <div class="barra-sezione">
        <h2>${esc(s.titolo)}</h2>
        ${sceltaTorneo}
        <span class="spazio"></span>
        ${s.soloModifica ? '' : '<button class="btn btn-fantasma" type="button" id="aggiungi">+ Aggiungi riga</button>'}
        <button class="btn btn-primario" type="button" id="scarica">Scarica ${esc(s.file)}</button>
      </div>
      <p class="aiuto">${s.aiuto}</p>
      <div class="editor">
        <table class="editor-tab">
          <thead><tr>
            ${s.campi.map((c) => `<th>${esc(c.et)}${c.obbl ? ' *' : ''}</th>`).join('')}
            ${s.etichettaRiga ? '<th>Chi è</th>' : ''}
            ${s.soloModifica ? '' : '<th></th>'}
          </tr></thead>
          <tbody id="righe">${righe.map((r, i) => rigaHtml(r, i)).join('')}</tbody>
        </table>
      </div>
      <div class="errori-campo" id="errori"></div>`;

    document.getElementById('scelta-torneo')?.addEventListener('change', (e) => {
      idxTorneo = Number(e.target.value); disegna();
    });
    document.getElementById('aggiungi')?.addEventListener('click', () => {
      righeAttive().push(s.nuova()); disegna();
    });
    document.getElementById('scarica').addEventListener('click', () => scarica(s.file));

    const tbody = document.getElementById('righe');
    tbody.addEventListener('input', suModifica);
    tbody.addEventListener('change', suModifica);
    tbody.addEventListener('click', (e) => {
      const b = e.target.closest('[data-elimina]');
      if (!b) return;
      const i = Number(b.dataset.elimina);
      const chi = righeAttive()[i];
      if (confirm(`Elimino la riga ${i + 1}${chi.cognome ? ' (' + chi.cognome + ')' : chi.squadra ? ' (' + chi.squadra + ')' : ''}?`)) {
        righeAttive().splice(i, 1); disegna();
      }
    });

    valida();
  }

  /* La scheda Maglia: il simulatore in un iframe, chiamato con ?modifica=1.
     Senza quel parametro — e senza il server in locale — il simulatore parte in
     vetrina e il pannello non compare nemmeno: e' la stessa pagina che sta sul
     sito, cambia solo come la si apre. */
  const SIMULATORE = '../assets/maglia/simulatore.html?modifica=1';

  function disegnaMaglia(s) {
    elPannello.innerHTML = `
      <div class="barra-sezione">
        <h2>${esc(s.titolo)}</h2>
        <span class="spazio"></span>
        <a class="btn btn-fantasma" href="${SIMULATORE}" target="_blank" rel="noopener">Apri a schermo intero</a>
      </div>
      <p class="aiuto">${s.aiuto}</p>
      <div class="editor" style="padding:0;overflow:hidden">
        <iframe src="${SIMULATORE}" title="Editor della maglia 2026"
                style="display:block;width:100%;border:0;
                       height:min(880px, calc(100dvh - 230px));min-height:620px"></iframe>
      </div>`;
    elMessaggi.innerHTML = '';
    elStato.textContent = 'Maglia: scarica da qui dentro';
    delete elStato.dataset.ok;
  }

  /* Indice della prossima partita: prima "da_giocare" in ordine cronologico. */
  function indiceProssima() {
    if (sezioneAttiva.id !== 'calendario') return -1;
    const righe = righeAttive() || [];
    let best = -1;
    righe.forEach((m, i) => {
      if (m.stato !== 'da_giocare' || !m.data) return;
      if (best === -1 || (m.data + m.ora) < (righe[best].data + righe[best].ora)) best = i;
    });
    return best;
  }

  function rigaHtml(r, i) {
    const s = sezioneAttiva;
    const prossima = i === indiceProssima();
    const celle = s.campi.map((c) => {
      const v = leggi(r, c.k);
      let campo;
      if (c.tipo === 'fisso') {
        // colonna di sola lettura: dice su quale riga stai lavorando
        campo = `<span class="fisso">${esc(v)}</span>`;
      } else if (c.tipo === 'scala') {
        // cursore + numero a fianco: il numero si aggiorna senza ridisegnare la tabella
        campo = `<span class="scala">
          <input type="range" min="${CAR_MIN}" max="${CAR_MAX}" step="1"
                 data-i="${i}" data-k="${c.k}" data-tipo="scala"
                 value="${Number(v) || CARATTERISTICHE_DEFAULT[c.k.split('.').pop()]}"
                 aria-label="${esc(c.et)}">
          <output>${esc(v)}</output></span>`;
      } else if (c.tipo === 'select') {
        campo = `<select data-i="${i}" data-k="${c.k}">${
          c.opzioni.map((o) => `<option${String(v) === o ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
      } else if (c.tipo === 'int') {
        campo = `<input type="number" step="1" data-i="${i}" data-k="${c.k}" data-tipo="int"
                   ${c.vuotoNull ? 'data-vuoto-null="1" placeholder="—"' : ''} value="${v ?? ''}">`;
      } else if (c.tipo === 'date' || c.tipo === 'time') {
        campo = `<input type="${c.tipo}" data-i="${i}" data-k="${c.k}" value="${esc(v)}">`;
      } else {
        campo = `<input type="text" data-i="${i}" data-k="${c.k}" value="${esc(v)}">`;
      }
      return `<td class="${c.lungo ? 'lungo' : ''}">${campo}</td>`;
    }).join('');
    const etichetta = s.etichettaRiga ? `<td style="color:var(--testo-debole);white-space:nowrap">${esc(s.etichettaRiga(r))}</td>` : '';
    const bottone = s.soloModifica ? ''
      : `<td><button class="btn-riga" type="button" data-elimina="${i}" aria-label="Elimina la riga ${i + 1}">×</button></td>`;
    return `<tr class="${prossima ? 'riga-prossima' : ''}" title="${prossima ? 'È la prossima partita mostrata in home' : ''}">
      ${celle}${etichetta}${bottone}
    </tr>`;
  }

  function suModifica(e) {
    const el = e.target.closest('[data-i]');
    if (!el) return;
    const riga = righeAttive()[Number(el.dataset.i)];
    const k = el.dataset.k;

    if (el.dataset.tipo === 'int') {
      if (el.value.trim() === '') scrivi(riga, k, el.dataset.vuotoNull ? null : 0);
      else scrivi(riga, k, Number.parseInt(el.value, 10));
    } else if (el.dataset.tipo === 'scala') {
      scrivi(riga, k, Number.parseInt(el.value, 10));
      // il numero a fianco si aggiorna qui, senza ridisegnare: se ridisegnassi
      // il cursore perderebbe il trascinamento a meta' gesto
      el.parentElement.querySelector('output').textContent = el.value;
    } else {
      scrivi(riga, k, el.value);
    }

    if ((sezioneAttiva.id === 'staff' || sezioneAttiva.id === 'tifosi') && k === 'codice') {
      riga.ruolo_sigla = riga.codice;
    }
    if (sezioneAttiva.extra) sezioneAttiva.extra(riga, el);
    // "Chi è" dipende solo dal numero di maglia, l'evidenza della prossima partita
    // da data, ora e stato: ridisegno solo quando cambia una di quelle, non a ogni tasto.
    if ((sezioneAttiva.etichettaRiga && k === 'numero') || sezioneAttiva.id === 'calendario') {
      // il nome del giocatore e l'evidenza "prossima partita" dipendono dai valori: ridisegno
      const attivo = document.activeElement;
      const pos = [attivo?.dataset?.i, attivo?.dataset?.k];
      disegna();
      if (pos[0] !== undefined) {
        const rimetti = document.querySelector(`[data-i="${pos[0]}"][data-k="${pos[1]}"]`);
        rimetti?.focus();
        if (rimetti?.setSelectionRange && rimetti.type === 'text') {
          rimetti.setSelectionRange(rimetti.value.length, rimetti.value.length);
        }
      }
      return;
    }
    valida();
  }

  /* Quando cambio V/N/P o GF/GS, punti e differenza reti si aggiornano da soli. */
  function ricalcolaClassifica(riga) {
    riga.punti = 3 * (riga.v || 0) + (riga.n || 0);
    riga.g = (riga.v || 0) + (riga.n || 0) + (riga.p || 0);
    riga.dr = (riga.gf || 0) - (riga.gs || 0);
    ['punti', 'g', 'dr'].forEach((k) => {
      const i = righeAttive().indexOf(riga);
      const el = document.querySelector(`[data-i="${i}"][data-k="${k}"]`);
      if (el) el.value = riga[k];
    });
  }

  /* ---------------------------------------------------------- validazione --- */
  function valida() {
    const s = sezioneAttiva;
    if (!s.campi) return true;          // la scheda Maglia non e' una tabella
    const righe = righeAttive() || [];
    const problemi = [];
    document.querySelectorAll('.invalido').forEach((el) => el.classList.remove('invalido'));

    const segna = (i, k, msg) => {
      document.querySelector(`[data-i="${i}"][data-k="${k}"]`)?.classList.add('invalido');
      problemi.push(`Riga ${i + 1}, campo "${s.campi.find((c) => c.k === k)?.et || k}": ${msg}`);
    };

    const numeriVisti = new Map();
    righe.forEach((r, i) => {
      s.campi.forEach((c) => {
        const v = leggi(r, c.k);
        if (c.obbl && (v === '' || v === null || v === undefined)) segna(i, c.k, 'obbligatorio, non lasciarlo vuoto');
        if (c.tipo === 'int' && v !== null && v !== undefined && Number.isNaN(Number(v))) segna(i, c.k, 'deve essere un numero');
        if (c.tipo === 'scala' && !(Number.isInteger(v) && v >= CAR_MIN && v <= CAR_MAX)) {
          segna(i, c.k, `deve essere un numero intero da ${CAR_MIN} a ${CAR_MAX}`);
        }
      });
      // numero di maglia unico (rosa e statistiche)
      if ((s.id === 'rosa' || s.id === 'statistiche') && r.numero !== undefined) {
        if (numeriVisti.has(r.numero)) segna(i, 'numero', `il numero ${r.numero} è già usato alla riga ${numeriVisti.get(r.numero) + 1}`);
        else numeriVisti.set(r.numero, i);
      }
      if (s.id === 'statistiche') {
        const inRosa = (doc['rosa.json'].giocatori || []).some((g) => g.numero === Number(r.numero));
        if (!inRosa) segna(i, 'numero', 'questo numero non esiste nella rosa');
      }
      if (s.id === 'calendario') {
        if (r.casa && r.casa === r.ospite) segna(i, 'ospite', 'la squadra non può giocare contro se stessa');
        if (r.stato === 'giocata' && (r.gol_casa === null || r.gol_ospite === null)) {
          if (r.gol_casa === null) segna(i, 'gol_casa', 'partita giocata: serve il punteggio');
          if (r.gol_ospite === null) segna(i, 'gol_ospite', 'partita giocata: serve il punteggio');
        }
      }
    });

    const box = document.getElementById('errori');
    if (problemi.length) {
      box.innerHTML = `<div class="avviso errore"><b>${problemi.length} cosa/e da sistemare in questa sezione:</b>
        <ul>${problemi.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>`;
      elStato.textContent = `${problemi.length} da sistemare`;
      elStato.dataset.ok = 'false';
    } else {
      box.innerHTML = '';
      elStato.textContent = 'Tutto valido';
      elStato.dataset.ok = 'true';
    }
    return problemi.length === 0;
  }

  /* ------------------------------------------------------------ download --- */
  function scarica(nomeFile) {
    if (!valida() && !confirm('Ci sono campi da sistemare in questa sezione. Scarico lo stesso?')) return;
    const testo = JSON.stringify(doc[nomeFile], null, 2) + '\n';
    const url = URL.createObjectURL(new Blob([testo], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeFile;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    elMessaggi.innerHTML = `<div class="avviso"><b>${esc(nomeFile)} scaricato.</b>
      Spostalo in <code>data/${esc(nomeFile)}</code> (sovrascrivendo il vecchio), poi lancia
      <code>./.venv/bin/python tools/check_data.py</code> e fai il push.</div>`;
    elMessaggi.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
})();
