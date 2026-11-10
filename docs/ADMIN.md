# Pannello /admin

Indirizzo: **https://bohememag.it/portfolio/admin/**

Da qui cambi i testi e le foto del sito senza toccare il codice. Ogni salvataggio va su GitHub
e dopo 2-3 minuti il sito online è aggiornato (lo fa da sola l'Action "Update site").

## 1. Primo accesso (una volta sola)

Il pannello entra nel repository con un **token GitHub**, una specie di password solo per questo sito.

1. Apri [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new).
2. **Token name:** `portfolio admin`. **Expiration:** la durata che preferisci (es. 1 anno).
3. **Repository access:** *Only select repositories* → `simonecarduccii/portfolio`.
4. **Permissions → Repository permissions → Contents:** *Read and write*.
5. **Generate token** e copialo (inizia con `github_pat_`). Tienilo per te: chi lo ha può modificare il sito.
6. Apri https://bohememag.it/portfolio/admin/ → **Accedi con Token di Accesso** → incolla.

Il browser se lo ricorda. Lo stesso token serve per la sincronizzazione delle cartelle del Mac (punto 4).

## 2. Testi

**Testi** → scegli la pagina. Il testo è quello delle schede in `docs/`:

- cambia le parole liberamente;
- lascia uguali i titoli che iniziano con `##` e le etichette come `**Anno:**`: il sito li usa per sapere dove va ogni pezzo;
- `**grassetto**`, `_corsivo_`, `[testo del link](https://...)`;
- le frasi con `[DA VERIFICARE]` restano evidenziate sul sito finché non togli la nota.

**Salva**: dopo 2-3 minuti la pagina online è aggiornata.

## 3. Foto, caricate dal pannello

**Foto** → scegli la pagina:

- **Copertina** (o **Immagine** per le foto singole della home e il ritratto);
- **Foto della pagina**: aggiungile e trascinale nell'ordine in cui le vuoi vedere. Se ne togli una, sparisce dalla pagina;
- **Archivio fotografico**: ogni foto aggiunta entra nell'archivio con il numero successivo.

Vanno bene JPG, PNG, WebP, anche grandi: il pannello le rimpicciolisce prima di caricarle e
l'Action le trasforma nei file del sito (`cover.jpg`, `01.jpg` ...), togliendo GPS e dati della fotocamera.

## 4. Foto da una cartella del Mac

In **Foto**, ogni pagina ha il campo **Cartella sul Mac**: il percorso dentro
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

- `admin/index.html` carica [Sveltia CMS](https://sveltiacms.app) (versione fissata), configurato in `admin/config.yml`.
- I testi sono i file Markdown di `docs/`, modificati come testo semplice (formato `raw`): nessuna riformattazione.
- Le foto: un file JSON per pagina in `content/foto/`, destinazioni in `content/destinazioni.json`,
  file caricati in `content/caricate/`.
- `.github/workflows/update-site.yml` a ogni push su `main` che tocca `docs/`, `content/` o `img/`:
  `tools/apply_photos.py` (foto caricate → `img/`, ripulisce le JPEG con GPS o troppo grandi),
  `tools/build_pages.py`, `tools/check_site.py`, poi committa le pagine rigenerate e chiede a Pages di ripubblicare.
  Lo stato delle foto già applicate è in `content/.stato/`.
- La sincronizzazione del Mac è `tools/mac/sync_cartelle.py` (solo libreria standard + `sips`), avviata da launchd
  (`~/Library/LaunchAgents/it.bohememag.portfolio-sync.plist`); il token è nel Portachiavi, voce `portfolio-sync`.
- Le pagine fotografiche mostrano tante foto quante sono in `img/<pagina>/` (12 segnaposto finché non ce n'è nessuna).
