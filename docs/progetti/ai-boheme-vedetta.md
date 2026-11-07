# Bohème Vedetta

- **Anno:** 2026
- **Ruolo:** Ideazione e progettazione; sviluppo con l'AI (Claude Code)
- **Ambito:** Strumenti per la cultura, automazione
- **Tecnologie:** Python, FastAPI, Docker, Supabase, Claude, GitHub Pages
- **Stato:** Attivo dal 9 ottobre 2026
- **Link:** pannello privato; sito pubblico dei bandi in arrivo su bohememag.it
- **Immagine di copertina:** img/vedetta/cover.jpg (suggerito: screenshot del pannello di revisione, senza dati personali)

## In breve

Il motore che trova, legge e verifica i bandi per artisti, e tiene aggiornato Bohème Magazine.

## Il problema

Per Bohème cercavo bandi a mano, ente per ente. Le fonti erano decine, ognuna con il suo sito, e un bando con la data sbagliata fa perdere la fiducia di chi legge. Serviva uno strumento che facesse la ricerca al posto mio senza rinunciare alla verifica.

## Come funziona

Vedetta ha due agenti. **Scout** ogni lunedì cerca sul web enti che pubblicano bandi e non sono ancora seguiti, e me li propone. Il **Motore dei bandi** ogni tre ore legge le fonti attive, solo le pagine cambiate, controlla doppioni e campi mancanti, e prepara i bandi pronti. Io li rivedo da un pannello web prima che escano.

- **75** fonti seguite, **65** con un contatto
- un giro ogni **3 ore**, con un tetto di **80** letture al giorno
- **122** test automatici

## Il mio ruolo

- Ho definito cosa deve fare, cosa non deve fare e dove serve una persona: niente si pubblica senza revisione.
- Ho progettato il pannello di revisione e il flusso delle fonti candidate.
- Ho guidato lo sviluppo con Claude Code, decisione per decisione, documentando ogni scelta.

## Cosa ho imparato

L'AI scrive il codice in fretta; la parte difficile è decidere le regole. Una pagina con date inventate va scartata, un link che non risponde va riprovato, non cancellato. Sono queste scelte a rendere uno strumento affidabile.
