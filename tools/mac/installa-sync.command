#!/bin/bash
# Installa (o aggiorna) la sincronizzazione cartelle del Mac -> sito.
# Doppio clic su questo file. Ti chiede il token GitHub una volta sola e lo salva nel Portachiavi.
# Per toglierla: doppio clic su disinstalla-sync.command.
set -e
cd "$(dirname "$0")"
LABEL="it.bohememag.portfolio-sync"
DIR="$HOME/Library/Application Support/portfolio-sync"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
FOTO="$HOME/porfolio/information_architecture"
LOG="$HOME/Library/Logs/portfolio-sync.log"

echo "== Sincronizzazione foto del portfolio =="
if ! /usr/bin/python3 -c 'import sys' >/dev/null 2>&1; then
  echo "Serve Python 3: macOS ora ti propone di installare gli Strumenti da riga di comando."
  echo "Installali, poi fai di nuovo doppio clic su questo file."
  xcode-select --install 2>/dev/null || true
  read -r -p "Premi Invio per chiudere." _; exit 1
fi
[ -d "$FOTO" ] || echo "Attenzione: non trovo $FOTO (la sincronizzazione partirà quando esiste)."

if security find-generic-password -s portfolio-sync -a github >/dev/null 2>&1; then
  read -r -p "Token GitHub già salvato. Vuoi sostituirlo? (s/N) " R
else
  R=s
fi
if [ "$R" = "s" ] || [ "$R" = "S" ]; then
  echo "Incolla il token GitHub (lo stesso del pannello /admin) e premi Invio."
  echo "Mentre incolli non vedi niente: è normale."
  read -r -s TOKEN; echo
  [ -n "$TOKEN" ] || { echo "Nessun token, annullato."; exit 1; }
  security add-generic-password -U -s portfolio-sync -a github -w "$TOKEN"
  unset TOKEN
fi

mkdir -p "$DIR" "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
cp sync_cartelle.py "$DIR/sync_cartelle.py"
cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array><string>/usr/bin/python3</string><string>$DIR/sync_cartelle.py</string></array>
  <key>StartInterval</key><integer>180</integer>
  <key>WatchPaths</key><array><string>$FOTO</string></array>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict>
</plist>
PL
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"

echo
echo "Prova: ecco cosa manderei adesso al sito (non invio ancora niente)."
/usr/bin/python3 "$DIR/sync_cartelle.py" --dry-run || true
echo
echo "Fatto. Da ora il Mac controlla le cartelle ogni 3 minuti e manda al sito le foto nuove o cambiate."
echo "Registro: $LOG"
read -r -p "Premi Invio per chiudere." _
