#!/bin/bash
# Toglie la sincronizzazione cartelle del Mac -> sito (il token resta nel Portachiavi, voce "portfolio-sync").
LABEL="it.bohememag.portfolio-sync"
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
rm -f "$HOME/Library/LaunchAgents/$LABEL.plist"
rm -rf "$HOME/Library/Application Support/portfolio-sync"
echo "Sincronizzazione tolta."
read -r -p "Premi Invio per chiudere." _
