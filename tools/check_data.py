#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
check_data.py — controlla tutti i JSON del sito PRIMA che lo scopra il pubblico.

Verifica, per ogni file in data/:
  · che sia JSON valido;
  · che ci siano i campi obbligatori e che i numeri siano numeri;
  · che i riferimenti incrociati tornino (statistiche <-> rosa, locandine <-> rosa);
  · che le caratteristiche dello spider chart ci siano tutte e stiano fra 1 e 10;
  · che ogni immagine citata nei JSON esista davvero su disco;
  · che la classifica sia coerente (punti = 3*V + N, G = V+N+P, DR = GF-GS)
    e che combaci con i risultati del calendario per la nostra squadra.

Si lancia con:   ./.venv/bin/python tools/check_data.py

Esce con codice 1 se c'e' almeno un ERRORE (i soli avvisi non bloccano).
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

# La radice del sito: tutto cio' che GitHub Pages pubblica sta in docs/.
ROOT = Path(__file__).resolve().parent.parent / "docs"
DATA = ROOT / "data"

VERDE, GIALLO, ROSSO, GRIGIO, FINE = "\033[32m", "\033[33m", "\033[31m", "\033[90m", "\033[0m"

errori: list[str] = []
avvisi: list[str] = []
segnaposto: list[str] = []


def errore(dove, msg):  errori.append(f"{dove}: {msg}")
def avviso(dove, msg):  avvisi.append(f"{dove}: {msg}")


def carica(nome):
    p = DATA / nome
    if not p.exists():
        errore(nome, "il file non esiste in data/")
        return None
    try:
        with p.open(encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        errore(nome, f"JSON non valido — riga {e.lineno}, colonna {e.colno}: {e.msg}")
        return None


def obbligatori(dove, oggetto, campi, etichetta=""):
    """Controlla che i campi ci siano e non siano vuoti."""
    for c in campi:
        if c not in oggetto:
            errore(dove, f"{etichetta}manca il campo obbligatorio '{c}'")
        elif oggetto[c] in (None, ""):
            errore(dove, f"{etichetta}il campo '{c}' e' vuoto")


def interi(dove, oggetto, campi, etichetta=""):
    for c in campi:
        v = oggetto.get(c)
        if v is None:
            continue
        if isinstance(v, bool) or not isinstance(v, int):
            errore(dove, f"{etichetta}'{c}' deve essere un numero intero, invece e' {v!r}")


def immagine_esiste(dove, percorso_rel, etichetta=""):
    if not percorso_rel:
        return
    if str(percorso_rel).startswith(("http://", "https://", "/")):
        avviso(dove, f"{etichetta}'{percorso_rel}' non e' un percorso relativo: "
                     f"in sottocartella su GitHub Pages non funzionera'.")
        return
    if not (ROOT / percorso_rel).exists():
        errore(dove, f"{etichetta}l'immagine '{percorso_rel}' non esiste su disco")


# ---------------------------------------------------------------- config ---
def controlla_config():
    d = carica("config.json")
    if d is None:
        return
    obbligatori("config.json", d, ["sito", "social", "campo"])
    if isinstance(d.get("sito"), dict):
        obbligatori("config.json", d["sito"], ["nome", "base_url"], "sito → ")
        base = d["sito"].get("base_url", "")
        if base and not base.endswith("/"):
            avviso("config.json", "sito.base_url dovrebbe finire con '/' (serve per le URL Open Graph)")
    if isinstance(d.get("social"), dict):
        obbligatori("config.json", d["social"], ["instagram", "tiktok", "email"], "social → ")
        mail = d["social"].get("email", "")
        if mail and not re.match(r"^[^@\s]+@[^@\s]+\.[a-z]{2,}$", mail):
            errore("config.json", f"social.email non sembra un indirizzo valido: {mail!r}")
    if isinstance(d.get("campo"), dict):
        obbligatori("config.json", d["campo"], ["nome", "indirizzo", "maps_url"], "campo → ")


# ------------------------------------------------------------------ rosa ---
# Campi personali facoltativi, uguali per giocatori, staff e tifosi: se vuoti la
# scheda semplicemente non li mostra.
CAMPI_PERSONALI = ["soprannome", "provenienza", "classe", "posizione_preferita",
                   "frase_preferita", "superstizione", "rito_post_allenamento",
                   "skill_fuori_campo"]
SIGLE_STAFF = {"ALL", "PRS", "SMM", "PH", "DS", "PREP", "MAG"}
# I tifosi funzionano come lo staff: niente numero di maglia, locandina agganciata
# al cognome. Se aggiungi una sigla qui, mettila anche in tools/sync_locandine.py
# (che riconosce il nome del file) e in admin/admin.js (la tendina del pannello).
SIGLE_TIFOSI = {"TIF", "ULT"}

# Le caratteristiche dello spider chart della scheda giocatore: numeri interi da
# 1 a 10. Stessa lista, stessi nomi, anche in assets/js/rosa.js (che la disegna)
# e in admin/admin.js (che la fa modificare): se ne aggiungi una, aggiungila in
# tutti e tre i posti.
CARATTERISTICHE = ["lunghezza_capelli", "lunghezza_pene", "fame_gol",
                   "fiducia_presidente", "fiducia_allenatore"]
CAR_MIN, CAR_MAX = 1, 10
# Con i capelli a questo valore sei nel filtro "Pelati" della pagina Rosa
# (assets/js/rosa.js): pelato vero, non "cortissimi".
PELATO_MAX = 1


def controlla_caratteristiche(dove, giocatore, etichetta=""):
    """Il blocco 'caratteristiche': o non c'e', o c'e' tutto e nei limiti."""
    car = giocatore.get("caratteristiche")
    if car is None:
        return False
    if not isinstance(car, dict):
        errore(dove, f"{etichetta}'caratteristiche' deve essere un oggetto con i "
                     f"cinque valori, invece e' {car!r}")
        return False
    for c in CARATTERISTICHE:
        if c not in car:
            errore(dove, f"{etichetta}caratteristiche → manca '{c}'")
            continue
        v = car[c]
        if isinstance(v, bool) or not isinstance(v, int):
            errore(dove, f"{etichetta}caratteristiche → '{c}' deve essere un numero "
                         f"intero senza virgolette, invece e' {v!r}")
        elif not (CAR_MIN <= v <= CAR_MAX):
            errore(dove, f"{etichetta}caratteristiche → '{c}' vale {v}: la scala va "
                         f"da {CAR_MIN} a {CAR_MAX}")
    for extra in set(car) - set(CARATTERISTICHE):
        avviso(dove, f"{etichetta}caratteristiche → '{extra}' non e' fra quelle "
                     f"disegnate nello spider chart: verra' ignorata")
    return True


def controlla_rosa():
    """Ritorna (numeri di maglia, cognomi di staff e tifosi)."""
    d = carica("rosa.json")
    if d is None:
        return {}, set()
    if d.get("_placeholder"):
        segnaposto.append("data/rosa.json — i campi personali dei giocatori sono ancora inventati")
    giocatori = d.get("giocatori")
    if not isinstance(giocatori, list) or not giocatori:
        errore("rosa.json", "manca la lista 'giocatori' oppure e' vuota")
        return {}, set()

    visti, vuoti = {}, 0
    con_car, senza_car = [], []
    for i, g in enumerate(giocatori, 1):
        et = f"giocatore #{i} ({g.get('cognome', '?')}) → "
        obbligatori("rosa.json", g, ["numero", "nome", "cognome", "ruolo"], et)
        interi("rosa.json", g, ["numero"], et)
        n = g.get("numero")
        if isinstance(n, int):
            if not (1 <= n <= 99):
                errore("rosa.json", f"{et}numero di maglia fuori scala: {n}")
            if n in visti:
                errore("rosa.json", f"{et}numero {n} gia' usato da {visti[n]}")
            else:
                visti[n] = g.get("cognome", "?")
        # 'piede' e' testo libero di proposito: ci va la risposta divertente,
        # non per forza destro/sinistro. Nessun controllo sul contenuto.
        if g.get("classe") not in (None, "") and not (1940 <= int(g.get("classe", 0) or 0) <= 2020):
            errore("rosa.json", f"{et}classe '{g.get('classe')}': mi aspettavo un anno di nascita")
        vuoti += sum(1 for c in CAMPI_PERSONALI if not g.get(c))
        if controlla_caratteristiche("rosa.json", g, et):
            con_car.append(g)
        else:
            senza_car.append(f"#{n}" if isinstance(n, int) else g.get("cognome", "?"))

    # --- staff (allenatore, presidente, social media manager…) e tifosi ---
    # Due liste distinte in rosa.json, stesse regole: niente numero di maglia e
    # locandina agganciata al cognome. Il cognome dev'essere unico fra TUTTI e
    # due i gruppi, non solo dentro il proprio: la chiave della locandina non
    # sa da quale lista arrivi, e due omonimi si scambierebbero la foto.
    cognomi_senza_numero: set[str] = set()

    def controlla_gruppo(chiave_lista, etichetta, sigle):
        gente = d.get(chiave_lista) or []
        if not isinstance(gente, list):
            errore("rosa.json", f"'{chiave_lista}' deve essere una lista")
            return [], 0
        mancanti = 0
        for i, p in enumerate(gente, 1):
            et = f"{etichetta} #{i} ({p.get('cognome', '?')}) → "
            obbligatori("rosa.json", p, ["codice", "nome", "cognome", "ruolo"], et)
            if p.get("codice") and p["codice"] not in sigle:
                errore("rosa.json", f"{et}sigla '{p['codice']}' non riconosciuta "
                                    f"(ammesse: {', '.join(sorted(sigle))})")
            if p.get("cognome"):
                chiave = p["cognome"].strip().lower()
                if chiave in cognomi_senza_numero:
                    errore("rosa.json", f"{et}cognome gia' usato da un altro fra staff e "
                                        f"tifosi: la locandina si collega col cognome, "
                                        f"quindi devono essere distinti")
                cognomi_senza_numero.add(chiave)
            mancanti += sum(1 for c in CAMPI_PERSONALI if not p.get(c))
        return gente, mancanti

    staff, mancanti_staff_campi = controlla_gruppo("staff", "staff", SIGLE_STAFF)
    tifosi, mancanti_tifosi_campi = controlla_gruppo("tifosi", "tifoso", SIGLE_TIFOSI)
    vuoti += mancanti_staff_campi + mancanti_tifosi_campi

    print(f"{GRIGIO}  ·{FINE} rosa: {len(giocatori)} giocatori + {len(staff)} staff"
          f"{f' + {len(tifosi)} tifosi' if tifosi else ''}, numeri {sorted(visti)}")
    if vuoti:
        print(f"{GRIGIO}  ·{FINE} campi personali ancora da compilare: {vuoti}")
    if senza_car:
        avviso("rosa.json", "senza le caratteristiche dello spider chart (nella scheda "
               "non comparira'): " + ", ".join(senza_car)
               + " — compilale dal pannello locale, scheda \"Caratteristiche\"")
    pelati = sorted(g.get("caratteristiche", {}).get("lunghezza_capelli", CAR_MAX)
                    for g in con_car
                    if g.get("caratteristiche", {}).get("lunghezza_capelli", CAR_MAX) <= PELATO_MAX)
    print(f"{GRIGIO}  ·{FINE} caratteristiche: {len(con_car)} giocatori su {len(giocatori)}, "
          f"di cui {len(pelati)} nel filtro \"Pelati\" (capelli a {PELATO_MAX})")
    return visti, cognomi_senza_numero


# ----------------------------------------------------------- statistiche ---
CAMPI_STAT = ["gol", "ammonizioni", "espulsioni", "mvp"]


def controlla_statistiche(numeri_rosa):
    d = carica("statistiche.json")
    if d is None:
        return
    if d.get("_placeholder"):
        segnaposto.append("data/statistiche.json — statistiche ancora inventate")
    righe = d.get("giocatori")
    if not isinstance(righe, list):
        errore("statistiche.json", "manca la lista 'giocatori'")
        return

    visti = set()
    for r in righe:
        n = r.get("numero")
        et = f"riga #{n} → "
        obbligatori("statistiche.json", r, ["numero"], et)
        interi("statistiche.json", r, ["numero"] + CAMPI_STAT, et)
        if n in visti:
            errore("statistiche.json", f"{et}numero {n} ripetuto due volte")
        visti.add(n)
        if numeri_rosa and n not in numeri_rosa:
            errore("statistiche.json", f"{et}il numero {n} non esiste in rosa.json")
        for c in CAMPI_STAT:
            if isinstance(r.get(c), int) and r[c] < 0:
                errore("statistiche.json", f"{et}'{c}' non puo' essere negativo ({r[c]})")
    mancanti = sorted(set(numeri_rosa) - visti)
    if mancanti:
        avviso("statistiche.json", "giocatori senza riga statistiche: "
               + ", ".join(f"#{n}" for n in mancanti))
    print(f"{GRIGIO}  ·{FINE} statistiche: {len(righe)} righe")


# ---------------------------------------------------------------- tornei ---
def controlla_tornei():
    d = carica("tornei.json")
    if d is None:
        return
    if d.get("_placeholder"):
        segnaposto.append("data/tornei.json — classifica e calendario ancora inventati")
    tornei = d.get("tornei")
    if not isinstance(tornei, list) or not tornei:
        errore("tornei.json", "manca la lista 'tornei' oppure e' vuota")
        return
    ids = [t.get("id") for t in tornei]
    if d.get("corrente") not in ids:
        errore("tornei.json", f"'corrente' vale {d.get('corrente')!r} ma non esiste un torneo con quell'id "
                              f"(ci sono: {', '.join(map(str, ids))})")

    for t in tornei:
        nome = t.get("nome", t.get("id", "?"))
        dove = f"tornei.json [{nome}]"
        obbligatori(dove, t, ["id", "nome", "stagione", "stato", "nostra_squadra"])
        if t.get("stato") not in ("in_corso", "concluso", "in_programma"):
            avviso(dove, f"stato '{t.get('stato')}': mi aspettavo in_corso/concluso/in_programma")
        noi = t.get("nostra_squadra")

        # --- classifica ---
        classifica = t.get("classifica") or []
        squadre = set()
        for r in classifica:
            et = f"{r.get('squadra', '?')} → "
            obbligatori(dove, r, ["pos", "squadra", "punti", "g", "v", "n", "p", "gf", "gs", "dr"], et)
            interi(dove, r, ["pos", "punti", "g", "v", "n", "p", "gf", "gs", "dr"], et)
            squadre.add(r.get("squadra"))
            try:
                if r["punti"] != 3 * r["v"] + r["n"]:
                    errore(dove, f"{et}punti {r['punti']} ma 3*V+N fa {3 * r['v'] + r['n']}")
                if r["g"] != r["v"] + r["n"] + r["p"]:
                    errore(dove, f"{et}giocate {r['g']} ma V+N+P fa {r['v'] + r['n'] + r['p']}")
                if r["dr"] != r["gf"] - r["gs"]:
                    errore(dove, f"{et}differenza reti {r['dr']} ma GF-GS fa {r['gf'] - r['gs']}")
            except (KeyError, TypeError):
                pass
        if classifica and noi not in squadre:
            errore(dove, f"la nostra squadra ('{noi}') non compare in classifica")
        if classifica:
            gf = sum(r.get("gf", 0) for r in classifica)
            gs = sum(r.get("gs", 0) for r in classifica)
            if gf != gs:
                avviso(dove, f"somma gol fatti ({gf}) diversa dalla somma gol subiti ({gs}): "
                             f"normale a meta' torneo se la classifica non e' completa, altrimenti c'e' un errore")

        # --- calendario ---
        calendario = t.get("calendario") or []
        id_partite = set()
        bilancio = {"v": 0, "n": 0, "p": 0, "gf": 0, "gs": 0}
        for m in calendario:
            et = f"partita {m.get('id', '?')} → "
            stato = m.get("stato")
            # 'da_definire': l'avversario e la giornata si sanno, il giorno no.
            # E' l'unico caso in cui data e ora possono restare vuote.
            da_definire = stato == "da_definire"
            campi = ["id", "casa", "ospite", "stato", "campo"]
            if not da_definire:
                campi += ["data", "ora"]
            obbligatori(dove, m, campi, et)
            if m.get("id") in id_partite:
                errore(dove, f"{et}id partita ripetuto")
            id_partite.add(m.get("id"))
            for campo, patt, forma in (("data", r"^\d{4}-\d{2}-\d{2}$", "AAAA-MM-GG"),
                                       ("ora", r"^\d{2}:\d{2}$", "HH:MM")):
                valore = str(m.get(campo) or "")
                if not valore and da_definire:
                    continue        # ancora da fissare: e' giusto che sia vuota
                if not re.match(patt, valore):
                    errore(dove, f"{et}{campo} '{m.get(campo)}' non in formato {forma}")
            if m.get("casa") == m.get("ospite"):
                errore(dove, f"{et}la squadra gioca contro se stessa")
            if squadre:
                for lato in ("casa", "ospite"):
                    if m.get(lato) not in squadre:
                        avviso(dove, f"{et}'{m.get(lato)}' non e' in classifica: controlla come l'hai scritto")
            if stato not in ("giocata", "da_giocare", "da_definire", "rinviata"):
                errore(dove, f"{et}stato '{stato}': ammessi giocata/da_giocare/da_definire/rinviata")
            if da_definire and (m.get("data") or m.get("ora")):
                avviso(dove, f"{et}e' 'da_definire' ma ha gia' data od ora: se il giorno e' "
                             f"deciso mettila come 'da_giocare', altrimenti non entra nel countdown")
            if stato == "giocata":
                gc, go = m.get("gol_casa"), m.get("gol_ospite")
                if not isinstance(gc, int) or not isinstance(go, int):
                    errore(dove, f"{et}risultata giocata ma il punteggio non e' compilato "
                                 f"(gol_casa={gc!r}, gol_ospite={go!r})")
                elif noi in (m.get("casa"), m.get("ospite")):
                    mio, suo = (gc, go) if m.get("casa") == noi else (go, gc)
                    bilancio["gf"] += mio
                    bilancio["gs"] += suo
                    bilancio["v" if mio > suo else "n" if mio == suo else "p"] += 1
            elif m.get("gol_casa") is not None or m.get("gol_ospite") is not None:
                avviso(dove, f"{et}non e' 'giocata' ma ha gia' un punteggio")

        # --- il calendario deve raccontare la stessa storia della classifica ---
        nostra = next((r for r in classifica if r.get("squadra") == noi), None)
        if nostra and calendario:
            atteso = {k: nostra.get(k) for k in ("v", "n", "p", "gf", "gs")}
            if atteso != bilancio:
                errore(dove, "la nostra riga in classifica non torna con i risultati del calendario: "
                             f"classifica dice V{atteso['v']} N{atteso['n']} P{atteso['p']} "
                             f"GF{atteso['gf']} GS{atteso['gs']}, "
                             f"il calendario dice V{bilancio['v']} N{bilancio['n']} P{bilancio['p']} "
                             f"GF{bilancio['gf']} GS{bilancio['gs']}")
        print(f"{GRIGIO}  ·{FINE} torneo '{nome}': {len(classifica)} squadre, {len(calendario)} partite")


# ------------------------------------------------------------- locandine ---
def controlla_locandine(numeri_rosa, cognomi_senza_numero=frozenset()):
    d = carica("locandine.json")
    if d is None:
        avviso("locandine.json", "non c'e': lancia sync.command per generarlo")
        return
    voci = d.get("locandine")
    if not isinstance(voci, list):
        errore("locandine.json", "manca la lista 'locandine'")
        return
    if not voci:
        avviso("locandine.json", "nessuna locandina: la pagina Convocati sara' vuota")

    ordini, ids = [], set()
    for v in voci:
        et = f"'{v.get('id', '?')}' → "
        obbligatori("locandine.json", v, ["id", "file", "web", "thumb", "w", "h", "data", "ordine"], et)
        interi("locandine.json", v, ["w", "h", "web_w", "web_h", "thumb_w", "thumb_h", "ordine"], et)
        if v.get("id") in ids:
            errore("locandine.json", f"{et}id ripetuto")
        ids.add(v.get("id"))
        immagine_esiste("locandine.json", v.get("file"), et)   # originale
        immagine_esiste("locandine.json", v.get("web"), et)    # versione a schermo intero
        immagine_esiste("locandine.json", v.get("thumb"), et)  # miniatura della griglia
        if v.get("valida") is not False and v.get("numero") is None and not v.get("sigla"):
            errore("locandine.json", f"{et}non ha ne' numero di maglia ne' sigla staff: "
                                     f"rilancia sync.command")
        # sync_locandine.py timbra "data" con anche l'ora (AAAA-MM-GGTHH:MM:SS)
        # quando due locandine escono lo stesso giorno, per poterle ordinare:
        # va accettato anche quel formato, non solo la data secca.
        if not re.match(r"^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?$", str(v.get("data", ""))):
            errore("locandine.json", f"{et}data '{v.get('data')}' non in formato AAAA-MM-GG")
        # Il flag deve essere true o false NUDI. "false" fra virgolette e' la
        # svista tipica di chi modifica il JSON a mano, ed e' la piu' insidiosa:
        # farebbe uscire in anticipo una card che credevi spenta.
        pub = v.get("pubblicato")
        if pub is not None and not isinstance(pub, bool):
            errore("locandine.json", f"{et}'pubblicato' deve essere true o false senza "
                                     f"virgolette, invece e' {pub!r}")
        ordini.append(v.get("ordine"))
        n, sigla = v.get("numero"), v.get("sigla")
        if v.get("valida") is False:
            avviso("locandine.json", f"{et}file fuori convenzione COGNOME_NUMERO.ext "
                                     f"(o COGNOME_SIGLA.ext per lo staff): "
                                     f"rinominalo e rilancia sync.command")
        elif sigla:
            # locandina di staff o di un tifoso: si collega col cognome, non col numero
            if cognomi_senza_numero and str(v.get("cognome", "")).strip().lower() not in cognomi_senza_numero:
                errore("locandine.json", f"{et}'{v.get('cognome')}' non e' fra lo staff "
                                         f"e i tifosi di rosa.json")
        elif numeri_rosa and n not in numeri_rosa:
            errore("locandine.json", f"{et}numero di maglia {n} non presente in rosa.json")
    if ordini and sorted(ordini) != list(range(1, len(ordini) + 1)):
        avviso("locandine.json", "il campo 'ordine' non e' una sequenza 1..N: rilancia sync.command")

    # "Presentato" = locandina ACCESA. Una card importata ma con
    # "pubblicato": false esiste su disco e non si vede da nessuna parte.
    online = [v for v in voci if v.get("pubblicato") is not False]
    spente = [v for v in voci if v.get("pubblicato") is False]
    coperti = {v.get("numero") for v in online if v.get("numero") is not None}
    coperti_staff = {str(v.get("cognome", "")).strip().lower() for v in online if v.get("sigla")}
    mancanti = sorted(n for n in numeri_rosa if n not in coperti)
    mancanti_staff = sorted(c for c in cognomi_senza_numero if c not in coperti_staff)
    totale = len(numeri_rosa) + len(cognomi_senza_numero)
    presentati = totale - len(mancanti) - len(mancanti_staff)
    print(f"{GRIGIO}  ·{FINE} locandine: {len(online)} pubblicate, {len(spente)} pronte ma spente — "
          f"presentati {presentati} su {totale}")
    if spente:
        print(f"{GRIGIO}  ·{FINE} in attesa (\"pubblicato\": false): "
              + ", ".join(str(v.get("id")) for v in spente))
    if mancanti:
        print(f"{GRIGIO}  ·{FINE} giocatori non ancora presentati: "
              + ", ".join(f"#{n}" for n in mancanti))
    if mancanti_staff:
        print(f"{GRIGIO}  ·{FINE} staff e tifosi non ancora presentati: "
              + ", ".join(c.title() for c in mancanti_staff))


# ---------------------------------------------------------------- storia ---
def controlla_storia():
    d = carica("storia.json")
    if d is None:
        return
    obbligatori("storia.json", d, ["titolo", "paragrafi"])
    par = d.get("paragrafi") or []
    if not isinstance(par, list) or not par:
        errore("storia.json", "'paragrafi' deve essere una lista non vuota")
        return
    parole = sum(len(p.split()) for p in par)

    # La targa dei fondatori (l'easter egg nel footer). Non ha nomi dentro:
    # li legge da rosa.json. Qui si controlla solo che il testo ci sia.
    t = d.get("targa")
    if isinstance(t, dict) and t.get("attivo") is not False:
        obbligatori("storia.json", t, ["titolo"], "targa → ")
        if t.get("solo_presentati") not in (True, False, None):
            errore("storia.json", "targa → 'solo_presentati' deve essere true o false")

    if d.get("_da_rivedere"):
        segnaposto.append("data/storia.json — testo di bozza, da riscrivere "
                          "(poi metti \"_da_rivedere\": false)")
    print(f"{GRIGIO}  ·{FINE} storia: {len(par)} paragrafi, {parole} parole")


# --------------------------------------------------------------- sponsor ---
LIVELLI_SPONSOR = {"main", "partner", "tecnico"}
SFONDI_SPONSOR = {"scuro", "chiaro"}


def controlla_sponsor():
    """
    data/sponsor.json. Il campo che sbaglia piu' spesso e' 'sfondo': dice su che
    colore appoggiare il logo (scuro per i loghi chiari, chiaro per quelli neri).
    Se e' sbagliato il logo non e' rotto, semplicemente non si vede — ed e' il
    tipo di errore che si scopre solo guardando il sito col tema giusto.
    """
    d = carica("sponsor.json")
    if d is None:
        return
    lista = d.get("sponsor")
    if not isinstance(lista, list):
        errore("sponsor.json", "manca la lista 'sponsor'")
        return

    visti = set()
    attivi = 0
    for i, s in enumerate(lista):
        dove = f"sponsor #{i + 1}"
        nome = s.get("nome") or dove
        obbligatori("sponsor.json", s, ["id", "nome", "logo", "livello"], f"{nome} → ")

        ident = s.get("id")
        if ident in visti:
            errore("sponsor.json", f"l'id '{ident}' e' usato due volte")
        visti.add(ident)

        liv = s.get("livello")
        if liv and liv not in LIVELLI_SPONSOR:
            errore("sponsor.json", f"{nome}: livello '{liv}' sconosciuto "
                                   f"(ammessi: {', '.join(sorted(LIVELLI_SPONSOR))})")

        sf = s.get("sfondo")
        if sf is None:
            avviso("sponsor.json", f"{nome}: manca 'sfondo', il sito usera' 'scuro'. "
                                   f"Se il logo e' nero, mettilo su 'chiaro' o non si vedra'.")
        elif sf not in SFONDI_SPONSOR:
            errore("sponsor.json", f"{nome}: sfondo '{sf}' sconosciuto (scuro o chiaro)")

        immagine_esiste("sponsor.json", s.get("logo"), f"{nome} → ")

        sito = s.get("sito") or ""
        if sito and not sito.startswith(("http://", "https://")):
            errore("sponsor.json", f"{nome}: 'sito' deve iniziare con https:// (adesso e' {sito!r})")
        ig = s.get("instagram") or ""
        if ig.startswith("@"):
            avviso("sponsor.json", f"{nome}: l'handle Instagram va scritto senza '@' ({ig!r})")

        if s.get("attivo") is not False:
            attivi += 1

    if d.get("_placeholder"):
        segnaposto.append("data/sponsor.json — le descrizioni degli sponsor le ha scritte "
                          "Claude: falle confermare agli interessati o svuotale, poi togli "
                          "\"_placeholder\": true")
    if not attivi:
        avviso("sponsor.json", "nessuno sponsor attivo: le strisce sul sito restano nascoste")
    print(f"{GRIGIO}  ·{FINE} sponsor: {attivi} attivi su {len(lista)}")


# ---------------------------------------------------------------- maglia ---
ZONE_MAGLIA = {"front", "back", "sleeveL", "sleeveR"}
CARTELLA_MAGLIA = "assets/maglia"


def controlla_maglia():
    """
    data/maglia.json: la disposizione dei loghi sulla maglia che si vede su
    maglia.html. Lo scrive il pannello locale (scheda Maglia), ma si puo' anche
    correggere a mano, ed e' li' che si sbaglia: un 'logo' che non sta nella
    lista 'loghi', o un file PNG che non c'e'. In quel caso il logo non e'
    rotto, semplicemente sparisce dalla maglia senza dire niente.
    """
    d = carica("maglia.json")
    if d is None:
        return

    loghi = d.get("loghi")
    if not isinstance(loghi, list) or not loghi:
        errore("maglia.json", "manca la lista 'loghi' (id, nome e file di ogni logo stampabile)")
        loghi = []

    noti = set()
    for i, l in enumerate(loghi):
        dove = l.get("id") or f"logo #{i + 1}"
        obbligatori("maglia.json", l, ["id", "file"], f"{dove} → ")
        if l.get("id") in noti:
            errore("maglia.json", f"l'id '{l.get('id')}' e' usato due volte nella lista 'loghi'")
        noti.add(l.get("id"))
        # I 'file' sono relativi alla cartella del simulatore, non alla radice.
        if l.get("file"):
            immagine_esiste("maglia.json", f"{CARTELLA_MAGLIA}/{l['file']}", f"{dove} → ")

    elementi = d.get("elementi")
    if not isinstance(elementi, list):
        errore("maglia.json", "manca la lista 'elementi'")
        return

    for i, e in enumerate(elementi):
        dove = f"elemento #{i + 1}"
        obbligatori("maglia.json", e, ["logo", "zona"], f"{dove} → ")
        if e.get("logo") and e["logo"] not in noti:
            errore("maglia.json", f"{dove}: il logo '{e['logo']}' non e' nella lista 'loghi', "
                                  f"quindi sulla maglia non comparira'")
        z = e.get("zona")
        if z and z not in ZONE_MAGLIA:
            errore("maglia.json", f"{dove}: zona '{z}' sconosciuta "
                                  f"(ammesse: {', '.join(sorted(ZONE_MAGLIA))})")
        larg = e.get("larghezza")
        if larg is not None and (not isinstance(larg, (int, float)) or isinstance(larg, bool) or larg <= 0):
            errore("maglia.json", f"{dove}: 'larghezza' deve essere un numero di centimetri maggiore di zero")

    print(f"{GRIGIO}  ·{FINE} maglia: {len(elementi)} loghi stampati su {len(noti)} disponibili")


# ----------------------------------------------------- file del sito ------
def controlla_file_sito():
    """Le pagine e le immagini fisse che il sito da' per scontate."""
    attesi = [
        "index.html", "rosa.html", "statistiche.html",
        "tornei.html", "storia.html", "contatti.html", "404.html",
        "sponsor.html", "maglia.html", "privacy.html",
        ".nojekyll", "manifest.json", "robots.txt", "sitemap.xml",
        "assets/css/style.css", "assets/js/main.js", "assets/js/sponsor.js",
        # il simulatore 3D della maglia e le sue texture
        "assets/maglia/simulatore.html", "assets/maglia/crest.png",
        "assets/maglia/mj.png",
        # il pannello locale: e' l'unico posto da cui la maglia si modifica
        "admin/index.html", "admin/admin.js",
        # marchio e icone: le genera tools/make_icons.py dallo stemma ufficiale
        "assets/img/logo.png", "assets/img/logo-grande.png", "assets/img/favicon-32.png",
        "assets/img/apple-touch-icon.png", "assets/img/icon-192.png",
        "assets/img/icon-512.png", "assets/img/og-cover.png",
        "assets/img/placeholder-giocatore.svg",
    ]
    for f in attesi:
        if not (ROOT / f).exists():
            errore("file del sito", f"manca '{f}'")

    if not (ROOT / "assets" / "img" / "logo-originale.png").exists():
        segnaposto.append("assets/img/logo-originale.png — manca lo stemma ufficiale: "
                          "salvalo li' e lancia tools/make_icons.py per rigenerare "
                          "logo e icone (adesso sono quelle disegnate a mano)")

    # Le icone dichiarate nel manifest devono esistere davvero.
    try:
        with (ROOT / "manifest.json").open(encoding="utf-8") as fp:
            man = json.load(fp)
        for ic in man.get("icons", []):
            immagine_esiste("manifest.json", ic.get("src"), f"icona {ic.get('sizes')} → ")
    except Exception:
        pass


# ------------------------------------------------- versioni degli asset ---
def controlla_versioni_asset():
    """
    Le pagine devono citare CSS e JS con l'impronta del loro contenuto
    (style.css?v=6446c4fc). Se hai modificato un file ma non hai rilanciato
    versiona_asset.py, chi ha gia' visitato il sito continua a vedere il codice
    vecchio con i dati nuovi: sembra un bug del sito, e non lo e'.
    """
    try:
        from versiona_asset import versiona
    except ImportError:
        return
    da_fare = versiona(dry=True)
    if da_fare:
        avviso("pagine HTML",
               "CSS o JS modificati, ma le pagine puntano ancora alla versione vecchia ("
               + ", ".join(da_fare) + "). Lancia sync.command, oppure "
               "./.venv/bin/python tools/versiona_asset.py")
    else:
        print(f"{GRIGIO}  ·{FINE} versioni di CSS e JS nelle pagine: aggiornate")


def main():
    print(f"\n{'=' * 62}\n  CHECK DATA — Shakhtar Palese\n{'=' * 62}\n")
    controlla_config()
    numeri, cognomi_senza_numero = controlla_rosa()
    controlla_statistiche(numeri)
    controlla_tornei()
    controlla_locandine(numeri, cognomi_senza_numero)
    controlla_storia()
    controlla_sponsor()
    controlla_maglia()
    controlla_file_sito()
    controlla_versioni_asset()

    print(f"\n{'-' * 62}")
    if segnaposto:
        print(f"\n{GIALLO}  DATI SEGNAPOSTO ancora da sostituire ({len(segnaposto)}):{FINE}")
        for s in segnaposto:
            print(f"    · {s}")
    if avvisi:
        print(f"\n{GIALLO}  AVVISI ({len(avvisi)}) — non bloccano la pubblicazione:{FINE}")
        for a in avvisi:
            print(f"    ⚠ {a}")
    if errori:
        print(f"\n{ROSSO}  ERRORI ({len(errori)}) — da sistemare prima di pubblicare:{FINE}")
        for e in errori:
            print(f"    ✗ {e}")
        print(f"\n{ROSSO}  Controllo FALLITO.{FINE}\n")
        return 1
    print(f"\n{VERDE}  Tutto a posto: nessun errore.{FINE}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
