#!/bin/bash
# Manda subito al sito le foto cambiate nelle cartelle (senza aspettare i 3 minuti).
/usr/bin/python3 "$HOME/Library/Application Support/portfolio-sync/sync_cartelle.py"
echo "Fatto. Registro: ~/Library/Logs/portfolio-sync.log"
read -r -p "Premi Invio per chiudere." _
