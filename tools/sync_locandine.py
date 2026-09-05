#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
sync_locandine.py — porta le card giocatore da foto_presentazione/ dentro il sito.

Cosa fa, in ordine:
  1. legge la cartella sorgente indicata in tools/config.json;
  2. da ogni nome file ricava COGNOME e NUMERO DI MAGLIA (es. ESPOSITO_29.jpeg);
  3. copia l'immagine in assets/locandine/ con un nome normalizzato e con
     l'estensione del formato VERO (letto dal contenuto, non dall'estensione:
     ESPOSITO_29.jpeg in realta' e' un PNG);
  4. genera due derivate JPEG: la miniatura per la griglia
     (assets/locandine/thumbs/) e la versione "web" per la visualizzazione a
     schermo intero (assets/locandine/web/), che pesa una frazione
     dell'originale. L'originale resta comunque nel repo come archivio;
  5. riscrive data/locandine.json IN MERGE, senza mai toccare i campi che
     compili a mano (pubblicato, data_pubblicazione, giocatore, didascalia);
  6. aggiorna la versione con cui le pagine citano CSS e JS, cosi' chi ha gia'
     visitato il sito non resta col codice vecchio in cache (versiona_asset.py);
  7. propone il commit su git, chiedendo conferma.

Le immagini nuove entrano nel sito SPENTE: nella loro voce di
data/locandine.json trovi "pubblicato": false, e finche' resta false la card
non compare da nessuna parte (rosa, home, statistiche). Puoi quindi caricare
tutte le foto in una volta sola e poi, quando tocca a quella persona, aprire
data/locandine.json, cambiare quel false in true e rilanciare lo script: al
primo lancio con il flag acceso la data di pubblicazione viene timbrata con
data e ora di adesso, cosi' la griglia resta in ordine di uscita e non di
importazione (anche fra due uscite nello stesso giorno).

Si lancia con:   ./.venv/bin/python tools/sync_locandine.py
oppure con doppio click su sync.command dal Finder.

Opzioni:
  --dry-run   fa vedere cosa farebbe, senza scrivere niente
  --no-git    salta del tutto la parte git
"""
from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
import unicodedata
from datetime import datetime, date
from pathlib import Path

from versiona_asset import versiona   # sta nella stessa cartella di questo file

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit(
        "\n  Manca Pillow, che serve per generare le miniature.\n"
        "  Installalo cosi':\n\n      ./.venv/bin/pip install Pillow\n"
    )

ROOT = Path(__file__).resolve().parent.parent
CONFIG = Path(__file__).resolve().parent / "config.json"

# COGNOME_NUMERO.ext, con eventuale data davanti: 2026-09-03_ESPOSITO_29.jpg
# Per lo staff, che non ha un numero di maglia, il numero e' sostituito dalla
# sigla del ruolo: DIFRANCO_ALL.jpg, BUONAMICO_PRS.jpg, IACOBONE_SMM.jpg.
# Il cognome puo' contenere underscore, perche' e' il modo naturale di scrivere
# un cognome doppio col telefono: DE_TULLIO_20.png. E puo' finire con una
# lettera secca, l'iniziale del nome, per distinguere due omonimi:
# DE_TULLIO_C_20.png e DE_TULLIO_I_9.png.
RE_NOME = re.compile(
    r"^(?:(\d{4}-\d{2}-\d{2})[_-])?"
    r"(?P<cognome>[A-Za-zÀ-ÿ'’\-_ ]+)[_-]"
    r"(?P<codice>\d{1,2}|[A-Za-z]{2,4})$"
)

# Sigle ammesse per lo staff. Se ne aggiungi una qui, il file COGNOME_SIGLA.ext
# viene riconosciuto e collegato allo staff in data/rosa.json.
SIGLE_STAFF = {"ALL", "PRS", "SMM", "DS", "PREP", "MAG"}

# Estensione da usare in uscita, in base al formato VERO letto da Pillow.
EST_PER_FORMATO = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp", "MPO": ".jpg", "GIF": ".gif"}

# Campi che scrivo io a mano nel JSON e che lo script non deve MAI sovrascrivere.
CAMPI_MANUALI = ("data_pubblicazione", "giocatore", "didascalia")

# Anche questo lo decido io a mano, ma ha un default tutto suo: vedi
# flag_pubblicato(). E' l'interruttore che fa comparire la card sul sito.
CAMPO_FLAG = "pubblicato"

VERDE, GIALLO, ROSSO, GRIGIO, FINE = "\033[32m", "\033[33m", "\033[31m", "\033[90m", "\033[0m"


def ok(m):   print(f"{VERDE}  ✓{FINE} {m}")
def info(m): print(f"{GRIGIO}  ·{FINE} {m}")
def warn(m): print(f"{GIALLO}  ⚠ ATTENZIONE:{FINE} {m}")
def err(m):  print(f"{ROSSO}  ✗{FINE} {m}")


def slug(testo: str) -> str:
    """'D'Elìa ' -> 'd-elia'. Niente accenti, niente spazi, niente sorprese nelle URL."""
    t = unicodedata.normalize("NFKD", str(testo))
    t = "".join(c for c in t if not unicodedata.combining(c))
    t = re.sub(r"[^A-Za-z0-9]+", "-", t).strip("-").lower()
    return t or "senza-nome"


def carica_config() -> dict:
    if not CONFIG.exists():
        sys.exit(f"Manca il file di configurazione {CONFIG}")
    with CONFIG.open(encoding="utf-8") as f:
        return json.load(f)


def leggi_json(percorso: Path, default):
    if not percorso.exists():
        return default
    try:
        with percorso.open(encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        warn(f"{percorso.relative_to(ROOT)} non e' un JSON valido ({e}). Riparto da zero per quel file.")
        return default


def analizza_nome(stem: str):
    """
    Ritorna (cognome, numero, sigla_staff, data_dal_nome).
    Per un giocatore: numero valorizzato e sigla None. Per lo staff: il contrario.
    Fuori convenzione: tutto None.
    """
    m = RE_NOME.match(stem.strip())
    if not m:
        return None, None, None, None
    data_nome = m.group(1)
    parti = m.group("cognome").replace("_", " ").split()
    if len(parti) > 1 and len(parti[-1]) == 1:
        # La lettera singola prima del numero e' l'iniziale del nome, messa li'
        # solo per distinguere gli omonimi (i tre De Tullio): non fa parte del
        # cognome, e nel cognome non ci deve finire.
        parti.pop()
    cognome = " ".join(parti).title()
    codice = m.group("codice")
    if codice.isdigit():
        return cognome, int(codice), None, data_nome
    sigla = codice.upper()
    if sigla not in SIGLE_STAFF:
        return None, None, None, None      # lettere sì, ma non una sigla che conosco
    return cognome, None, sigla, data_nome


def flag_pubblicato(vecchia: dict) -> bool:
    """
    L'interruttore "questa card si vede sul sito", letto da data/locandine.json.

    Vale quello che c'e' scritto li' dentro. Se non c'e' scritto niente:
      · voce GIA' PRESENTE nel JSON (scritta prima che il flag esistesse) -> True,
        altrimenti al primo lancio sparirebbero dal sito le locandine gia' online;
      · voce NUOVA -> False: le immagini appena importate restano spente, e le
        accendi tu una alla volta mettendo "pubblicato": true.

    Accetto anche true/false scritti fra virgolette: e' l'errore piu' facile da
    fare a mano in un JSON, e farlo passare in silenzio come "spento" sarebbe
    il modo peggiore di scoprirlo (la card semplicemente non esce).
    """
    v = vecchia.get(CAMPO_FLAG)
    if isinstance(v, bool):
        return v
    if isinstance(v, str):
        return v.strip().lower() in ("true", "si", "si'", "s", "1", "yes")
    return bool(vecchia)      # dizionario vuoto = voce nuova = spenta


def formato_reale(percorso: Path):
    """Il formato letto dal CONTENUTO. L'estensione del file puo' mentire, e mente."""
    try:
        with Image.open(percorso) as im:
            return im.format, im.size
    except Exception as e:
        return None, str(e)


def firma(percorso: Path) -> dict:
    """Impronta della sorgente: se non cambia, il file e' gia' stato lavorato."""
    st = percorso.stat()
    return {"nome": percorso.name, "dimensione": st.st_size, "mtime": int(st.st_mtime)}


def crea_jpeg(sorgente: Path, destinazione: Path, lato_max: int, qualita: int):
    """
    Ridimensiona (senza mai ingrandire) e salva in JPEG. La uso per due cose:
      · le MINIATURE della griglia (600px, qualita' 80);
      · la versione WEB mostrata a schermo intero (1400px, qualita' 88),
        che pesa una frazione dell'originale ma a occhio e' identica.
    L'originale resta comunque copiato intatto in assets/locandine/.
    """
    with Image.open(sorgente) as im:
        im = ImageOps.exif_transpose(im)          # raddrizza le foto scattate col telefono
        im.thumbnail((lato_max, lato_max), Image.LANCZOS)
        if im.mode in ("RGBA", "LA", "P"):        # il JPEG non ha trasparenza: fondo scuro
            sfondo = Image.new("RGB", im.size, (20, 20, 24))
            im = im.convert("RGBA")
            sfondo.paste(im, mask=im.split()[-1])
            im = sfondo
        else:
            im = im.convert("RGB")
        destinazione.parent.mkdir(parents=True, exist_ok=True)
        im.save(destinazione, "JPEG", quality=qualita, optimize=True, progressive=True)
        return im.size


def data_file(percorso: Path) -> str:
    return date.fromtimestamp(percorso.stat().st_mtime).isoformat()


def main(argv):
    dry = "--dry-run" in argv
    senza_git = "--no-git" in argv

    cfg = carica_config()
    sorgente = ROOT / cfg["sorgente"]
    dest = ROOT / cfg["destinazione"]
    thumbs = ROOT / cfg["miniature"]
    web = ROOT / cfg["versione_web"]
    est_ammesse = {e.lower() for e in cfg["estensioni"]}
    json_loc = ROOT / cfg["json_locandine"]

    print(f"\n{'=' * 62}\n  SYNC LOCANDINE — Shakhtar Palese\n{'=' * 62}")
    if dry:
        print(f"{GIALLO}  MODALITA' DRY-RUN: non scrivo niente su disco.{FINE}")
    info(f"sorgente:     {sorgente}")
    info(f"destinazione: {dest.relative_to(ROOT)}")

    if not sorgente.is_dir():
        sys.exit(f"\n  La cartella sorgente non esiste: {sorgente}\n"
                 f"  Controlla il campo \"sorgente\" in tools/config.json.\n")

    # --- 1. le voci gia' presenti nel JSON: da qui recupero i campi manuali ---
    vecchio = leggi_json(json_loc, {"locandine": []})
    per_id = {v.get("id"): v for v in vecchio.get("locandine", []) if v.get("id")}

    # --- 2. scorro i file della cartella sorgente -----------------------------
    file_sorgente = sorted(p for p in sorgente.iterdir()
                           if p.is_file() and not p.name.startswith("."))
    voci, nuovi, aggiornati, invariati, problemi = [], 0, 0, 0, 0
    id_visti, timbrate = set(), []

    # Parametri con cui vengono generate le derivate: se li cambi in
    # tools/config.json, le immagini gia' lavorate vanno rifatte. Salvandoli
    # accanto a ogni voce me ne accorgo da solo, senza dover cancellare a mano.
    parametri = {k: cfg[k] for k in
                 ("thumb_lato_max", "thumb_qualita", "web_lato_max", "web_qualita")}

    print(f"\n  Trovati {len(file_sorgente)} file nella cartella sorgente.\n")

    for f in file_sorgente:
        if f.suffix.lower() not in est_ammesse:
            warn(f"{f.name}: estensione non gestita, lo salto "
                 f"(ammesse: {', '.join(sorted(est_ammesse))}).")
            problemi += 1
            continue

        fmt, size = formato_reale(f)
        if fmt is None:
            err(f"{f.name}: non riesco ad aprirlo come immagine ({size}). Lo salto.")
            problemi += 1
            continue
        if f.suffix.lower() not in (EST_PER_FORMATO.get(fmt, ""), ".jpeg" if fmt == "JPEG" else None):
            info(f"{f.name}: e' in realta' un {fmt}. Uso il formato vero, non l'estensione.")

        cognome, numero, sigla, data_nome = analizza_nome(f.stem)
        valida = cognome is not None
        if not valida:
            warn(f"{f.name}: nome fuori convenzione COGNOME_NUMERO.ext "
                 f"(o COGNOME_SIGLA.ext per lo staff: {', '.join(sorted(SIGLE_STAFF))}). "
                 f"Lo pubblico lo stesso, ma finisce in fondo e non e' collegato a nessuno.")
            problemi += 1

        # id stabile: e' la chiave con cui ritrovo i campi scritti a mano
        ident = f"{slug(cognome)}-{numero if numero is not None else sigla.lower()}" \
            if valida else slug(f.stem)
        if ident in id_visti:
            warn(f"{f.name}: un altro file genera lo stesso identificativo '{ident}'. "
                 f"Rinominane uno, altrimenti si sovrascrivono.")
            problemi += 1
            continue
        id_visti.add(ident)

        est_out = EST_PER_FORMATO.get(fmt, ".jpg")
        file_out = dest / f"{ident}{est_out}"       # originale intatto (archivio)
        thumb_out = thumbs / f"{ident}.jpg"         # griglia
        web_out = web / f"{ident}.jpg"              # schermo intero: leggera ma bella

        vecchia = per_id.get(ident, {})
        firma_ora = firma(f)
        gia_fatto = (
            vecchia.get("_sorgente") == firma_ora
            and vecchia.get("_parametri") == parametri   # cambi la qualita' nel config -> rifa'
            and file_out.exists() and thumb_out.exists() and web_out.exists()
            and vecchia.get("thumb_w") and vecchia.get("thumb_h")
            and vecchia.get("web_w") and vecchia.get("web_h")
        )

        if gia_fatto:
            # Idempotenza: sorgente immutata e output al suo posto -> non ricomprimo niente.
            invariati += 1
            thumb_size = (vecchia["thumb_w"], vecchia["thumb_h"])
            web_size = (vecchia["web_w"], vecchia["web_h"])
            info(f"{f.name}: gia' sincronizzato, non lo ritocco.")
        else:
            era_presente = ident in per_id
            if dry:
                thumb_size = web_size = (0, 0)
                ok(f"{f.name} -> {file_out.relative_to(ROOT)} (+ versione web + miniatura)  [dry-run]")
            else:
                dest.mkdir(parents=True, exist_ok=True)
                shutil.copy2(f, file_out)             # copia, nessuna ricompressione dell'originale
                thumb_size = crea_jpeg(f, thumb_out, cfg["thumb_lato_max"], cfg["thumb_qualita"])
                web_size = crea_jpeg(f, web_out, cfg["web_lato_max"], cfg["web_qualita"])
                risparmio = 100 - round(web_out.stat().st_size * 100 / f.stat().st_size)
                ok(f"{f.name} -> {file_out.relative_to(ROOT)}  "
                   f"({size[0]}x{size[1]}, web {web_size[0]}x{web_size[1]} "
                   f"-{risparmio}% di peso, miniatura {thumb_size[0]}x{thumb_size[1]})")
            if era_presente:
                aggiornati += 1
            else:
                nuovi += 1

        # --- 3. flag di pubblicazione, data e ordine cronologico -------------
        # Il flag decide solo se la card si vede sul sito: l'immagine viene
        # comunque copiata e ridotta, cosi' quando lo accendi non c'e' altro da
        # fare che rilanciare lo script.
        pubblicato = flag_pubblicato(vecchia)

        # Priorita' della data: data_pubblicazione (scritta a mano o timbrata da
        # me) > data nel nome file > mtime.
        manuale = (vecchia.get("data_pubblicazione") or "").strip()
        if manuale:
            data, fonte = manuale, "manuale"
        elif pubblicato:
            # Prima volta che vedo questa locandina accesa e senza una data sua:
            # la timbro con adesso (data e ORA), e da qui in poi resta quella.
            # Serve perche' le foto si caricano tutte insieme (stesso mtime) ma
            # escono una alla volta: la griglia e la home devono seguire
            # l'ordine di USCITA, non quello di importazione. L'ora e' quello
            # che permette di distinguere due uscite nello stesso giorno: senza,
            # l'ordinamento andrebbe a pescare l'id come spareggio, che non ha
            # niente a che vedere con l'ordine cronologico reale.
            manuale = datetime.now().isoformat(timespec="seconds")
            data, fonte = manuale, "pubblicazione"
            timbrate.append(f"{ident} -> {manuale}")
        elif data_nome:
            data, fonte = data_nome, "nomefile"
        else:
            data, fonte = data_file(f), "mtime"

        voce = {
            "id": ident,
            # In cima, subito dopo l'id: e' il campo che vai a cercare a occhio
            # dentro il JSON quando devi far uscire qualcuno.
            CAMPO_FLAG: pubblicato,
            "file": f"{cfg['destinazione']}/{file_out.name}",
            "web": f"{cfg['versione_web']}/{web_out.name}",
            "thumb": f"{cfg['miniature']}/{thumb_out.name}",
            "w": size[0], "h": size[1],
            "web_w": web_size[0], "web_h": web_size[1],
            "thumb_w": thumb_size[0], "thumb_h": thumb_size[1],
            "cognome": cognome,
            "numero": numero,          # giocatori: numero di maglia
            "sigla": sigla,            # staff: ALL / PRS / SMM ...
            "data": data,
            "data_fonte": fonte,
            "valida": valida,
            "ordine": 0,                       # riempito dopo l'ordinamento
            "_sorgente": firma_ora,
            "_parametri": parametri,
        }
        # I campi manuali sopravvivono sempre; e sopravvive anche qualunque
        # altra chiave che tu abbia aggiunto a mano al JSON.
        for k in CAMPI_MANUALI:
            voce[k] = vecchia.get(k, "")
        for k, v in vecchia.items():
            if k not in voce and not k.startswith("_"):
                voce[k] = v
        # Questi due li riscrivo dopo il giro qui sopra, altrimenti se li
        # ripescasse dalla voce vecchia perderei la timbratura di oggi e
        # normalizzerei a booleano un "true" scritto fra virgolette.
        voce[CAMPO_FLAG] = pubblicato
        voce["data_pubblicazione"] = manuale

        voci.append(voce)

    # --- 4. ordinamento: piu' recenti in alto, i file rotti in fondo ---------
    # NB: il numero nel nome file e' il numero di MAGLIA, non un progressivo:
    # non entra in nessun modo nell'ordinamento.
    # Le locandine ancora spente stanno tutte sotto quelle pubblicate: sul sito
    # non si vedono comunque, ma cosi' il JSON si legge come una lista d'attesa.
    voci.sort(key=lambda v: (v["valida"], v[CAMPO_FLAG], v["data"], v["id"]), reverse=True)
    for i, v in enumerate(voci, start=1):
        v["ordine"] = i

    # --- 5. voci orfane: la sorgente non c'e' piu' ---------------------------
    orfane = [i for i in per_id if i not in id_visti]
    for i in orfane:
        warn(f"'{i}' era in locandine.json ma il file sorgente non c'e' piu': tolgo la voce. "
             f"I file in {cfg['destinazione']}/ restano, cancellali a mano se non ti servono.")

    # --- 6. scrittura del JSON ----------------------------------------------
    uscita = {
        "_nota": "File generato da tools/sync_locandine.py. Puoi modificare a mano SOLO "
                 "pubblicato, data_pubblicazione, giocatore e didascalia: lo script non li "
                 "sovrascrive. \"pubblicato\": false = la card e' pronta ma non si vede sul "
                 "sito; mettilo a true e rilancia sync.command per farla uscire.",
        "generato_il": datetime.now().isoformat(timespec="seconds"),
        "totale": len(voci),
        "locandine": voci,
    }
    # Se il contenuto non e' cambiato non riscrivo il file: altrimenti il solo
    # timestamp "generato_il" farebbe risultare il JSON modificato a ogni lancio,
    # e git segnalerebbe modifiche che non esistono.
    identico = json.dumps(vecchio.get("locandine", []), sort_keys=True, ensure_ascii=False) == \
               json.dumps(voci, sort_keys=True, ensure_ascii=False)
    if dry:
        print(f"\n{GIALLO}  [dry-run] non scrivo {json_loc.relative_to(ROOT)}{FINE}")
    elif identico and json_loc.exists():
        info(f"{json_loc.relative_to(ROOT)} e' gia' aggiornato, non lo riscrivo.")
    else:
        json_loc.parent.mkdir(parents=True, exist_ok=True)
        with json_loc.open("w", encoding="utf-8") as fp:
            json.dump(uscita, fp, ensure_ascii=False, indent=2)
            fp.write("\n")
        ok(f"scritto {json_loc.relative_to(ROOT)} ({len(voci)} locandine)")

    # --- 7. incrocio con la rosa: chi ha la foto e chi no --------------------
    # Chi e' gia' stato presentato e chi manca ancora all'appello.
    # I giocatori si agganciano col numero di maglia, lo staff col cognome.
    rosa_doc = leggi_json(ROOT / cfg["json_rosa"], {})
    rosa = rosa_doc.get("giocatori", [])
    staff = rosa_doc.get("staff", [])
    # "Presentato" = card accesa. Una foto importata ma con il flag ancora a
    # false non conta: sul sito quella persona non c'e'.
    pubblicate = [v for v in voci if v[CAMPO_FLAG]]
    in_attesa = [v for v in voci if not v[CAMPO_FLAG]]
    numeri_con_foto = {v["numero"] for v in pubblicate if v.get("numero") is not None}
    cognomi_con_foto = {slug(v["cognome"]) for v in pubblicate if v.get("sigla") and v.get("cognome")}

    senza = [g for g in rosa if g.get("numero") not in numeri_con_foto]
    senza_staff = [s for s in staff if slug(s.get("cognome", "")) not in cognomi_con_foto]
    orfani = sorted(numeri_con_foto - {g.get("numero") for g in rosa})
    orfani_staff = sorted(cognomi_con_foto - {slug(s.get("cognome", "")) for s in staff})
    totale = len(rosa) + len(staff)
    presentati = totale - len(senza) - len(senza_staff)

    print(f"\n{'-' * 62}")
    print(f"  Nuove: {nuovi}   aggiornate: {aggiornati}   invariate: {invariati}   "
          f"da sistemare: {problemi}")
    print(f"  Presentati sul sito: {presentati} su {totale}.")
    for t in timbrate:
        ok(f"prima uscita, data di pubblicazione timbrata{' [dry-run]' if dry else ''}: {t}")
    if in_attesa:
        print()
        info(f"Pronte ma spente ({len(in_attesa)}): "
             + ", ".join(v["id"] for v in in_attesa))
        info(f"Per farne uscire una: apri {cfg['json_locandine']}, cerca il suo \"id\" "
             f"e metti \"{CAMPO_FLAG}\": true, poi rilancia questo script.")
        print()
    if senza:
        info("Giocatori ancora da presentare: "
             + ", ".join(f"#{g['numero']} {g['cognome']}" for g in senza))
    if senza_staff:
        info("Staff ancora da presentare: "
             + ", ".join(f"{s['cognome']} ({s.get('codice', '?')})" for s in senza_staff))
    if orfani:
        warn("Numeri di maglia presenti nelle locandine ma non nella rosa: "
             + ", ".join(f"#{n}" for n in orfani) + ". Controlla data/rosa.json.")
    if orfani_staff:
        warn("Locandine staff senza corrispondenza in data/rosa.json: "
             + ", ".join(orfani_staff) + ".")
    print(f"{'-' * 62}")

    # --- 8. versioni di CSS e JS --------------------------------------------
    # Se ho toccato un foglio di stile o uno script, le pagine devono citarlo
    # col nuovo indirizzo (style.css?v=...). Senza questo passaggio chi ha gia'
    # aperto il sito si tiene il codice vecchio per una decina di minuti e vede
    # i dati nuovi disegnati alla maniera vecchia.
    riversionate = versiona(dry=dry)
    for f in riversionate:
        ok(f"versione di CSS/JS aggiornata in {f}{' [dry-run]' if dry else ''}")

    # --- 9. git: proposta, non automatismo ----------------------------------
    if dry or senza_git:
        return 0
    cambiati = nuovi + aggiornati + len(orfane)
    # Attenzione: girare un flag non produce nessuna immagine nuova, ma cambia
    # comunque il JSON. Se guardassi solo i contatori delle immagini, dopo una
    # pubblicazione lo script direbbe "niente da committare" e la card non
    # uscirebbe mai online.
    if cambiati == 0 and identico and not riversionate:
        info("Niente di nuovo da committare.")
        return 0
    if nuovi:
        messaggio = f"chore: sync locandine (+{nuovi})"
    elif timbrate:
        usciti = ", ".join(t.split(" -> ")[0] for t in timbrate)
        messaggio = f"feat: pubblica {usciti}"
    elif cambiati or not identico:
        messaggio = "chore: aggiorna locandine"
    else:
        messaggio = "chore: aggiorna le versioni di CSS e JS"
    proponi_git(messaggio)
    return 0


def git(*args, **kw):
    return subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True, **kw)


def proponi_git(messaggio):
    if not (ROOT / ".git").exists():
        info("Non e' un repository git: salto commit e push.")
        return
    stato = git("status", "--porcelain")
    if stato.returncode != 0:
        warn("git non risponde, salto la parte di commit.")
        return
    if not stato.stdout.strip():
        info("git non vede modifiche da committare.")
        return

    print("\n  File che verrebbero committati:")
    for riga in stato.stdout.strip().splitlines():
        print(f"    {riga}")

    try:
        risposta = input(f"\n  Faccio add + commit \"{messaggio}\" + push su origin? [s/N] ").strip().lower()
    except EOFError:
        info("Nessuna risposta (input non disponibile): salto git.")
        return
    if risposta not in ("s", "si", "sì", "y", "yes"):
        info("Ok, non tocco git. Puoi committare a mano quando vuoi.")
        return

    for cmd in (["add", "-A"], ["commit", "-m", messaggio]):
        r = git(*cmd)
        if r.returncode != 0:
            err(f"git {' '.join(cmd)} fallito:\n{r.stderr.strip()}")
            return
    ok(f"commit creato: {messaggio}")

    r = git("push")
    if r.returncode != 0:
        err(f"push fallito:\n{r.stderr.strip()}\n  Il commit c'e' comunque: riprova con  git push")
    else:
        ok("push su origin completato. Tra un minuto e' online.")


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv[1:]))
    except KeyboardInterrupt:
        print("\n  Interrotto.")
        sys.exit(130)
