# Pannello /admin

Indirizzo: **https://bohememag.it/simonecarducci/admin/**

Da qui cambi i testi e le foto del sito senza toccare il codice. Ogni salvataggio va su GitHub
e dopo 2-3 minuti il sito online è aggiornato (lo fa da sola l'Action "Update site").

## 1. Primo accesso (una volta sola)

Il pannello entra nel repository con un **token GitHub**, una specie di password solo per questo sito.

1. Apri [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new).
2. **Token name:** `portfolio admin`. **Expiration:** la durata che preferisci (es. 1 anno).
3. **Repository access:** *Only select repositories* → `simonecarduccii/simonecarducci`.
4. **Permissions → Repository permissions → Contents:** *Read and write*.
5. **Generate token** e copialo (inizia con `github_pat_`). Tienilo per te: chi lo ha può modificare il sito.
6. Apri https://bohememag.it/simonecarducci/admin/, incolla il token ed **Entra**.

Il browser se lo ricorda (pulsante **Esci** per toglierlo). Lo stesso token serve per la sincronizzazione delle cartelle del Mac (punto 3).

## 2. Come è fatto

A sinistra c'è l'albero del sito, come in `information_architecture`:
**Home** (Hero con Bohème e modì, Pellicole, Ricerca visiva con Faccini, Ghei, Papà, Vita mia, Progetti con l'AI, Archivio), **About**, **Archivio**.
Clicca un elemento: al centro trovi insieme le sue **foto** e i suoi **testi**, a destra l'anteprima della pagina online.

- **Copertina**: *Sostituisci*, oppure trascina una foto dal Finder sopra la copertina. Quella di Bohème e di modì è anche lo sfondo dell'hero in home; quella dei progetti fotografici è anche la loro foto nella griglia.
- **Sequenza**: trascina le foto per cambiare l'ordine (o usa ← →), ★ la rende copertina, × la toglie. Per aggiungerne, *+ Aggiungi foto* o trascinale dal Finder sulla griglia.
- **Archivio**: aggiungi o togli foto e scrivi pellicola, luogo e anno sotto ciascuna.
- **Testi**: ogni campo è un pezzo della pagina. `**grassetto**`, `_corsivo_`, `[testo del link](https://...)`; un rigo vuoto separa i paragrafi.
  Le frasi con `[DA VERIFICARE]` restano evidenziate sul sito finché non togli la nota.

**Salva e pubblica** salva foto e testi dell'elemento in un colpo solo. Dopo 1-2 minuti compare *Online ✓* e l'anteprima si aggiorna.
Le foto vengono rimpicciolite nel browser prima di partire e perdono GPS e dati della fotocamera.

## 3. Foto da una cartella del Mac

Ogni elemento con foto ha il campo **Cartella sul Mac**: il percorso dentro
`~/porfolio/information_architecture`, per esempio `01home/03ricerca_visiva/01faccini`.
Quando cambi, aggiungi o togli una foto in quella cartella, il Mac la manda al sito da solo.

Nella cartella:

- `cover.jpg` (o un file che inizia con `copertina`, `hero`, `bg_`, `ritratto`) = copertina;
  se non c'è, la copertina è la prima foto;
- tutte le altre foto, in ordine di nome (`01.jpg`, `02.jpg` ...; vale anche la sottocartella `images`) = la sequenza della pagina;
- per le foto singole (home, ritratto) basta un file nella cartella.

Vince l'ultima modifica: se carichi una copertina dal pannello e poi cambi il file nella cartella, il sito mostra quella della cartella, e viceversa.

**Installazione (una volta sola)**, sul Mac:

1. Apri la cartella `porfolio/sync-sito` nel Finder.
2. Doppio clic su **installa-sync.command**. Se macOS dice che non può aprirlo: tasto destro → *Apri* → *Apri*.
3. Incolla il token del punto 1 e premi Invio (mentre incolli non vedi niente, è normale).
4. Il Terminale mostra le foto che manderebbe: da quel momento il Mac controlla le cartelle ogni 3 minuti.

Altri comandi nella stessa cartella: **sincronizza-ora.command** (manda subito le modifiche),
**disinstalla-sync.command** (toglie la sincronizzazione). Registro: `~/Library/Logs/portfolio-sync.log`.
Quando il Mac invia delle foto compare una notifica "Portfolio".

## Come funziona (per chi sviluppa)

- `admin/index.html` + `admin/admin.js` + `admin/admin.css`: pannello senza dipendenze, che parla con l'API di GitHub
  usando il token salvato nel browser. L'albero e i campi di ogni elemento sono in `admin/struttura.js`.
- I testi restano i file Markdown di `docs/`: ogni campo è una riga `- **Etichetta:** valore` o il testo sotto un titolo `##`/`###`;
  il pannello cambia solo quel pezzo, sulla versione più recente del file.
- Le foto: il pannello scrive direttamente `img/<pagina>/cover.jpg`, `01.jpg` ... (riordinare riusa i file già su GitHub),
  l'archivio in `img/archivio/` + `thumbs/` + `archivio.json`. Ogni salvataggio è un solo commit.
- La cartella del Mac di ogni elemento è in `content/foto/<chiave>.json`, destinazioni in `content/destinazioni.json`.
- `.github/workflows/update-site.yml` a ogni push su `main` che tocca `docs/`, `content/` o `img/`:
  `tools/apply_photos.py` (ripulisce le JPEG con GPS o troppo grandi, importa le foto d'archivio mandate dal Mac),
  `tools/build_pages.py`, `tools/check_site.py`, poi committa le pagine rigenerate e chiede a Pages di ripubblicare.
- La sincronizzazione del Mac è `tools/mac/sync_cartelle.py` (solo libreria standard + `sips`), avviata da launchd
  (`~/Library/LaunchAgents/it.bohememag.portfolio-sync.plist`); il token è nel Portachiavi, voce `portfolio-sync`.
  Toglie dal sito solo le foto che ha mandato lei: quelle aggiunte dal pannello restano.
- Le pagine fotografiche mostrano tante foto quante sono in `img/<pagina>/` (12 segnaposto finché non ce n'è nessuna).
