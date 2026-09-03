# Shakhtar Palese — sito ufficiale

Sito della squadra di calcio amatoriale **Shakhtar Palese** (Palese, Bari).
Online su **<https://www.shakhtarpalese.it/>** (dominio custom; il vecchio
indirizzo `nicoloiacobone.github.io/shakhtar_palese` reindirizza qui).

HTML, CSS e JavaScript scritti a mano. Nessun framework, nessun `npm install`,
nessun passaggio di build: i file che stanno nel repo sono esattamente quelli
che vengono serviti. I contenuti stanno in `data/*.json` e il sito li carica con
`fetch()`.

Tutte le istruzioni qui sotto sono per **macOS**.

---

## Le tre cose che farai davvero

### 1. Presentare una persona

Il sito mostra **solo chi è già stato presentato**. Gli altri sono già scritti in
`data/rosa.json`, pronti, ma restano invisibili finché non esce la loro card.

1. Metti l'immagine in `foto_presentazione/`, chiamandola:
   - **`COGNOME_NUMERO.jpg`** per un giocatore — es. `ESPOSITO_29.jpg`.
     Il numero è quello di **maglia**, non un progressivo.
   - **`COGNOME_SIGLA.jpg`** per lo staff — es. `DIFRANCO_ALL.jpg`
     (`ALL` allenatore, `PRS` presidente, `SMM` social media manager).

   Vanno bene `.jpg`, `.jpeg`, `.png` e `.webp` (la lista sta in
   `tools/config.json`). L'estensione può anche essere sbagliata: lo script
   legge il formato vero dal contenuto del file e te lo dice.
2. **Doppio click su `sync.command`** dal Finder.
3. Lo script copia l'immagine, genera le versioni ridotte, aggiorna
   `data/locandine.json` e ti chiede se fare commit e push. Rispondi `s`.

Da quel momento la persona compare nella Rosa, nelle Statistiche, in home fra gli
ultimi presentati, e il contatore "N di 16" si aggiorna da solo.

Lo script salva tre versioni della stessa immagine: la **miniatura** (~55 KB) per
le griglie, la versione **web** (~290 KB) per la scheda aperta, e l'**originale**
intatto in `assets/locandine/`, che resta nel repo come archivio ma non viene mai
servito a chi naviga.

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
├── index.html  rosa.html  statistiche.html
├── tornei.html  storia.html  contatti.html  404.html
├── sync.command              ← doppio click: pubblica le nuove locandine
├── manifest.json  robots.txt  sitemap.xml  .nojekyll
├── assets/
│   ├── css/style.css         ← TUTTA la grafica, palette compresa
│   ├── js/                   ← uno script per pagina + main.js condiviso
│   ├── img/                  ← stemma, icone, copertina social, placeholder,
│   │                            e qui va anche la foto di squadra
│   └── locandine/            ← originali + web/ + thumbs/ (le genera lo script)
├── data/                     ← i contenuti del sito. Vedi data/README.md
├── admin/                    ← pannello locale, non pubblicato
├── tools/
│   ├── config.json           ← dove sta la cartella sorgente, dimensioni thumb…
│   ├── sync_locandine.py     ← copia immagini + miniature + JSON
│   ├── check_data.py         ← valida tutti i JSON
│   └── make_icons.py         ← rigenera logo e icone dallo stemma ufficiale
└── foto_presentazione/       ← le card generate con l'IA (non versionata)
```

### Cambiare i colori

Apri `assets/css/style.css`: le prime venti righe sono il blocco `:root` con
tutte le variabili (`--arancio`, `--nero`, `--superficie`…). Cambia lì e cambia
tutto il sito. Sotto c'è il blocco `[data-tema="chiaro"]` per il tema chiaro.

Il tema scuro è il default; il pulsante in alto a destra fa passare al chiaro e
la scelta resta salvata nel browser.

### Cambiare lo stemma

Tutto il marchio del sito nasce da **un solo file**:
`assets/img/logo-originale.png` (PNG con sfondo trasparente, più è grande meglio
è). Sostituiscilo e poi lancia:

```bash
./.venv/bin/python tools/make_icons.py
```

Rigenera da solo il logo di header e hero, la favicon, l'icona per iPhone, le
icone dell'app installabile e la copertina che si vede quando incolli il link.

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

## Prima di far girare il link

Statistiche, risultati e classifica sono **a zero**: non c'è più niente di
inventato lì dentro. I nomi, i numeri e i ruoli delle 16 persone sono veri, e le
5 avversarie sono segnate `TBA` finché non le ufficializzano.

Restano un paio di cose da sistemare, tutte visibili sul sito:

- [ ] **I campi personali in `data/rosa.json`** — sono l'unica cosa scritta da
      Claude che parla di persone vere: `classe`, `posizione_preferita`,
      `frase_preferita`, `superstizione`,
      `rito_post_allenamento`, `skill_fuori_campo` sono **inventati**, per tutte
      e 16 le persone. Sul sito adesso se ne vedono due (Spadaro ed Esposito),
      ma ogni nuova locandina ne pubblica altri. Falli confermare dai diretti
      interessati, oppure svuotali: **un campo vuoto semplicemente non compare**,
      la scheda si accorcia e basta. Poi togli `"_placeholder": true`.

- [ ] **La foto di squadra in cima alla pagina Storia** — al suo posto adesso
      c'è un segnaposto. Quando avete la foto di gruppo: mettila in
      `assets/img/` e scrivi il suo percorso in `data/storia.json`, campo
      `foto_squadra.file`. Il segnaposto sparisce da solo.

E quando escono le informazioni ufficiali:

- [ ] Le 5 squadre `TBA` in `data/tornei.json`, l'handle `instagram` del torneo,
      e il calendario (`calendario: []`, per ora vuoto). Appena aggiungi la prima
      partita con `"stato": "da_giocare"`, in home tornano la prossima partita e
      il conto alla rovescia, da soli.

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
