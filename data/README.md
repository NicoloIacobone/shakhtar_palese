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

Adesso c'è solo il Torneo Birra Peroni: 6 squadre (noi, Borussia Enziteto,
FC Vision, Jalapeños, La Breda, Midal FC) e le nostre 5 partite del 1º girone
di andata. La classifica è tutta a zero e in ordine alfabetico — **non è una
graduatoria**: dalla prima giornata riscrivi tu `pos` seguendo i punti. Finché
nessuno ha giocato, la pagina Tornei lo dice invece di mostrare una tabella di
zeri.

**Nel calendario ci sono solo le partite che giochiamo noi.** Le altre del
girone non servono: la classifica arriva già fatta dagli organizzatori.

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
- **`COGNOME_SIGLA.jpg`** per lo staff — es. `DIFRANCO_ALL.jpg`,
  `BUONAMICO_PRS.jpg`, `IACOBONE_SMM.jpg`.

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
