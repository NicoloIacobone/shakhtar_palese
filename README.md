# Shakhtar Palese — sito ufficiale

Sito della squadra di calcio amatoriale **Shakhtar Palese** (Palese, Bari).
Online su **<https://www.shakhtarpalese.it/>** (dominio custom; il vecchio
indirizzo `nicoloiacobone.github.io/shakhtar_palese` reindirizza qui).

HTML, CSS e JavaScript scritti a mano. Nessun framework, nessun `npm install`,
nessun passaggio di build: i file che stanno in `docs/` sono esattamente quelli
che vengono serviti. I contenuti stanno in `docs/data/*.json` e il sito li carica con
`fetch()`.

Tutte le istruzioni qui sotto sono per **macOS**.

---

## Le tre cose che farai davvero

### 1. Presentare una persona

Il sito mostra **solo chi è già stato presentato**. Gli altri sono già scritti in
`docs/data/rosa.json`, pronti, ma restano invisibili finché non esce la loro card.

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
   `docs/data/locandine.json` e ti chiede se fare commit e push. Rispondi `s`.

**Le foto nuove entrano spente.** Nella loro voce di `docs/data/locandine.json` trovi
`"pubblicato": false`: l'immagine è già pronta e ridimensionata, ma la card non
compare da nessuna parte. Puoi quindi caricare **tutte** le foto quando hai
tempo, in una volta sola, e poi far uscire una persona al giorno.

Per far uscire qualcuno:

1. apri `docs/data/locandine.json` e cerca il suo `"id"` (es. `tedesco-11`);
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
(`/assets/locandine/web/tedesco-11.jpg`) — sul sito, semplicemente, non la linka
nessuno. Per una sorpresa a prova di curiosi, tieni la foto fuori da
`foto_presentazione/` finché non è il suo turno.

Lo script salva tre versioni della stessa immagine: la **miniatura** (~55 KB) per
le griglie, la versione **web** (~290 KB) per la scheda aperta, e l'**originale**
intatto in `docs/assets/locandine/`, che resta nel repo come archivio ma non viene mai
servito a chi naviga.

> La prima volta che apri `sync.command`, macOS potrebbe dire che è di uno
> sviluppatore non identificato: tasto destro → **Apri** → **Apri**. Succede
> solo la prima volta.

### Se il sito sembra "vecchio" dopo un push

Non dovrebbe più succedere, ma vale la pena sapere perché. GitHub Pages dice al
browser di tenersi i file per 10 minuti (`max-age=600`), quindi dopo un push il
browser può continuare a usare la **copia vecchia** di `sito.css` o di uno
script — mentre i dati in `docs/data/*.json`, che vengono chiesti con `no-cache`,
sono già quelli nuovi. Il risultato è una pagina a metà: dati aggiornati
disegnati alla maniera vecchia. Sembra un bug del sito e non lo è.

Per questo `sync.command` fa passare `tools/versiona_asset.py`, che scrive nelle
pagine l'impronta del contenuto di ogni file:

```html
<script src="assets/js/pagina-partite.js?v=1058253e"></script>
```

Cambi lo script, cambia l'impronta, cambia l'indirizzo, e il browser è costretto
a riscaricarlo. Se modifichi un CSS o un JS a mano e fai push senza passare da
`sync.command`, `check_data.py` te lo dice.

### 2. Aggiornare risultati, classifica e statistiche

**Di solito non serve far niente:** classifica, calendario, risultati, numeri dei
giocatori e dettagli delle partite li copia da solo dal sito del torneo il
workflow di GitHub (`tools/sync_torneo.py`), e i link a highlights e foto li
legge dal Drive (`tools/sync_media.py`). Vedi `docs/data/README.md`.

Per tutto il resto, due modi, scegli quello che ti va:

- **A mano**: apri il file in `docs/data/` e modificalo. La guida a ogni singolo
  campo è in **[`docs/data/README.md`](docs/data/README.md)**.
- **Col pannello**: fai partire il server locale (sotto), apri
  <http://localhost:8000/admin/>, modifica nei form, premi *Scarica JSON
  aggiornato* e metti il file scaricato al posto di quello in `docs/data/`.
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
./.venv/bin/python -m http.server --directory docs
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
├── README.md
├── sync.command              ← doppio click: pubblica le nuove locandine
├── .github/workflows/        ← il sync automatico dei dati del torneo
├── tools/
│   ├── config.json           ← dove sta la cartella sorgente, dimensioni thumb…
│   ├── sync_locandine.py     ← copia immagini + miniature + JSON
│   ├── sync_torneo.py        ← scarica classifica, calendario, numeri e dettagli (lo lancia GitHub)
│   ├── sync_media.py         ← legge dal Drive i link a highlights e foto (lo lancia GitHub)
│   ├── check_data.py         ← valida tutti i JSON
│   ├── versiona_asset.py     ← aggiorna i ?v=... di CSS e JS nelle pagine
│   └── make_icons.py         ← rigenera logo e icone dallo stemma ufficiale
├── foto_presentazione/       ← le card generate con l'IA (non versionata)
└── docs/                     ← IL SITO: è l'unica cartella che GitHub Pages pubblica
    ├── index.html  tornei.html (Partite)  rosa.html  giocatore.html
    ├── statistiche.html  altro.html  maglia.html  sponsor.html
    ├── storia.html  contatti.html  privacy.html  404.html
    ├── CNAME  manifest.json  robots.txt  sitemap.xml  .nojekyll
    ├── assets/
    │   ├── css/bundle.css    ← il design system, copiato identico: NON si tocca
    │   ├── css/sito.css      ← le aggiunte del sito al sistema, numerate e spiegate
    │   ├── css/style.css     ← la grafica vecchia: la usa solo il pannello admin
    │   ├── js/bundle.js      ← i comportamenti del design system: NON si tocca
    │   ├── js/sito.js        ← le funzioni comuni (dati, schede, footer, targa…)
    │   ├── js/pagina-*.js    ← uno script per pagina
    │   ├── img/              ← stemma, icone, copertina social, tessuto, foto della Storia
    │   ├── stemmi/           ← gli stemmi delle avversarie (<nome>.png)
    │   ├── sponsor/          ← i loghi degli sponsor per il sito
    │   ├── maglia/           ← il simulatore 3D + le texture della maglia
    │   ├── fonts/            ← i font del simulatore, serviti da qui e non da Google
    │   └── locandine/        ← originali + web/ + thumbs/ (le genera lo script)
    ├── data/                 ← i contenuti del sito. Vedi docs/data/README.md
    └── admin/                ← pannello locale: online ma non linkato, e senza dati segreti
```

### Cambiare uno sponsor

Tutto sta in **`docs/data/sponsor.json`**: i loghi sul sito non sono scritti in
nessuna pagina. Tocchi quel file e cambiano insieme la striscia nera in fondo a
ogni pagina (solo gli sponsor `main`) e la pagina Sponsor.

Per aggiungerne uno:

1. metti il logo in `docs/assets/sponsor/` — **PNG con lo sfondo trasparente**,
   alto circa 160 px (più grande non serve, pesa e basta);
2. aggiungi una voce alla lista `sponsor` copiando una di quelle che ci sono;
3. `./.venv/bin/python tools/check_data.py` per controllare.

I campi che contano:

| campo | cosa fa |
|---|---|
| `livello` | `main` = anche nella striscia in fondo a ogni pagina · gli altri solo nella pagina Sponsor |
| `attivo` | `false` lo toglie dal sito senza cancellarlo, come il `pubblicato` delle locandine |

I loghi stanno sempre su nero (regola del design system): servono loghi chiari.
`sfondo`, `sito` e `instagram` restano nel file ma il sito nuovo non li usa.

L'ordine della lista è l'ordine in cui compaiono. L'invito a diventare sponsor
in fondo alla pagina si spegne con `"diventa_sponsor": { "attivo": false }`.

### La maglia in 3D

Lo stesso file fa due cose diverse a seconda di come lo apri.

| Dove | Cosa fa |
|---|---|
| `maglia.html` sul sito, e `docs/assets/maglia/simulatore.html` aperto da solo | **Vetrina**: la maglia si gira e si ingrandisce, e basta. Niente pannello, niente cursori, niente da spostare. |
| Pannello locale → scheda **Maglia** | **Editor**: compare il pannello con i cursori, i loghi si trascinano, si carica un logo nuovo, si scarica la foto e si scarica `maglia.json`. |

L'editor si accende solo se **tutte e due** le condizioni sono vere: il sito
gira in **locale** (`localhost`, `127.0.0.1`, `file://` o un nome `.local`) **e**
la pagina è chiamata con `?modifica=1`. Su `shakhtarpalese.it` non si accende
nemmeno aggiungendo il parametro a mano.

Non è una serratura — il file è pubblico e chi vuole se lo legge — ma è quanto
basta perché nessun visitatore possa spostare i loghi degli sponsor, nemmeno
per sbaglio, e perché quello che si vede sul sito sia sempre e solo quello che
sta scritto in `docs/data/maglia.json`.

> Se fai partire il server e apri il sito dal **telefono** con l'IP di rete
> (`192.168.…`), resti in vetrina: l'editor vuole `localhost`. Usalo dal
> computer.

**Per cambiare la maglia del sito:**

1. `./.venv/bin/python -m http.server --directory docs`, poi <http://localhost:8000/admin/>;
2. scheda **Maglia**, sposta quello che devi spostare;
3. **«Scarica maglia.json»** in fondo al pannello di destra;
4. metti il file in `docs/data/maglia.json` al posto del vecchio e fai push.

Finché non fai il passo 4 stai lavorando su una copia che resta nel tuo
browser: il sito non cambia. Il pulsante «Torna alla maglia pubblicata» butta
via le prove e rimette quella che sta in `docs/data/maglia.json`.

Un logo **caricato a mano** dal pannello vive solo nel tuo browser: serve a
provare un marchio al volo, e nel JSON scaricato non ci finisce (te lo dice).
Per pubblicarlo davvero metti il PNG in `docs/assets/maglia/` e aggiungi la sua riga
alla lista `loghi` di `docs/data/maglia.json`.

Le texture (`crest.png`, `mj.png`, `goldbet.png`, `dreambar.png`) stanno nella
stessa cartella. Se cambi un logo lì dentro cambia la maglia, **non** i loghi
del sito: quelli stanno in `docs/assets/sponsor/` e sono due file diversi apposta,
perché sulla maglia servono più grandi.

I font (`docs/assets/fonts/`) sono Barlow, Big Shoulders Display e Saira Semi
Condensed, scaricati una volta da Google Fonts e serviti da qui. Non è un
vezzo: caricarli da `fonts.googleapis.com` manderebbe l'indirizzo IP di chi
naviga a Google a ogni visita, e allora servirebbe il banner del consenso.

> `versiona_asset.py` non tocca `docs/assets/maglia/simulatore.html` (lavora solo su
> `docs/assets/js/` e `docs/assets/css/`). Se modifichi **il simulatore**, chi ha appena
> visitato il sito può vederne la versione vecchia per una decina di minuti.
> Non vale per `docs/data/maglia.json`, che viene chiesto con `no-cache` come tutti
> gli altri dati: la disposizione dei loghi si aggiorna subito.

### La targa dei fondatori

In fondo a ogni pagina, dopo la riga del copyright, c'è un piccone (Shakhtar in
ucraino vuol dire "minatore"). Toccandolo si apre la targa con i nomi.

I nomi della rosa li legge da `docs/data/rosa.json`, quindi resta aggiornata da
sola. Testo, interruttore, chi escludere e la menzione d'onore stanno in
`docs/data/storia.json`, sotto `"targa"`: la guida campo per campo è in
`docs/data/README.md`.

### Cambiare i colori

Colori, font, spazi e componenti vengono dal design system: stanno in
`docs/assets/css/bundle.css`, che è la copia identica di quello del sistema e
**non si modifica a mano**. Per cambiarli si cambia il sistema e si ricopia il
file; le aggiunte del sito stanno in `sito.css`. Il sito ha un solo tema, chiaro.

### Cambiare lo stemma

Tutto il marchio del sito nasce da **un solo file**:
`docs/assets/img/logo-originale.png` (PNG con sfondo trasparente, più è grande meglio
è). Sostituiscilo e poi lancia:

```bash
./.venv/bin/python tools/make_icons.py
```

Rigenera da solo i loghi `logo.png` (pannello admin) e `logo-grande.png`, la
favicon, l'icona per iPhone, le icone dell'app installabile e la copertina che si
vede quando incolli il link. Lo stemma dentro le pagine è `stemma-colori-512.png`.

---

## GitHub Pages: **già configurato**

Non c'è niente da fare, è già tutto attivo. Per riferimento, le impostazioni in
*Settings → Pages* del repo sono:

| impostazione | valore |
|---|---|
| Source | Deploy from a branch |
| Branch | `main` |
| Cartella | `/docs` |
| Enforce HTTPS | attivo |

Il file `docs/.nojekyll` serve a dire a GitHub di pubblicare i file così
come sono, senza passarli da Jekyll: **non cancellarlo**.

Dopo ogni `git push` il sito si aggiorna da solo in circa un minuto. Se non vedi
le modifiche, è la cache del browser: ricarica con `Cmd+Shift+R`.

---

## Cose ancora da sistemare

Tutte visibili sul sito, e `check_data.py` le ricorda a ogni giro:

- [ ] **I campi personali in `docs/data/rosa.json`** — `classe`,
      `posizione_preferita`, `frase_preferita`, `superstizione`,
      `rito_post_allenamento`, `skill_fuori_campo` li ha scritti Claude: falli
      confermare ai diretti interessati, oppure svuotali (**un campo vuoto non
      compare**). Poi togli `"_placeholder": true`.

- [ ] **Le descrizioni degli sponsor in `docs/data/sponsor.json`** — scritte da
      Claude: falle leggere agli interessati oppure svuotale, poi togli
      `"_placeholder": true`.

- [ ] **`privacy.html`** — il titolare del trattamento è "lo Shakhtar Palese,
      squadra di calcio amatoriale di Palese (Bari)" con la mail della squadra.
      Se un domani diventate un'associazione con sede e codice fiscale, quel
      paragrafo va aggiornato.

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

# riscrive *.css?v=... e *.js?v=... nelle pagine (lo fa gia' sync.command)
./.venv/bin/python tools/versiona_asset.py

# rigenera favicon, icone e copertina social dal logo
./.venv/bin/python tools/make_icons.py

# server locale
./.venv/bin/python -m http.server --directory docs
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
Niente caricato da fuori: nemmeno i font, che stanno in `docs/assets/fonts/` proprio
per non far chiamare Google al browser di chi naviga. È un sito statico e deve
restare tale: la sola cosa che deve funzionare per sempre è che il link,
incollato in una storia Instagram, apra qualcosa di decente.

Niente banner dei cookie, perché non c'è niente da far accettare: l'unica cosa
salvata sul sito pubblico è un segno nella memoria di sessione (`sp-striscia`,
per disegnare la striscia dell'header solo al primo arrivo), tecnico e senza
consenso. Il tema del pannello e le prove sulla maglia restano nel browser solo
in locale.
`privacy.html` lo spiega per esteso — è l'informativa vera e propria, linkata
dal footer di ogni pagina.

**Se un giorno aggiungi qualcosa che raccoglie dati** — un contatore di visite,
un modulo, un video di YouTube o un post di Instagram incorporato, un font di
Google — da quel momento serve il consenso *prima* che parta la richiesta, e
`privacy.html` va riscritta. Non è una formalità: è esattamente il caso in cui
il banner diventa obbligatorio.
