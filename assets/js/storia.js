/* storia.js — testo della pagina "La nostra storia", preso da data/storia.json.
   Finche' il campo _da_rivedere e' true mostra l'avviso di bozza. */

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

    elTesto.innerHTML = (d.paragrafi || []).map((p) => `<p>${SP.esc(p)}</p>`).join('')
      || '<p class="vuoto">Nessun testo in data/storia.json.</p>';
  } catch (e) {
    console.error(e);
    SP.errore(elTesto, e.message);
  }
})();
