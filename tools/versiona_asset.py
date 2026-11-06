#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
versiona_asset.py — impedisce che il sito resti indietro nella cache del browser.

Il problema che risolve, in concreto: GitHub Pages serve i file con
"Cache-Control: max-age=600". Se hai aperto il sito dieci minuti fa, dopo un
push il browser continua a usare la copia vecchia di style.css o di tornei.js
SENZA nemmeno chiedere al server se e' cambiata. Il risultato e' la cosa piu'
confondente che ci sia: i dati sono nuovi (data/*.json viene chiesto con
'no-cache', quello e' sempre fresco) ma il codice che li disegna e' vecchio.
Sembra un bug del sito, e non lo e'.

La soluzione standard e' cambiare l'INDIRIZZO del file quando cambia il
contenuto. Questo script riscrive i tag delle pagine HTML cosi':

    <script src="assets/js/tornei.js">
    <script src="assets/js/tornei.js?v=6a9abdc7">

dove 6a9abdc7 e' l'impronta del contenuto del file. Finche' non tocchi il file
l'indirizzo non cambia (e la cache lavora, che e' un bene); appena lo modifichi
l'indirizzo cambia da solo e il browser e' costretto a riscaricarlo.

Non serve lanciarlo a mano: lo fa sync.command a ogni pubblicazione, e
check_data.py avvisa se le versioni sono rimaste indietro.

Si lancia con:   ./.venv/bin/python tools/versiona_asset.py
Opzioni:
  --check     non scrive niente, dice solo cosa sarebbe da aggiornare
              (esce con codice 1 se qualcosa e' da aggiornare)
"""
from __future__ import annotations

import hashlib
import re
import sys
from pathlib import Path

# La radice del sito: tutto cio' che GitHub Pages pubblica sta in docs/.
ROOT = Path(__file__).resolve().parent.parent / "docs"

# Le pagine da riscrivere: quelle nella radice del sito piu' il pannello locale.
PAGINE = sorted(ROOT.glob("*.html")) + sorted((ROOT / "admin").glob("*.html"))

# src="assets/js/x.js" oppure href="../assets/css/style.css", con o senza ?v=.
# Il gruppo 'rel' tiene i ../ del pannello, che sta una cartella piu' in basso.
RIFERIMENTO = re.compile(
    r'(?P<attr>src|href)="(?P<rel>(?:\.\./)*)(?P<file>assets/(?:js|css)/[^"?]+\.(?:js|css))'
    r'(?:\?v=[^"]*)?"'
)


def impronta(percorso: Path) -> str:
    """Otto caratteri dal contenuto del file. Cambia il file, cambia l'impronta."""
    return hashlib.sha1(percorso.read_bytes()).hexdigest()[:8]


def versiona(dry: bool = False) -> list[str]:
    """
    Riscrive le pagine HTML e ritorna la lista delle modifiche fatte (o che
    servirebbero, con dry=True), gia' pronte da stampare.
    """
    cambi: list[str] = []
    cache: dict[str, str] = {}

    for pagina in PAGINE:
        testo = pagina.read_text(encoding="utf-8")

        def sostituisci(m: re.Match) -> str:
            file_rel = m.group("file")
            if file_rel not in cache:
                f = ROOT / file_rel
                cache[file_rel] = impronta(f) if f.exists() else ""
            v = cache[file_rel]
            if not v:
                return m.group(0)      # file citato ma inesistente: lo segnala check_data
            return f'{m.group("attr")}="{m.group("rel")}{file_rel}?v={v}"'

        nuovo = RIFERIMENTO.sub(sostituisci, testo)
        if nuovo == testo:
            continue
        cambi.append(pagina.relative_to(ROOT).as_posix())
        if not dry:
            pagina.write_text(nuovo, encoding="utf-8")
    return cambi


def main(argv) -> int:
    dry = "--check" in argv
    cambi = versiona(dry=dry)
    if not cambi:
        print("  · versioni degli asset gia' aggiornate.")
        return 0
    if dry:
        print("  ⚠ da riversionare: " + ", ".join(cambi))
        return 1
    print("  ✓ aggiornate le versioni in: " + ", ".join(cambi))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
