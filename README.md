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
   - **`COGNOME_SIGLA.jpg`** per lo staff — es. `DI_FRANCO_ALL.jpg`
     (`ALL` allenatore, `PRS` presidente, `SMM` social media manager).
   - **`COGNOME_SIGLA.jpg`** anche per i tifosi — es. `ROSSI_TIF.jpg`
     (`TIF` tifoso, `ULT` ultras).
   - Cognome doppio: scrivilo con l'underscore, `DE_TULLIO_10.jpg`.
   - Omonimi: aggiungi l'**iniziale del nome** prima del numero,
     `DE_TULLIO_C_20.jpg` e `DE_TULLIO_I_9.jpg`. L'iniziale serve solo a te per
     ritrovare il file: sul sito resta "De Tullio", e l'aggancio al giocatore
     giusto lo fa comunque il numero di maglia.

   Vanno bene `.jpg`, `.jpeg`, `.png` e `.webp` (la lista sta in
   `tools/config.json`). L'estensione può anche essere sbagliata: lo script
   legge il formato vero dal contenuto del file e te lo dice.
2. **Doppio click su `sync.command`** dal Finder.
3. Lo script copia l'immagine, genera le versioni ridotte, aggiorna
   `data/locandine.json` e ti chiede se fare commit e push. Rispondi `s`.

**Le foto nuove entrano spente.** Nella loro voce di `data/locandine.json` trovi
`"pubblicato": false`: l'immagine è già pronta e ridimensionata, ma la card non
compare da nessuna parte. Puoi quindi caricare **tutte** le foto quando hai
tempo, in una volta sola, e poi far uscire una persona al giorno.

Per far uscire qualcuno:

1. apri `data/locandine.json` e cerca il suo `"id"` (es. `tedesco-11`);
2. in quella voce cambia `"pubblicato": false` in `"pubblicato": true`;
3. doppio click su `sync.command` e rispondi `s` al commit.

Da quel momento la persona compare nella Rosa, nelle Statistiche, in home fra gli
ultimi presentati, e il contatore "N di 16" si aggiorna da solo. La **data di
pubblicazione** viene timbrata da sola con il giorno in cui accendi il flag: è
quella a decidere l'ordine della griglia e chi sono gli "ultimi presentati" in
home, quindi l'ordine segue le uscite e non il giorno in cui hai importato le
foto. Se sbagli, `data_pubblicazione` resta modificabile a mano.

Se ci ripensi, rimetti `false`: la card sparisce dal sito al prossimo push.
Attenzione però: il flag **nasconde, non protegge**. L'immagine viene comunque
copiata nel repo ed è raggiungibile da chi ne indovina l'indirizzo
(`assets/locandine/web/tedesco-11.jpg`) — sul sito, semplicemente, non la linka
nessuno. Per una sorpresa a prova di curiosi, tieni la foto fuori da
`foto_presentazione/` finché non è il suo turno.

Lo script salva tre versioni della stessa immagine: la **miniatura** (~55 KB) per
le griglie, la versione **web** (~290 KB) per la scheda aperta, e l'**originale**
intatto in `assets/locandine/`, che resta nel repo come archivio ma non viene mai
servito a chi naviga.

> La prima volta che apri `sync.command`, macOS potrebbe dire che è di uno
> sviluppatore non identificato: tasto destro → **Apri** → **Apri**. Succede
> solo la prima volta.

### Se il sito sembra "vecchio" dopo un push

Non dovrebbe più succedere, ma vale la pena sapere perché. GitHub Pages dice al
browser di tenersi i file per 10 minuti (`max-age=600`), quindi dopo un push il
browser può continuare a usare la **copia vecchia** di `style.css` o di uno
script — mentre i dati in `data/*.json`, che vengono chiesti con `no-cache`,
sono già quelli nuovi. Il risultato è una pagina a metà: dati aggiornati
disegnati alla maniera vecchia. Sembra un bug del sito e non lo è.

Per questo `sync.command` fa passare `tools/versiona_asset.py`, che scrive nelle
pagine l'impronta del contenuto di ogni file:

```html
<script src="assets/js/tornei.js?v=1058253e"></script>
```

Cambi lo script, cambia l'impronta, cambia l'indirizzo, e il browser è costretto
a riscaricarlo. Se modifichi un CSS o un JS a mano e fai push senza passare da
`sync.command`, `check_data.py` te lo dice.

### 2. Aggiornare risultati, classifica e statistiche

Due modi, scegli quello che ti va:

- **A mano**: apri il file in `data/` e modificalo. La guida a ogni singolo
  campo è in **[`data/README.md`](data/README.md)**.
- **Col pannello**: fai partire il server locale (sotto), apri
  <http://localhost:8000/admin/>, modifica nei form, premi *Scarica JSON
  aggiornato* e metti il file scaricato al posto di quello in `data/`.
  Le schede sono *Rosa*, *Staff*, *Tifosi*, *Caratteristiche* (i cinque valori
  da 1 a 10 dello spider chart, uno per cursore), *Statistiche*, *Classifica* e
  *Calendario*. Rosa, Staff, Tifosi e Caratteristiche lavorano tutte sullo stesso
  `rosa.json`: sistemale e poi scaricalo **una volta sola**.

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
├── maglia.html  sponsor.html  privacy.html
├── sync.command              ← doppio click: pubblica le nuove locandine
├── manifest.json  robots.txt  sitemap.xml  .nojekyll
├── assets/
│   ├── css/style.css         ← TUTTA la grafica, palette compresa
│   ├── js/                   ← uno script per pagina + main.js condiviso
│   ├── img/                  ← stemma, icone, copertina social, placeholder,
│   │                            e qui va anche la foto di squadra
│   ├── sponsor/              ← i loghi degli sponsor per il sito
│   ├── maglia/               ← il simulatore 3D + le texture della maglia
│   ├── fonts/                ← i font del simulatore, serviti da qui e non da Google
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

### Cambiare uno sponsor

Tutto sta in **`data/sponsor.json`**: i loghi sul sito non sono scritti in
nessuna pagina, ci sono solo dei contenitori vuoti che si riempiono da soli.
Tocchi quel file e cambiano insieme la home, il footer di ogni pagina, la Rosa,
i Tornei, le Statistiche e la pagina Sponsor.

Per aggiungerne uno:

1. metti il logo in `assets/sponsor/` — **PNG con lo sfondo trasparente**,
   alto circa 160 px (più grande non serve, pesa e basta);
2. aggiungi una voce alla lista `sponsor` copiando una di quelle che ci sono;
3. `./.venv/bin/python tools/check_data.py` per controllare.

I campi che contano:

| campo | cosa fa |
|---|---|
| `livello` | `main` = esce dappertutto · `partner` = solo pagina sponsor e footer · `tecnico` = chi produce la maglia, sezione sua |
| `sfondo` | su che colore appoggiare il logo: **`scuro`** per i loghi chiari, **`chiaro`** per quelli neri |
| `attivo` | `false` lo toglie dal sito senza cancellarlo, come il `pubblicato` delle locandine |
| `sito`, `instagram` | se ci sono, il logo diventa cliccabile. `instagram` senza la `@` |

Il campo **`sfondo` è quello che si sbaglia più spesso**: un logo nero messo su
`scuro` non è rotto, semplicemente non si vede. Guarda sempre la pagina in tutti
e due i temi prima di pubblicare.

L'ordine della lista è l'ordine in cui compaiono. L'invito a diventare sponsor
in fondo alla pagina si spegne con `"diventa_sponsor": { "attivo": false }`.

### La maglia in 3D

Lo stesso file fa due cose diverse a seconda di come lo apri.

| Dove | Cosa fa |
|---|---|
| `maglia.html` sul sito, e `assets/maglia/simulatore.html` aperto da solo | **Vetrina**: la maglia si gira e si ingrandisce, e basta. Niente pannello, niente cursori, niente da spostare. |
| Pannello locale → scheda **Maglia** | **Editor**: compare il pannello con i cursori, i loghi si trascinano, si carica un logo nuovo, si scarica la foto e si scarica `maglia.json`. |

L'editor si accende solo se **tutte e due** le condizioni sono vere: il sito
gira in **locale** (`localhost`, `127.0.0.1`, `file://` o un nome `.local`) **e**
la pagina è chiamata con `?modifica=1`. Su `shakhtarpalese.it` non si accende
nemmeno aggiungendo il parametro a mano.

Non è una serratura — il file è pubblico e chi vuole se lo legge — ma è quanto
basta perché nessun visitatore possa spostare i loghi degli sponsor, nemmeno
per sbaglio, e perché quello che si vede sul sito sia sempre e solo quello che
sta scritto in `data/maglia.json`.

> Se fai partire il server e apri il sito dal **telefono** con l'IP di rete
> (`192.168.…`), resti in vetrina: l'editor vuole `localhost`. Usalo dal
> computer.

**Per cambiare la maglia del sito:**

1. `./.venv/bin/python -m http.server`, poi <http://localhost:8000/admin/>;
2. scheda **Maglia**, sposta quello che devi spostare;
3. **«Scarica maglia.json»** in fondo al pannello di destra;
4. metti il file in `data/maglia.json` al posto del vecchio e fai push.

Finché non fai il passo 4 stai lavorando su una copia che resta nel tuo
browser: il sito non cambia. Il pulsante «Torna alla maglia pubblicata» butta
via le prove e rimette quella che sta in `data/maglia.json`.

Un logo **caricato a mano** dal pannello vive solo nel tuo browser: serve a
provare un marchio al volo, e nel JSON scaricato non ci finisce (te lo dice).
Per pubblicarlo davvero metti il PNG in `assets/maglia/` e aggiungi la sua riga
alla lista `loghi` di `data/maglia.json`.

Le texture (`crest.png`, `mj.png`, `goldbet.png`, `dreambar.png`) stanno nella
stessa cartella. Se cambi un logo lì dentro cambia la maglia, **non** i loghi
del sito: quelli stanno in `assets/sponsor/` e sono due file diversi apposta,
perché sulla maglia servono più grandi.

I font (`assets/fonts/`) sono Barlow, Big Shoulders Display e Saira Semi
Condensed, scaricati una volta da Google Fonts e serviti da qui. Non è un
vezzo: caricarli da `fonts.googleapis.com` manderebbe l'indirizzo IP di chi
naviga a Google a ogni visita, e allora servirebbe il banner del consenso.

> `versiona_asset.py` non tocca `assets/maglia/simulatore.html` (lavora solo su
> `assets/js/` e `assets/css/`). Se modifichi **il simulatore**, chi ha appena
> visitato il sito può vederne la versione vecchia per una decina di minuti.
> Non vale per `data/maglia.json`, che viene chiesto con `no-cache` come tutti
> gli altri dati: la disposizione dei loghi si aggiorna subito.

### La targa dei fondatori

In fondo a ogni pagina, dopo la riga del copyright, c'è un piccone quasi
invisibile (⚒ — Shakhtar in ucraino vuol dire "minatore"). Cliccandolo si apre
la targa con tutti e diciassette i nomi.

Non c'è nessun nome scritto lì dentro: li legge da `data/rosa.json`, quindi
resta aggiornata da sola. Testo e interruttore stanno in `data/storia.json`,
sotto `"targa"`:

- `"attivo": false` toglie il piccone da tutte le pagine;
- `"solo_presentati": true` fa comparire solo chi ha già la sua locandina
  pubblicata — utile se stai ancora presentando la squadra una al giorno e non
  vuoi che la targa anticipi i nomi.

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

- [ ] **Le descrizioni degli sponsor in `data/sponsor.json`** — le ha scritte
      Claude a partire da quello che c'era già sul sito, non te le ha dette
      nessuno. Falle leggere agli interessati oppure svuotale (un campo vuoto
      non compare), poi togli `"_placeholder": true`. Se hai il sito o
      l'Instagram degli sponsor, riempi anche quelli: il logo diventa cliccabile.

- [ ] **`privacy.html`** — dice che il titolare del trattamento è "lo Shakhtar
      Palese, squadra di calcio amatoriale di Palese (Bari)" e come contatto usa
      la mail della squadra. Se un domani diventate un'associazione con una sede
      e un codice fiscale, quel paragrafo va aggiornato.

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

# riscrive style.css?v=... e *.js?v=... nelle pagine (lo fa gia' sync.command)
./.venv/bin/python tools/versiona_asset.py

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

Niente analytics, niente cookie, niente form di contatto, nessun backend.
Niente caricato da fuori: nemmeno i font, che stanno in `assets/fonts/` proprio
per non far chiamare Google al browser di chi naviga. È un sito statico e deve
restare tale: la sola cosa che deve funzionare per sempre è che il link,
incollato in una storia Instagram, apra qualcosa di decente.

Niente banner dei cookie, perché non c'è niente da far accettare: le uniche due
cose salvate (il tema scelto e la disposizione dei loghi sulla maglia 3D) stanno
nella memoria locale del browser, sono tecniche e non richiedono consenso.
`privacy.html` lo spiega per esteso — è l'informativa vera e propria, linkata
dal footer di ogni pagina.

**Se un giorno aggiungi qualcosa che raccoglie dati** — un contatore di visite,
un modulo, un video di YouTube o un post di Instagram incorporato, un font di
Google — da quel momento serve il consenso *prima* che parta la richiesta, e
`privacy.html` va riscritta. Non è una formalità: è esattamente il caso in cui
il banner diventa obbligatorio.
