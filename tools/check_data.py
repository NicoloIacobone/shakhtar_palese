#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
check_data.py — controlla tutti i JSON del sito PRIMA che lo scopra il pubblico.

Verifica, per ogni file in data/:
  · che sia JSON valido;
  · che ci siano i campi obbligatori e che i numeri siano numeri;
  · che i riferimenti incrociati tornino (statistiche <-> rosa, locandine <-> rosa);
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

ROOT = Path(__file__).resolve().parent.parent
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
def controlla_rosa():
    d = carica("rosa.json")
    if d is None:
        return {}
    if d.get("_placeholder"):
        segnaposto.append("data/rosa.json — la rosa contiene ancora dati inventati")
    giocatori = d.get("giocatori")
    if not isinstance(giocatori, list) or not giocatori:
        errore("rosa.json", "manca la lista 'giocatori' oppure e' vuota")
        return {}

    visti = {}
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
        if g.get("piede") not in (None, "", "destro", "sinistro", "ambidestro"):
            avviso("rosa.json", f"{et}piede '{g['piede']}': mi aspettavo destro/sinistro/ambidestro")
    print(f"{GRIGIO}  ·{FINE} rosa: {len(giocatori)} giocatori, numeri {sorted(visti)}")
    return visti


# ----------------------------------------------------------- statistiche ---
CAMPI_STAT = ["presenze", "minuti", "gol", "assist", "ammonizioni", "espulsioni",
              "mvp", "papere", "gol_sbagliati", "ritardi", "multe_euro"]


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
        if isinstance(r.get("presenze"), int) and isinstance(r.get("minuti"), int):
            if r["presenze"] == 0 and r["minuti"] > 0:
                avviso("statistiche.json", f"{et}0 presenze ma {r['minuti']} minuti giocati")
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
            obbligatori(dove, m, ["id", "data", "ora", "casa", "ospite", "stato", "campo"], et)
            if m.get("id") in id_partite:
                errore(dove, f"{et}id partita ripetuto")
            id_partite.add(m.get("id"))
            if not re.match(r"^\d{4}-\d{2}-\d{2}$", str(m.get("data", ""))):
                errore(dove, f"{et}data '{m.get('data')}' non in formato AAAA-MM-GG")
            if not re.match(r"^\d{2}:\d{2}$", str(m.get("ora", ""))):
                errore(dove, f"{et}ora '{m.get('ora')}' non in formato HH:MM")
            if m.get("casa") == m.get("ospite"):
                errore(dove, f"{et}la squadra gioca contro se stessa")
            if squadre:
                for lato in ("casa", "ospite"):
                    if m.get(lato) not in squadre:
                        avviso(dove, f"{et}'{m.get(lato)}' non e' in classifica: controlla come l'hai scritto")
            stato = m.get("stato")
            if stato not in ("giocata", "da_giocare", "rinviata"):
                errore(dove, f"{et}stato '{stato}': ammessi giocata/da_giocare/rinviata")
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
def controlla_locandine(numeri_rosa):
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
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", str(v.get("data", ""))):
            errore("locandine.json", f"{et}data '{v.get('data')}' non in formato AAAA-MM-GG")
        ordini.append(v.get("ordine"))
        n = v.get("numero")
        if v.get("valida") is False:
            avviso("locandine.json", f"{et}file fuori convenzione COGNOME_NUMERO.ext: "
                                     f"rinominalo e rilancia sync.command")
        elif numeri_rosa and n not in numeri_rosa:
            errore("locandine.json", f"{et}numero di maglia {n} non presente in rosa.json")
    if ordini and sorted(ordini) != list(range(1, len(ordini) + 1)):
        avviso("locandine.json", "il campo 'ordine' non e' una sequenza 1..N: rilancia sync.command")

    coperti = {v.get("numero") for v in voci}
    mancanti = sorted(n for n in numeri_rosa if n not in coperti)
    print(f"{GRIGIO}  ·{FINE} locandine: {len(voci)} pubblicate, "
          f"{len(numeri_rosa) - len(mancanti)}/{len(numeri_rosa)} giocatori con foto")
    if mancanti:
        print(f"{GRIGIO}  ·{FINE} senza foto (useranno il placeholder): "
              + ", ".join(f"#{n}" for n in mancanti))


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
    if d.get("_da_rivedere"):
        segnaposto.append("data/storia.json — testo di bozza, da riscrivere "
                          "(poi metti \"_da_rivedere\": false)")
    print(f"{GRIGIO}  ·{FINE} storia: {len(par)} paragrafi, {parole} parole")


# ----------------------------------------------------- file del sito ------
def controlla_file_sito():
    """Le pagine e le immagini fisse che il sito da' per scontate."""
    attesi = [
        "index.html", "rosa.html", "convocati.html", "statistiche.html",
        "tornei.html", "storia.html", "contatti.html", "404.html",
        ".nojekyll", "manifest.json", "robots.txt", "sitemap.xml",
        "assets/css/style.css", "assets/js/main.js",
        "assets/img/logo.svg", "assets/img/favicon.svg", "assets/img/favicon-32.png",
        "assets/img/apple-touch-icon.png", "assets/img/icon-192.png",
        "assets/img/icon-512.png", "assets/img/og-cover.png",
        "assets/img/placeholder-giocatore.svg",
    ]
    for f in attesi:
        if not (ROOT / f).exists():
            errore("file del sito", f"manca '{f}'")

    # Le icone dichiarate nel manifest devono esistere davvero.
    try:
        with (ROOT / "manifest.json").open(encoding="utf-8") as fp:
            man = json.load(fp)
        for ic in man.get("icons", []):
            immagine_esiste("manifest.json", ic.get("src"), f"icona {ic.get('sizes')} → ")
    except Exception:
        pass


def main():
    print(f"\n{'=' * 62}\n  CHECK DATA — Shakhtar Palese\n{'=' * 62}\n")
    controlla_config()
    numeri = controlla_rosa()
    controlla_statistiche(numeri)
    controlla_tornei()
    controlla_locandine(numeri)
    controlla_storia()
    controlla_file_sito()

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
