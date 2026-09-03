/* convocati.js — griglia cronologica delle locandine (piu' recente in alto)
   + lightbox con frecce, ESC, tap fuori e swipe. */

(async function convocati() {
  const griglia = document.getElementById('griglia-locandine');
  const avvisi  = document.getElementById('avvisi-locandine');
  const lb      = document.getElementById('lightbox');
  const lbImg   = document.getElementById('lb-img');
  const lbCont  = document.getElementById('lb-contatore');
  const lbDida  = document.getElementById('lb-didascalia');

  let lista = [], indice = 0, ultimoFocus = null;

  try {
    const d = await SP.dati('locandine.json');
    lista = d.locandine || [];
  } catch (e) {
    console.error(e);
    SP.errore(griglia, e.message);
    return;
  }

  if (!lista.length) {
    griglia.innerHTML = `<p class="vuoto" style="grid-column:1/-1">
      Nessuna locandina. Metti le immagini in <code>foto_presentazione/</code> e lancia <code>sync.command</code>.</p>`;
    return;
  }

  /* I file fuori convenzione COGNOME_NUMERO.ext restano visibili ma segnalati. */
  const rotte = lista.filter((x) => x.valida === false);
  if (rotte.length) {
    avvisi.innerHTML = `<div class="avviso"><b>${rotte.length} file da sistemare.</b>
      Non rispettano la convenzione <code>COGNOME_NUMERO.ext</code>, quindi sono in fondo alla griglia e
      non sono collegati a nessun giocatore: ${rotte.map((x) => `<code>${SP.esc(x.file.split('/').pop())}</code>`).join(', ')}.</div>`;
  }

  griglia.innerHTML = lista.map((x, i) => {
    const chi = x.giocatore || x.cognome || 'Locandina';
    return `<button class="locandina" type="button" data-i="${i}" data-valida="${x.valida !== false}"
              aria-label="Apri la locandina di ${SP.esc(chi)}">
      <img src="${SP.esc(x.thumb)}" alt="Locandina di presentazione di ${SP.esc(chi)}"
           width="${SP.esc(x.thumb_w)}" height="${SP.esc(x.thumb_h)}" loading="lazy" decoding="async">
      <div class="didascalia">
        <b>${SP.esc(chi)}</b>
        <small>${x.numero != null ? '#' + SP.esc(x.numero) + ' &middot; ' : ''}${SP.dataIt(x.data, false)}</small>
      </div>
    </button>`;
  }).join('');

  /* ---------------------------------------------------------- lightbox --- */
  griglia.addEventListener('click', (e) => {
    const b = e.target.closest('[data-i]');
    if (b) apri(Number(b.dataset.i));
  });

  function apri(i) {
    ultimoFocus = document.activeElement;
    vai(i);
    lb.setAttribute('data-aperto', 'true');
    document.body.style.overflow = 'hidden';
    document.getElementById('lb-chiudi').focus();
  }

  function chiudi() {
    lb.setAttribute('data-aperto', 'false');
    document.body.style.overflow = '';
    lbImg.src = '';
    ultimoFocus?.focus();
  }

  function vai(i) {
    indice = (i + lista.length) % lista.length;
    const x = lista[indice];
    const chi = x.giocatore || x.cognome || 'Locandina';
    // Mostro la versione "web" (leggera): l'originale a piena risoluzione resta
    // nel repo ma non ha senso farlo scaricare a chi guarda dal telefono.
    lbImg.src = x.web || x.file;
    if (x.web_w) { lbImg.width = x.web_w; lbImg.height = x.web_h; }
    lbImg.alt = `Locandina di presentazione di ${chi}`;
    lbCont.textContent = `Locandina ${indice + 1} di ${lista.length}`;
    lbDida.innerHTML = `<b>${SP.esc(chi)}</b>${x.numero != null ? ' &middot; #' + SP.esc(x.numero) : ''}
      &middot; ${SP.dataIt(x.data)}${x.didascalia ? '<br><span style="color:var(--testo-debole)">' + SP.esc(x.didascalia) + '</span>' : ''}`;
    // Precarico la successiva: cosi' la freccia non fa aspettare.
    if (lista.length > 1) {
      const succ = lista[(indice + 1) % lista.length];
      new Image().src = succ.web || succ.file;
    }
  }

  document.getElementById('lb-chiudi').addEventListener('click', chiudi);
  document.getElementById('lb-prec').addEventListener('click', () => vai(indice - 1));
  document.getElementById('lb-succ').addEventListener('click', () => vai(indice + 1));

  // Tap/clic fuori dall'immagine chiude.
  lb.addEventListener('click', (e) => {
    if (e.target === lb || e.target.id === 'lb-figura') chiudi();
  });

  document.addEventListener('keydown', (e) => {
    if (lb.getAttribute('data-aperto') !== 'true') return;
    if (e.key === 'Escape')     { e.preventDefault(); chiudi(); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); vai(indice - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); vai(indice + 1); }
  });

  // Swipe orizzontale su mobile (soglia 45px, e solo se il gesto e' piu' orizzontale che verticale).
  let x0 = null, y0 = null;
  lb.addEventListener('touchstart', (e) => {
    x0 = e.changedTouches[0].clientX; y0 = e.changedTouches[0].clientY;
  }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    const dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) vai(indice + (dx < 0 ? 1 : -1));
    x0 = y0 = null;
  }, { passive: true });
})();
