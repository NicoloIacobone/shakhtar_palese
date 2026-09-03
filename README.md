# Shakhtar Palese — sito ufficiale

Sito della squadra di calcio amatoriale **Shakhtar Palese** (Palese, Bari).
Online su **<https://nicoloiacobone.github.io/shakhtar_palese/>**.

HTML, CSS e JavaScript scritti a mano. Nessun framework, nessun `npm install`,
nessun passaggio di build: i file che stanno nel repo sono esattamente quelli
che vengono serviti. I contenuti stanno in `data/*.json` e il sito li carica con
`fetch()`.

Tutte le istruzioni qui sotto sono per **macOS**.

---

## Le tre cose che farai davvero

### 1. Pubblicare la locandina del giorno

1. Metti l'immagine in `foto_presentazione/`, chiamandola **`COGNOME_NUMERO.jpg`**
   (es. `ESPOSITO_29.jpg`). Il numero è quello di **maglia**, non un progressivo.
2. **Doppio click su `sync.command`** dal Finder.
3. Lo script copia l'immagine nel sito, genera la miniatura, aggiorna
   `data/locandine.json` e ti chiede se fare commit e push. Rispondi `s`.

La stessa immagine viene usata in due posti: la griglia dei **Convocati** e la
foto della **player card** nella pagina Rosa. Non serve caricarla due volte.

Lo script ne salva tre versioni: la **miniatura** (~55 KB) per le griglie, la
versione **web** (~290 KB) per quando la locandina si apre a schermo intero, e
l'**originale** intatto in `assets/locandine/`, che resta nel repo come archivio
ma non viene mai servito a chi naviga. Sono nove volte meno byte da scaricare in
4G, senza differenze visibili.

> La prima volta che apri `sync.command`, macOS potrebbe dire che è di uno
> sviluppatore non identificato: tasto destro → **Apri** → **Apri**. Succede
> solo la prima volta.

### 2. Aggiornare risultati, classifica e statistiche

Due modi, scegli quello che ti va:

- **A mano**: apri il file in `data/` e modificalo. La guida a ogni singolo
  campo è in **[`data/README.md`](data/README.md)**.
- **Col pannello**: fai partire il server locale (sotto), apri
  <http://localhost:8000/admin/>, modifica nei form, premi *Scarica JSON
  aggiornato* e metti il file scaricato al posto di quello in `data/`.

Poi, sempre:

```bash
./.venv/bin/python tools/check_data.py     # dice cosa è rotto, prima del pubblico
git add . && git commit -m "aggiorno risultati" && git push
```

### 3. Vedere il sito in locale prima di pubblicare

```bash
cd ~/Desktop/nico/SHAKHTAR_PALESE
./.venv/bin/python -m http.server
```

Poi apri <http://localhost:8000/>.

> **Non aprire `index.html` con doppio click.** Il browser blocca il caricamento
> dei JSON dai file locali (`file://`) e vedresti la pagina vuota. Serve il
> server, che è quella riga lì sopra.

Per fermarlo: `Ctrl+C` nel Terminale.

---

## Com'è fatto

```
shakhtar_palese/
├── index.html  rosa.html  convocati.html  statistiche.html
├── tornei.html  storia.html  contatti.html  404.html
├── sync.command              ← doppio click: sincronizza le locandine
├── manifest.json  robots.txt  sitemap.xml  .nojekyll
├── assets/
│   ├── css/style.css         ← TUTTA la grafica, palette compresa
│   ├── js/                   ← uno script per pagina + main.js condiviso
│   ├── img/                  ← logo, icone, copertina social, placeholder
│   └── locandine/            ← originali + web/ + thumbs/ (le genera lo script)
├── data/                     ← i contenuti del sito. Vedi data/README.md
├── admin/                    ← pannello locale, non pubblicato
├── tools/
│   ├── config.json           ← dove sta la cartella sorgente, dimensioni thumb…
│   ├── sync_locandine.py     ← copia immagini + miniature + JSON
│   ├── check_data.py         ← valida tutti i JSON
│   └── make_icons.py         ← rigenera favicon e copertina dal logo
└── foto_presentazione/       ← le card generate con l'IA (non versionata)
```

### Cambiare i colori

Apri `assets/css/style.css`: le prime venti righe sono il blocco `:root` con
tutte le variabili (`--arancio`, `--nero`, `--superficie`…). Cambia lì e cambia
tutto il sito. Sotto c'è il blocco `[data-tema="chiaro"]` per il tema chiaro.

Il tema scuro è il default; il pulsante in alto a destra fa passare al chiaro e
la scelta resta salvata nel browser.

### Cambiare il logo o le icone

Modifica `assets/img/logo.svg`, poi rigenera favicon, icone e copertina social:

```bash
./.venv/bin/python tools/make_icons.py
```

---

## GitHub Pages: **già configurato**

Non c'è niente da fare, è già tutto attivo. Per riferimento, le impostazioni in
*Settings → Pages* del repo sono:

| impostazione | valore |
|---|---|
| Source | Deploy from a branch |
| Branch | `main` |
| Cartella | `/ (root)` |
| Enforce HTTPS | attivo |

Il file `.nojekyll` nella root serve a dire a GitHub di pubblicare i file così
come sono, senza passarli da Jekyll: **non cancellarlo**.

Dopo ogni `git push` il sito si aggiorna da solo in circa un minuto. Se non vedi
le modifiche, è la cache del browser: ricarica con `Cmd+Shift+R`.

---

## Da sostituire prima di far girare il link

Il sito adesso è pieno di **dati inventati**, così si vede subito com'è fatto.
Ogni file che li contiene ha dentro `"_placeholder": true` e `check_data.py` te
li elenca a ogni lancio. In ordine di urgenza:

- [ ] **`data/rosa.json`** — i 13 giocatori sono nomi finti. Sostituisci nomi,
      cognomi, numeri di maglia, ruoli e i testi della carta d'identità
      (soprannome, tormentone, superstizione, difetto tattico, obiettivo).
      Poi togli `"_placeholder": true`.
- [ ] **`data/statistiche.json`** — tutti i numeri sono inventati. Azzerali o
      metti quelli veri. I `numero` devono combaciare con la rosa.
- [ ] **`data/tornei.json`** — nomi delle 8 squadre, classifica e calendario del
      Torneo Birra Peroni sono di fantasia. Sostituisci con quelli veri e
      compila `instagram` del torneo quando lo saprai (adesso è vuoto).
- [ ] **`data/storia.json`** — il testo è una **bozza scritta da Claude**, con
      dettagli inventati (chi ha fondato la squadra, il bar, le date).
      Riscrivilo tu e metti `"_da_rivedere": false` per far sparire l'avviso
      giallo che il sito mostra in cima alla pagina.
- [ ] **Le locandine** — ce ne sono 2 su 13. Gli altri 11 giocatori mostrano il
      placeholder col numero di maglia, che è dignitoso ma non è la stessa cosa.
- [ ] `data/config.json` — email, handle social e indirizzo del campo sono già
      quelli veri: controlla solo il link a Google Maps.

---

## Comandi utili

```bash
# sincronizza le locandine (equivale al doppio click su sync.command)
./.venv/bin/python tools/sync_locandine.py

# guarda cosa farebbe, senza scrivere niente
./.venv/bin/python tools/sync_locandine.py --dry-run

# sincronizza ma senza toccare git
./.venv/bin/python tools/sync_locandine.py --no-git

# controlla tutti i JSON
./.venv/bin/python tools/check_data.py

# rigenera favicon, icone e copertina social dal logo
./.venv/bin/python tools/make_icons.py

# server locale
./.venv/bin/python -m http.server
```

L'interprete da usare è sempre **`./.venv/bin/python`**: il `python3` di sistema
non ha Pillow e non si può installare niente lì dentro.

Se un giorno il virtualenv sparisce:

```bash
python3 -m venv .venv
./.venv/bin/pip install Pillow
```

---

## Cose che questo sito non fa, di proposito

Niente analytics, niente cookie banner (perché non ci sono cookie), niente form
di contatto, nessun backend. È un sito statico e deve restare tale: la sola
cosa che deve funzionare per sempre è che il link, incollato in una storia
Instagram, apra qualcosa di decente.
