/* storia.js — testo della pagina "La nostra storia", preso da data/storia.json.
   Finche' il campo _da_rivedere e' true mostra l'avviso di bozza. */

/* Foto di gruppo in cima alla pagina. Finche' data/storia.json non ha un
   "file", al suo posto resta un segnaposto con le stesse proporzioni: cosi' la
   pagina e' gia' impaginata come sara' e caricare la foto vera e' una riga di
   JSON, senza toccare ne' HTML ne' CSS. */
function fotoSquadra(f) {
  const el = document.getElementById('storia-foto');
  if (!el || !f) return;
  const didascalia = f.didascalia
    ? `<figcaption>${SP.esc(f.didascalia)}</figcaption>` : '';
  el.innerHTML = f.file
    ? `<figure class="foto-squadra">
         <img src="${SP.esc(f.file)}" alt="${SP.esc(f.alt || '')}" loading="lazy" decoding="async">
         ${didascalia}
       </figure>`
    : `<figure class="foto-squadra">
         <div class="foto-squadra-vuota" role="img" aria-label="Foto di squadra non ancora disponibile">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
                stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
             <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h2L9 4h6l1.5 2h2A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z"/>
             <circle cx="12" cy="13" r="3.5"/>
           </svg>
           <b>Foto di squadra in arrivo</b>
           <span>Appena arriva, la trovi qui.</span>
         </div>
       </figure>`;
}

(async function storia() {
  const elTesto  = document.getElementById('storia-testo');
  const elTitolo = document.getElementById('storia-titolo');
  const elSotto  = document.getElementById('storia-sottotitolo');
  const elAvviso = document.getElementById('storia-avviso');

  try {
    const d = await SP.dati('storia.json');
    if (d.titolo) { elTitolo.textContent = d.titolo; document.title = `${d.titolo} — Shakhtar Palese`; }
    if (d.sottotitolo) elSotto.textContent = d.sottotitolo;

    if (d._da_rivedere) {
      elAvviso.innerHTML = `<div class="avviso"><b>Bozza da rivedere.</b>
        Questo testo è stato scritto come traccia e contiene dettagli inventati.
        Quando lo riscrivi, in <code>data/storia.json</code>, metti <code>"_da_rivedere": false</code>
        e questo avviso sparisce.</div>`;
    }

    fotoSquadra(d.foto_squadra);

    elTesto.innerHTML = (d.paragrafi || []).map((p) => `<p>${SP.esc(p)}</p>`).join('')
      || '<p class="vuoto">Nessun testo in data/storia.json.</p>';
  } catch (e) {
    console.error(e);
    SP.errore(elTesto, e.message);
  }
})();
