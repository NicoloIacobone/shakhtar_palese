/* =========================================================================
   sponsor.js — solo la pagina Sponsor.
   Le strisce di loghi sparse per il sito le disegna main.js: qui servono le
   card intere, con descrizione, posizione sulla maglia e link. Tutto arriva da
   data/sponsor.json, che e' anche l'unico posto da toccare quando cambia uno
   sponsor: le pagine non hanno un solo nome scritto dentro.
   ========================================================================= */
(async function paginaSponsor() {
  const principali = document.getElementById('sponsor-principali');
  const tecnici    = document.getElementById('sponsor-tecnici');
  const bloccoTec  = document.getElementById('blocco-tecnico');
  const invito     = document.getElementById('diventa-sponsor');
  if (!principali) return;

  let d;
  try {
    d = await SP.dati('sponsor.json');
  } catch (e) {
    SP.errore(principali, e.message);
    return;
  }

  const attivi = (d.sponsor || []).filter((s) => s.attivo !== false && s.logo);

  const ETICHETTA = { main: 'Sponsor di maglia', partner: 'Partner', tecnico: 'Marchio tecnico' };

  /* Icona "dove sta sulla maglia": la stessa maglietta stilizzata del resto
     del sito, disegnata a mano perche' non vale la pena caricare un font di
     icone per due righe. */
  const ICONA_MAGLIA = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M8 3l4 2 4-2 5 3-2.5 4L17 9v12H7V9l-1.5 1L3 6z"/></svg>`;

  function card(s) {
    const sfondo = s.sfondo === 'chiaro' ? 'chiaro' : 'scuro';
    const link = [];
    if (s.sito) {
      link.push(`<a href="${SP.esc(s.sito)}" target="_blank" rel="noopener">Il sito &rarr;</a>`);
    }
    if (s.instagram) {
      link.push(`<a href="https://instagram.com/${SP.esc(s.instagram)}" target="_blank" rel="noopener">@${SP.esc(s.instagram)}</a>`);
    }
    return `<article class="card sponsor-card">
      <div class="sponsor-logo" data-sfondo="${sfondo}">
        <img src="${SP.esc(SP.url(s.logo))}" alt="${SP.esc(s.nome)}" loading="lazy" decoding="async">
      </div>
      <div>
        <span class="livello">${SP.esc(ETICHETTA[s.livello] || 'Sponsor')}${s.dal ? ' &middot; dal ' + SP.esc(s.dal) : ''}</span>
        <h3 style="margin-top:.45rem">${SP.esc(s.nome)}</h3>
      </div>
      ${s.descrizione ? `<p>${SP.esc(s.descrizione)}</p>` : ''}
      ${s.posizione_maglia
        ? `<p class="dove">${ICONA_MAGLIA}${SP.esc(s.posizione_maglia)}</p>` : ''}
      ${link.length ? `<p class="link-sponsor">${link.join('')}</p>` : ''}
    </article>`;
  }

  const disegna = (el, lista) => { el.innerHTML = lista.map(card).join(''); };

  const conMaglia = attivi.filter((s) => (s.livello || 'main') !== 'tecnico');
  const conTecnico = attivi.filter((s) => s.livello === 'tecnico');

  if (conMaglia.length) {
    disegna(principali, conMaglia);
  } else {
    // Nessuno sponsor ancora: meglio dirlo che lasciare un buco bianco.
    principali.innerHTML = `<div class="avviso" style="grid-column:1/-1">
      <b>Ancora nessuno sponsor.</b> La maglia 2026 &egrave; libera: se vuoi essere il primo,
      <a data-config="email" data-solo-href href="#">scrivici</a>.</div>`;
  }

  if (conTecnico.length && tecnici && bloccoTec) {
    disegna(tecnici, conTecnico);
    bloccoTec.hidden = false;
  }

  /* L'invito a diventare sponsor: testo e interruttore stanno nel JSON, cosi'
     si spegne senza toccare l'HTML quando la maglia e' piena. */
  const inv = d.diventa_sponsor;
  if (invito && inv && inv.attivo !== false) {
    invito.className = 'card';
    invito.style.marginTop = '1.4rem';
    invito.style.textAlign = 'center';
    invito.innerHTML = `
      <h2>${SP.esc(inv.titolo || 'C&rsquo;e&rsquo; ancora spazio sulla maglia')}</h2>
      ${inv.testo ? `<p class="sottotitolo">${SP.esc(inv.testo)}</p>` : ''}
      <div class="gruppo-btn" style="justify-content:center;margin-top:1rem">
        <a class="btn btn-primario" data-config="email" data-solo-href href="#"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="M3 7l9 6 9-6"/></svg> Scrivici</a>
        ${inv.mostra_simulatore !== false
          ? '<a class="btn btn-fantasma" href="maglia.html">Prova il tuo logo sulla maglia</a>' : ''}
      </div>`;
    invito.hidden = false;
  }

  /* I data-config appena inseriti sono arrivati DOPO il giro di main.js, che
     riempie mail e link una volta sola a inizio pagina. Li riempio qui. */
  try {
    const cfg = await SP.dati('config.json');
    document.querySelectorAll('#sponsor-principali [data-config="email"], #diventa-sponsor [data-config="email"]')
      .forEach((el) => { el.href = 'mailto:' + cfg.social.email; });
  } catch (e) { /* i link restano su "#", il resto della pagina funziona */ }
})();
