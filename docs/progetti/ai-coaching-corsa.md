# Running Coach

- **Anno:** 2026 - in sviluppo
- **Ruolo:** Ideazione, progettazione dell'esperienza, regole di allenamento; sviluppo con Claude Code
- **Ambito:** Sport, strumenti personali
- **Tecnologie:** Python (solo libreria standard), HTML/CSS/JS senza librerie, Intervals.icu, Garmin, Apple Salute, OpenStreetMap, Open-Meteo, Claude
- **Stato:** In uso ogni giorno, in sviluppo
- **Per:** Uso personale, verso una maratona sotto le 4 ore nella primavera 2027
- **Immagine di copertina:** img/coaching/cover.jpg (suggerito: screenshot del calendario o della mappa dei percorsi, senza dati di salute)

## Cosa fa (max 10 parole)

Prepara e corregge il mio piano di corsa, io approvo.

## In breve

Un coach di corsa che legge i miei dati, scrive il piano della settimana e lo manda all'orologio.

## Correre, non programmare

Mi sto preparando per una maratona sotto le quattro ore. Il tempo che passavo a pianificare gli allenamenti era tempo tolto alla corsa. Ho progettato Running Coach con un obiettivo solo: l'app decide, propone e scrive il piano; io approvo con un tocco e vado a correre.

## Come funziona

Ogni mattina legge sonno, recupero e carico degli ultimi giorni, il meteo di Torino e i miei impegni. Se qualcosa non torna propone una modifica motivata con i numeri, e la applica solo se la confermo. Il piano passa a Intervals.icu e da lì all'orologio. Per ogni uscita suggerisce un percorso in piano tra strade nuove della città, con il file GPX pronto.

## Il disegno

Un solo file di pagina, nessuna libreria, grafici disegnati a mano in SVG, stile ispirato al design di Apple. Si apre sul Mac e sull'iPhone come app dalla schermata Home. Le sezioni sono cinque: Oggi, Corsa, Mappa, Alimentazione, Profilo. Il calendario del mese si modifica trascinando gli allenamenti.

## Il mio ruolo

- Ho definito il problema e le regole del coach: quando una seduta dura diventa facile, cosa fare di un allenamento saltato, quando fermarsi.
- Ho progettato le schermate e il flusso "proposta, conferma, orologio".
- Ho guidato lo sviluppo con Claude Code, passo dopo passo, con una roadmap di 20 tappe: 14 fatte.
- Ho scelto cosa non mostrare: chi riceve un link ospite vede le corse, non agenda, salute o tracce GPS.

## Cosa sto imparando

Un buon consiglio è breve. Il lavoro non è aggiungere numeri, è scegliere i tre che servono oggi.
