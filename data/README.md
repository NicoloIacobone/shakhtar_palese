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
| `sito.tagline` | la frase sotto il nome nella home e nel footer. Per andare a capo scrivi `\n` dentro le virgolette: `"Prima frase.\nSeconda frase."` |
| `sito.base_url` | l'indirizzo del sito online. Serve per le anteprime dei link. **Non cambiarlo** a meno che tu non rinomini il repo |
| `social.instagram` / `social.tiktok` | l'handle **senza la @** (es. `shakhtar_palese`) |
| `social.email` | l'indirizzo email della squadra |
| `campo.*` | nome, indirizzo, link Google Maps e Instagram della struttura |
| `rosa.mostra_solo_presentati` | `true` = sul sito ci sono solo le persone gia' presentate con la loro locandina. `false` = ci sono tutti, con il placeholder per chi non ha ancora la foto |

## `rosa.json` — le persone della squadra

Due liste: `giocatori` e `staff`.

**Regola importante:** sul sito compaiono **solo le persone gia' presentate**,
cioe' quelle che hanno la loro locandina pubblicata. Le altre restano qui,
pronte, e appaiono da sole appena lanci `sync.command` con la loro card. Se
preferisci mostrarli tutti subito, in `config.json` metti
`"mostra_solo_presentati": false`.

### Un giocatore

| campo | note |
|---|---|
| `numero` | **il numero di maglia. E' la chiave che collega tutto**: statistiche e foto si agganciano a questo numero. Deve essere unico |
| `nome`, `cognome`, `ruolo` | obbligatori. `ruolo` = `Portiere`, `Difensore`, `Centrocampista` o `Attaccante` |
| `ruolo_sigla` | `POR`, `DEF`, `CEN`, `ATT`: e' quello che appare sulla card |
| `soprannome` | e' quello scritto in arancione sotto il nome |

Poi i due gruppi che si vedono nella scheda:

**Dati di base** — `numero`, `ruolo`, `piede`, `provenienza` (il quartiere),
`classe` (l'anno di nascita, es. `1998`).

`piede` è **testo libero**: puoi scrivere `destro`, ma anche
`"destro, ma solo se non guarda nessuno"`. Nessuno ti controlla.

**Segni particolari** — `posizione_preferita`, `frase_preferita`,
`superstizione` (quella pre-partita), `rito_post_allenamento`,
`skill_fuori_campo`.

**Un campo lasciato vuoto semplicemente non compare nella scheda.** Non ci sono
buchi ne' trattini: meglio una scheda corta che una piena di caselle vuote. Puoi
quindi riempirli con calma, uno alla volta.

### Lo staff

Stessi campi, ma senza `numero` e senza `posizione_preferita`. In piu':

| campo | note |
|---|---|
| `codice` | la sigla: `ALL` allenatore, `PRS` presidente, `SMM` social media manager (ammesse anche `DS`, `PREP`, `MAG`) |
| `ruolo` | il ruolo per esteso, che compare nella scheda |

Lo staff non ha statistiche e non compare nella pagina Statistiche. La sua
locandina si collega **col cognome**, non col numero: vedi sotto.

**La foto non si scrive qui.** Si aggancia da sola: vedi `locandine.json`.

`"_placeholder": true` significa "questi dati sono ancora inventati". I nomi, i
numeri e i ruoli sono veri; classe, frase preferita, superstizione, rito e skill
sono segnaposto scritti da Claude: **falli confermare dai diretti interessati**,
poi togli il flag.

## `statistiche.json` — i numeri dei giocatori

Una riga per giocatore, agganciata alla rosa tramite `numero`.

**Adesso è tutto a zero**: la stagione non è ancora cominciata. Aggiorna dopo
ogni partita, a mano o dal pannello.

`presenze`, `minuti`, `gol`, `assist`, `ammonizioni`, `espulsioni`, `mvp` sono
le statistiche serie. `papere`, `gol_sbagliati`, `ritardi`, `multe_euro` sono le
nostre. Sono tutti numeri interi, mai negativi, mai fra virgolette:
`"gol": 4` va bene, `"gol": "4"` no.

Se aggiungi un giocatore alla rosa, aggiungi anche la sua riga qui (all'inizio
tutta a zero): `check_data.py` te lo ricorda.

## `tornei.json` — classifica e calendario

Contiene **tutti** i tornei: quello in corso e l'archivio. Il campo `corrente`
in cima dice quale mostrare per primo e da quale prendere la prossima partita.

Adesso c'è solo il Torneo Birra Peroni, con `calendario: []` e la classifica
tutta a zero: le 5 avversarie sono segnate **`TBA`**. Finché nessuno ha giocato,
la pagina Tornei lo dice invece di mostrare una tabella di zeri, e la home
scrive "Calendario in arrivo" al posto del countdown. Appena metti la prima
partita nel calendario, tutto ricompare da solo.

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

## `locandine.json` — le card di presentazione

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
| `giocatore` | il nome da mostrare (se vuoto usa il cognome preso dal nome del file) |
| `didascalia` | una riga di testo che compare nella scheda, sotto il soprannome |

### Come si chiamano i file

Metti l'immagine in `foto_presentazione/` e chiamala:

- **`COGNOME_NUMERO.jpg`** per un giocatore — es. `ESPOSITO_29.jpg`. Il numero e'
  quello di **maglia**, non un progressivo.
- **`COGNOME_SIGLA.jpg`** per lo staff — es. `DIFRANCO_ALL.jpg`,
  `BUONAMICO_PRS.jpg`, `IACOBONE_SMM.jpg`.

Poi doppio click su `sync.command`. Da quel momento la persona compare sul sito.
Se sbagli il nome del file, lo script te lo dice invece di ignorarlo in silenzio.

Tutto il resto (`file`, `thumb`, dimensioni, `ordine`, `_sorgente`) è roba dello
script: se la modifichi, viene ricalcolata.

## `storia.json` — la pagina "La nostra storia"

`titolo`, `sottotitolo`, `foto_squadra` e `paragrafi` (una lista: ogni voce è un
capoverso).

### La foto di squadra

In cima alla pagina c'è la foto di gruppo. Finché non ce l'hai, al suo posto il
sito mostra un **segnaposto tratteggiato** con le stesse proporzioni (16:9), così
la pagina è già impaginata come sarà.

Per metterci la foto vera:

1. salva l'immagine in `assets/img/` (es. `assets/img/squadra-2026.jpg`);
2. scrivi il suo percorso nel campo `file`.

| campo | note |
|---|---|
| `file` | il percorso dell'immagine, **relativo alla radice del sito**: `assets/img/squadra-2026.jpg`. Vuoto = si vede il segnaposto |
| `alt` | la descrizione per chi non vede l'immagine (screen reader, immagine rotta) |
| `didascalia` | facoltativa, la riga di testo sotto la foto. Vuota = non compare |

Il segnaposto sparisce da solo nel momento in cui `file` non è più vuoto: non
c'è niente da toccare né nell'HTML né nel CSS.

Il campo **`"_da_rivedere": true` fa comparire sul sito l'avviso "bozza da
rivedere"**. Il testo che c'è adesso l'ha scritto Claude come traccia e contiene
dettagli inventati: quando lo riscrivi tu, metti `false` e l'avviso sparisce.
