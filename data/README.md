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

Tre liste: `giocatori`, `staff` e `tifosi`.

**Regola importante:** sul sito compaiono **solo le persone gia' presentate**,
cioe' quelle che hanno la loro locandina con `"pubblicato": true` in
`locandine.json`. Le altre restano qui, pronte, e appaiono nel momento in cui
accendi quel flag. Se preferisci mostrarli tutti subito, in `config.json` metti
`"mostra_solo_presentati": false`.

**L'ordine della griglia non si scrive qui: in cima c'è sempre l'ultimo
presentato.** Prima il reparto — attaccanti, centrocampisti, difensori,
portieri, cioè al contrario di come esce la squadra — poi, dentro il reparto, la
locandina più recente. Presentando la squadra da portiere ad attaccante i due
criteri coincidono; se esce qualcuno fuori sequenza, il suo reparto resta
comunque unito invece di spezzarsi. Chi non ha ancora la locandina (si vede solo
con `mostra_solo_presentati: false`) va in coda al suo reparto, per numero di
maglia.

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

**Caratteristiche** — il blocco `caratteristiche`, cinque valori interi **da 1 a
10**, che nella scheda diventano lo **spider chart**:

| campo | cosa misura |
|---|---|
| `lunghezza_capelli` | quanti capelli hai in testa. Con `1` finisci anche nel filtro **Pelati** della pagina Rosa: quel filtro prende solo i pelati veri, non i capelli corti |
| `lunghezza_pene` | vedi tu |
| `fame_gol` | quanto vuole segnare |
| `fiducia_presidente` | quanta ne ha nel presidente |
| `fiducia_allenatore` | quanta ne ha nell'allenatore |

Sono numeri **senza virgolette** (`"fame_gol": 9`, non `"9"`). Il modo comodo di
metterli è il pannello locale, scheda **Caratteristiche**: una riga per
giocatore, un cursore per valore, poi *Scarica rosa.json*. Se il blocco manca
del tutto lo spider chart semplicemente non compare nella scheda; se c'è, ci
devono essere **tutti e cinque** i campi — `check_data.py` te lo dice.

**Un campo lasciato vuoto semplicemente non compare nella scheda.** Non ci sono
buchi ne' trattini: meglio una scheda corta che una piena di caselle vuote. Puoi
quindi riempirli con calma, uno alla volta.

### Lo staff

Stessi campi, ma senza `numero` (quindi anche senza `piede` e senza
`caratteristiche`). In piu':

| campo | note |
|---|---|
| `codice` | la sigla: `ALL` allenatore, `PRS` presidente, `SMM` social media manager (ammesse anche `DS`, `PREP`, `MAG`) |
| `ruolo` | il ruolo per esteso, che compare nella scheda |

Lo staff non ha statistiche e non compare nella pagina Statistiche. La sua
locandina si collega **col cognome**, non col numero: vedi sotto.

### I tifosi

La lista `tifosi` funziona **esattamente come lo staff**: stessi campi, stessa
card, stessa scheda, locandina agganciata al cognome. Cambiano solo le sigle
ammesse in `codice`: `TIF` tifoso, `ULT` ultras.

Nella pagina Rosa hanno un blocco tutto loro in fondo, sotto quello dello staff,
e un filtro *Tifosi* fra i chip in alto. Blocco e filtro compaiono **solo quando
c'e' dentro qualcuno gia' presentato**: finche' la lista e' vuota la pagina e'
identica a prima.

Il cognome dev'essere diverso da quelli dello staff: la locandina si aggancia a
quello, e due omonimi si scambierebbero la foto. `check_data.py` te lo dice.

**La foto non si scrive qui.** Si aggancia da sola: vedi `locandine.json`.

`"_placeholder": true` significa "questi dati sono ancora inventati". I nomi, i
numeri e i ruoli sono veri; classe, frase preferita, superstizione, rito, skill
e i cinque valori delle caratteristiche sono segnaposto scritti da Claude:
**falli confermare dai diretti interessati**, poi togli il flag.

## `statistiche.json` — i numeri dei giocatori

Una riga per giocatore, agganciata alla rosa tramite `numero`.

**`gol`, `ammonizioni`, `espulsioni` e `mvp` si aggiornano da soli** dal sito
del torneo (vedi *Aggiornamento automatico dal torneo* più sotto): se li cambi a
mano, al giro successivo vengono riscritti. Tutto il resto — presenze, minuti,
assist e le statistiche nostre — il torneo non lo registra: quello resta a mano
o dal pannello.

`presenze`, `minuti`, `gol`, `assist`, `ammonizioni`, `espulsioni`, `mvp` sono
le statistiche serie. `papere`, `gol_sbagliati`, `ritardi`, `multe_euro` sono le
nostre. Sono tutti numeri interi, mai negativi, mai fra virgolette:
`"gol": 4` va bene, `"gol": "4"` no.

Se aggiungi un giocatore alla rosa, aggiungi anche la sua riga qui (all'inizio
tutta a zero): `check_data.py` te lo ricorda.

## `tornei.json` — classifica e calendario

Contiene **tutti** i tornei: quello in corso e l'archivio. Il campo `corrente`
in cima dice quale mostrare per primo e da quale prendere la prossima partita.

Adesso c'è solo il Torneo Birra Peroni: 6 squadre (noi, Borussia Enziteto,
FC Vision, Jalapeños, La Breda, Midal FC) e le nostre 20 partite dei 4 gironi.
**Classifica e calendario si aggiornano da soli** dal sito del torneo: vedi
*Aggiornamento automatico dal torneo* qui sotto. Finché nessuno ha giocato, la
pagina Tornei mostra la tabella in ordine alfabetico e con un trattino al posto
della posizione; dalla prima giornata in poi comanda il campo `pos`.

**Nel calendario ci sono solo le partite che giochiamo noi.** Le altre del
girone non servono: la classifica arriva già fatta dagli organizzatori.

### Aggiornamento automatico dal torneo

Il torneo usa Quick Tournament (<https://qt.at4s.it>), che pubblica i dati
tramite un'API pubblica. Lo script `tools/sync_torneo.py` li scarica e riscrive:

| file | cosa | cosa resta tuo |
|---|---|---|
| `tornei.json` | `classifica` intera, `calendario` (date, avversari, risultati), `stato` da `in_programma` a `in_corso` | `campo` e `note` di ogni partita, `regolamento`, tutto il resto |
| `statistiche.json` | `gol`, `ammonizioni`, `espulsioni`, `mvp` | tutti gli altri campi |

Il collegamento si fa con il campo **`quick_tournament_id`** del torneo: è il
codice lungo nell'indirizzo della pagina pubblica
(`qt.at4s.it/public/standings/`**`08df0e8e-…`**). Un torneo senza quel campo
non viene toccato: per un torneo nuovo basta aggiungerlo. I giocatori si
collegano per nome e cognome, e se non torna per numero di maglia.

**Gira da solo su GitHub** (`.github/workflows/sync-torneo.yml`): ogni ora la
sera e due volte di giorno, e fa commit solo se qualcosa è cambiato. Prima di
pubblicare lancia `check_data.py`: se i dati non tornano, non pubblica.
Per aggiornare subito: GitHub → *Actions* → *Sync torneo* → *Run workflow*,
oppure dal tuo computer `python3 tools/sync_torneo.py` (con `--check` dice
solo cosa cambierebbe).

Visto che anche GitHub fa i suoi commit, **prima di lavorare in locale fai
`git pull`**. `sync.command` lo fa già da solo prima del push.

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
| `id` | una sigla univoca, es. `bp26-a1g8` (andata 1, giornata 8) |
| `giornata` | numero |
| `girone` | facoltativo, es. `"1º girone di andata"`. I gironi sono 4 e la giornata riparte da 1 in ognuno: senza questo, "Giornata 2" comparirebbe quattro volte |
| `data`, `ora` | `"2026-09-10"` e `"20:30"`. **Vuote solo se lo `stato` è `da_definire`** |
| `casa`, `ospite` | i nomi delle squadre, scritti come in classifica |
| `gol_casa`, `gol_ospite` | `null` finché non si gioca, poi i numeri |
| `stato` | `da_giocare`, `da_definire`, `giocata` o `rinviata` |
| `campo` | dove si gioca |
| `note` | facoltativo, appare sotto il risultato |

**`da_definire` = sappiamo con chi giochiamo, non ancora quando.** La partita
compare in fondo al calendario con scritto "data da definire" e **non** entra
nel countdown della home. Quando i capitani si accordano: riempi `data` e `ora`
e cambia lo `stato` in `da_giocare`. Se tutte le partite sono `da_definire`, in
home al posto del countdown compare "Date da fissare".

### Il regolamento in fondo alla pagina Tornei

Il campo facoltativo `regolamento` fa comparire la sezione **"Come funziona"**:

```json
"regolamento": {
  "gruppi": [
    { "titolo": "Struttura", "voci": ["prima riga", "seconda riga"] }
  ]
}
```

Ogni gruppo è una card, ogni voce un punto elenco. Se il torneo non ha il campo
`regolamento` (l'archivio, per esempio), la sezione non compare proprio.

**La "prossima partita" della home non si scrive da nessuna parte**: è la prima
partita `da_giocare` in ordine di data e ora. Il countdown si calcola da lì.
I risultati li scrive lo script: a mano servirebbe solo per un torneo senza
`quick_tournament_id` (gol nei due campi e `stato` a `giocata`).

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

Ci sono però **quattro campi tuoi, che lo script non tocca mai**, nemmeno
rilanciandolo:

| campo | a cosa serve |
|---|---|
| `pubblicato` | `true` = la card si vede sul sito, `false` = è pronta ma non esce ancora. **È l'interruttore**: sta in cima alla voce, subito dopo l'`id` |
| `data_pubblicazione` | `"2026-09-10"`. **Ha la precedenza su tutto** ed è il modo per correggere l'ordine della griglia se la data del file è sbagliata |
| `giocatore` | il nome da mostrare (se vuoto usa il cognome preso dal nome del file) |
| `didascalia` | una riga di testo che compare nella scheda, sotto il soprannome |

### Carica tutto adesso, pubblica quando vuoi

Le locandine nuove nascono con **`"pubblicato": false`**: l'immagine viene
copiata e ridimensionata subito, ma la persona non compare né nella Rosa, né
nelle Statistiche, né fra gli "ultimi presentati" in home. Puoi quindi mettere
in `foto_presentazione/` tutte le foto che hai, lanciare `sync.command` una volta
sola, e poi far uscire una persona al giorno cambiando **una parola**:

```json
{
  "id": "tedesco-11",
  "pubblicato": true,        ← era false
  ...
}
```

Poi doppio click su `sync.command` e rispondi `s`: entro un minuto è online.

Tre cose da sapere:

- **`true` e `false` vanno scritti senza virgolette.** `"pubblicato": "false"` è
  una stringa, non un valore booleano: `check_data.py` te lo segnala come errore.
- **La data di pubblicazione la timbra lo script**, il giorno in cui accende il
  flag, e da lì in poi non la tocca più. Serve perché le foto le carichi tutte
  insieme: senza timbro l'ordine della griglia seguirebbe il giorno in cui hai
  importato i file, non quello in cui sono uscite le card. Se vuoi un'altra data,
  scrivila a mano in `data_pubblicazione` e vince la tua.
- **Il flag nasconde, non protegge.** L'immagine è comunque nel repo e online:
  chi indovina l'indirizzo (`assets/locandine/web/tedesco-11.jpg`) la vede, ma
  sul sito non c'è nessun link che ci porti. Se una card deve restare segreta
  davvero, tieni la foto fuori da `foto_presentazione/` finché non è il momento.

Le voci ancora spente lo script te le ricorda in fondo al riepilogo, e le tiene
in fondo alla lista nel JSON: sopra ci sono le pubblicate, in ordine di uscita.

### Come si chiamano i file

Metti l'immagine in `foto_presentazione/` e chiamala:

- **`COGNOME_NUMERO.jpg`** per un giocatore — es. `ESPOSITO_29.jpg`. Il numero e'
  quello di **maglia**, non un progressivo.
- **`COGNOME_SIGLA.jpg`** per staff e tifosi — es. `DI_FRANCO_ALL.jpg`,
  `BUONAMICO_PRS.jpg`, `IACOBONE_SMM.jpg`, `ROSSI_TIF.jpg`.
- **Cognome doppio**: con l'underscore, `DE_TULLIO_10.png`.
- **Omonimi**: l'iniziale del nome prima del numero, `DE_TULLIO_C_20.png` e
  `DE_TULLIO_I_9.png`. Sul sito compare comunque "De Tullio": l'iniziale serve
  solo a distinguere i file, e il collegamento al giocatore lo fa il numero.

Poi doppio click su `sync.command`. La locandina entra nel sito **spenta**: per
farla uscire metti `"pubblicato": true`, come spiegato qui sopra.
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
