#!/bin/bash
# ============================================================================
# sync.command — doppio click da Finder per aggiornare le locandine del sito.
#
# Copia le immagini da foto_presentazione/ dentro il sito, genera le miniature,
# aggiorna data/locandine.json e propone il commit su GitHub.
# Se qualcosa va storto la finestra resta aperta, cosi' puoi leggere l'errore.
# ============================================================================

# Mi sposto nella cartella di questo file, qualunque sia la cartella di partenza
# del Finder. "${BASH_SOURCE[0]}" funziona anche se il percorso ha spazi.
cd "$(dirname "${BASH_SOURCE[0]}")" || exit 1

PYTHON="./.venv/bin/python"

echo
if [ ! -x "$PYTHON" ]; then
  echo "  Non trovo l'interprete Python del progetto: $PYTHON"
  echo
  echo "  Ricrea il virtualenv cosi' (dalla cartella del progetto, nel Terminale):"
  echo "      python3 -m venv .venv"
  echo "      ./.venv/bin/pip install Pillow"
  echo
else
  "$PYTHON" tools/sync_locandine.py "$@"
  ESITO=$?
  echo
  if [ $ESITO -ne 0 ]; then
    echo "  Lo script si e' chiuso con un errore (codice $ESITO)."
  fi
fi

echo
echo "----------------------------------------------------------------"
read -r -p "  Premi INVIO per chiudere questa finestra. " _
