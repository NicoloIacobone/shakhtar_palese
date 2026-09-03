# I file dati del sito — guida per il me stesso di fra tre mesi

Tutto quello che vedi sul sito viene da questi file. Il sito è statico: non c'è
un database, non c'è un pannello online. Si modifica un file qui, si fa push,
e dopo circa un minuto il sito è aggiornato.

**Tre regole che valgono per tutti i file:**

1. Sono file **JSON**. Le virgolette sono obbligatorie attorno al testo, e
   **non ci va la virgola dopo l'ultimo elemento** di una lista. È l'errore
   che farai il 90% delle volte.
2. Le date si scrivono sempre **`"2026-09-10"`** (anno-mese-giorno), gli orari
   sempre **`"20:30"`**. Mai `10/09/2026`.
3. Quando hai finito, **controlla prima di pubblicare**:
   ```
   ./.venv/bin/python tools/check_data.py
   ```
   Ti dice esattamente cosa è rotto e in quale riga. Se non dice niente, sei a posto.

Se non ti va di scrivere JSON a mano c'è il **pannello locale**: fai partire il
server (`./.venv/bin/python -m http.server`), apri
<http://localhost:8000/admin/>, modifica nei form, scarica il file aggiornato e
mettilo qui al posto del vecchio.

---

## `config.json` — i dati della squadra

Nome, email, social, campo di casa. Compaiono nell'header, nel footer e nella
pagina Contatti. **È l'unico posto dove cambiarli**: se cambi l'email qui,
cambia ovunque nel sito.

| campo | cosa contiene |
|---|---|
| `sito.nome` | il nome che compare in alto e nel footer |
| `sito.tagline` | la frase sotto il nome nella home |
| `sito.base_url` | l'indirizzo del sito online. Serve per le anteprime dei link. **Non cambiarlo** a meno che tu non rinomini il repo |
| `social.instagram` / `social.tiktok` | l'handle **senza la @** (es. `shakhtar_palese`) |
| `social.email` | l'indirizzo email della squadra |
| `campo.*` | nome, indirizzo, link Google Maps e Instagram della struttura |

## `rosa.json` — i giocatori

Una voce per giocatore, dentro la lista `giocatori`. È la "carta d'identità"
che si apre cliccando su una player card.

| campo | note |
|---|---|
| `numero` | **il numero di maglia. È la chiave che collega tutto**: statistiche e foto si agganciano a questo numero. Deve essere unico |
| `nome`, `cognome` | obbligatori |
| `ruolo` | `Portiere`, `Difensore`, `Centrocampista` o `Attaccante` (i filtri usano questi) |
| `ruolo_sigla` | `POR`, `DIF`, `CEN`, `ATT`: è quello che appare sulla card |
| `piede` | `destro`, `sinistro` o `ambidestro` |
| `provenienza`, `soprannome`, `tormentone`, `superstizione`, `difetto_tattico`, `obiettivo` | testo libero, compaiono nella scheda |

**La foto non si scrive qui.** Viene agganciata da sola incrociando il numero di
maglia con le locandine: metti l'immagine in `foto_presentazione/` chiamandola
`COGNOME_NUMERO.jpg` e lancia `sync.command`. Chi non ha la foto mostra un
placeholder col suo numero, e va benissimo così.

`"_placeholder": true` significa "questi dati sono ancora inventati". Toglilo
quando metti quelli veri.

## `statistiche.json` — i numeri dei giocatori

Una riga per giocatore, agganciata alla rosa tramite `numero`.

`presenze`, `minuti`, `gol`, `assist`, `ammonizioni`, `espulsioni`, `mvp` sono
le statistiche serie. `papere`, `gol_sbagliati`, `ritardi`, `multe_euro` sono le
nostre. Sono tutti numeri interi, mai negativi, mai fra virgolette:
`"gol": 4` va bene, `"gol": "4"` no.

Se aggiungi un giocatore alla rosa, aggiungi anche la sua riga qui (all'inizio
tutta a zero): `check_data.py` te lo ricorda.

## `tornei.json` — classifica e calendario

Contiene **tutti** i tornei: quello in corso e l'archivio. Il campo `corrente`
in cima dice quale mostrare per primo e da quale prendere la prossima partita.

Ogni torneo ha:

- `id` (senza spazi, es. `birra-peroni-2026`), `nome`, `stagione`,
  `instagram` (l'handle del torneo, senza @: **lascialo vuoto finché non lo sai**),
- `stato`: `in_corso`, `concluso` o `in_programma`,
- `nostra_squadra`: deve essere scritto **identico** al nome che usi in
  classifica e nel calendario, altrimenti la nostra riga non si evidenzia,
- `classifica`: una riga per squadra con `pos`, `squadra`, `punti`, `g` (giocate),
  `v`, `n`, `p`, `gf` (gol fatti), `gs` (gol subiti), `dr` (differenza reti).
  I punti devono valere `3×v + n` e la differenza reti `gf − gs`:
  `check_data.py` fa il conto al posto tuo,
- `calendario`: una riga per partita.

Per ogni partita:

| campo | note |
|---|---|
| `id` | una sigla univoca, es. `bp26-g8` |
| `giornata` | numero |
| `data`, `ora` | `"2026-09-10"` e `"20:30"` |
| `casa`, `ospite` | i nomi delle squadre, scritti come in classifica |
| `gol_casa`, `gol_ospite` | `null` finché non si gioca, poi i numeri |
| `stato` | `da_giocare`, `giocata` o `rinviata` |
| `campo` | dove si gioca |
| `note` | facoltativo, appare sotto il risultato |

**La "prossima partita" della home non si scrive da nessuna parte**: è la prima
partita `da_giocare` in ordine di data e ora. Il countdown si calcola da lì.
Per registrare un risultato: metti i gol e cambia lo `stato` in `giocata`.

## `locandine.json` — le card dei convocati

⚠️ **Questo file lo genera `sync.command`.** Non riscriverlo a mano da capo:
al prossimo lancio dello script le tue modifiche strutturali sparirebbero.

Di ogni locandina esistono **tre versioni**, tutte create dallo script:

| campo | file | quando si vede | peso indicativo |
|---|---|---|---|
| `thumb` | `assets/locandine/thumbs/` | nella griglia e nelle player card | ~55 KB |
| `web` | `assets/locandine/web/` | aprendo la locandina a schermo intero | ~290 KB |
| `file` | `assets/locandine/` | mai mostrata: è l'originale, tenuto come archivio | ~2,7 MB |

Chi visita il sito non scarica mai l'originale. Se vuoi cambiare quanto pesano
le versioni ridotte, i valori stanno in `tools/config.json`
(`web_lato_max`, `web_qualita`, `thumb_lato_max`, `thumb_qualita`): al lancio
successivo lo script se ne accorge e le rigenera tutte da solo.

Ci sono però **tre campi tuoi, che lo script non tocca mai**, nemmeno rilanciandolo:

| campo | a cosa serve |
|---|---|
| `data_pubblicazione` | `"2026-09-10"`. **Ha la precedenza su tutto** ed è il modo per correggere l'ordine della griglia se la data del file è sbagliata |
| `giocatore` | il nome da mostrare sotto la locandina (se vuoto usa il cognome preso dal nome del file) |
| `didascalia` | una riga di testo che compare quando apri la locandina a schermo intero |

Tutto il resto (`file`, `thumb`, dimensioni, `ordine`, `_sorgente`) è roba dello
script: se la modifichi, viene ricalcolata.

## `storia.json` — la pagina "La nostra storia"

`titolo`, `sottotitolo` e `paragrafi` (una lista: ogni voce è un capoverso).

Il campo **`"_da_rivedere": true` fa comparire sul sito l'avviso "bozza da
rivedere"**. Il testo che c'è adesso l'ha scritto Claude come traccia e contiene
dettagli inventati: quando lo riscrivi tu, metti `false` e l'avviso sparisce.
