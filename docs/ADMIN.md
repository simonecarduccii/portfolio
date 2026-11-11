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
**Home** (Hero con Bohème e modì, Pellicole, Ricerca visiva con Faccini, Ghei, Papà, Vita mia, Progetti con l'AI, Archivio), **Pagine**, **Impostazioni**, **About**, **Archivio**.
Clicca un elemento: al centro trovi insieme le sue **foto** e i suoi **testi**, a destra l'anteprima della pagina online.

- **Copertina**: *Sostituisci*, oppure trascina una foto dal Finder sopra la copertina. Quella di Bohème e di modì è anche lo sfondo dell'hero in home; quella dei progetti fotografici è anche la loro foto nella griglia.
- **Sequenza**: trascina le foto per cambiare l'ordine (o usa ← →), ★ la rende copertina, × la toglie. Per aggiungerne, *+ Aggiungi foto* o trascinale dal Finder sulla griglia.
- **Interruttori**: ogni scheda della Home (Hero, Bohème, modì, Pellicole, Ricerca visiva, Progetti con l'AI, Archivio) ha un interruttore *Visibile in home*,
  che trovi anche sotto le schede di *Home → Dentro questa sezione*. Spento = la sezione sparisce dalla home (nel pannello resta, con la scritta *spento*). Le scelte sono in `content/home.json` (`sezioni`).
- **Ricerca visiva**: scegli quali progetti compaiono nella griglia della home (interruttore *In home*, c'è anche nella scheda di ogni progetto) e in che ordine (trascinali o ↑ ↓). Si aprono tutti, anche quelli ancora senza pagina: in home questi si vedono con il riquadro *foto in arrivo*. Il titolo che scrivi lì è anche il titolo della pagina del progetto e del suo nome nell'albero. L'elenco è in `content/home.json`.
- **Nuovi progetti**: in *Ricerca visiva*, *+ Nuovo progetto* chiede titolo e anno e crea subito il progetto: la sua pagina
  (`<titolo>.html`), la scheda dei testi (`docs/progetti/<titolo>.md`), la cartella delle foto (`img/<titolo>/`). Nasce **spento** in home:
  aprilo dall'albero, carica copertina e foto, scegli il layout, scrivi i testi, poi accendilo. Per i progetti ancora senza pagina
  (es. Torino 17) c'è *Crea pagina*. *Elimina* toglie il progetto con pagina, testi e foto (restano recuperabili nella cronologia di GitHub).
- **Formato in home**: in *Ricerca visiva*, sotto il titolo di ogni progetto, scegli la forma della sua foto nella griglia della home
  (come da design, 3:2, 4:3, 6:5, 16:9, 1:1, 5:6, 3:4, 2:3). La miniatura mostra subito la forma. Non cambia le foto dentro la pagina del progetto.
  Il valore è `formato` in `content/home.json`.
- **Layout dei progetti fotografici** (Faccini, Ghei, Papà, Vita mia): sotto la copertina c'è l'interruttore *Mostra la copertina grande in cima alla pagina*
  (spento = la pagina parte dalla prima foto della sequenza; in home la copertina resta). Poi scegli uno dei layout standard cliccando la miniatura:
  **Colonna** (una foto per riga, al centro), **Alternato** (una a sinistra, una a destra), **Griglia** (due per riga),
  **Grande** (tutta larghezza), **Ritmo** (una grande, poi due affiancate). Sul telefono le foto sono sempre una per riga.
  **Casuale** genera un layout a caso (ogni clic, o *↻ Un altro*, ne crea uno nuovo); se ti piace, *♥ Salva tra i miei layout*
  lo aggiunge alle miniature con il nome che scegli, e lo puoi usare anche negli altri progetti (× lo toglie). I layout salvati sono in
  `content/layout/_layouts.json`: ogni riga è un elenco di `[colonna di partenza, larghezza]` su 12 colonne, e le righe si ripetono lungo la pagina.
  La *Sequenza della pagina* sotto è un'anteprima in piccolo della pagina: le foto sono già disposte come nel layout scelto, e cambiano subito se cambi layout.
  Le scelte sono in `content/layout/<pagina>.json`; i layout sono le classi `.photo-seq.layout-<nome>` in `assets/style.css`.
- **Archivio**: aggiungi o togli foto e scrivi pellicola, luogo e anno sotto ciascuna.
- **Ordine delle sezioni**: in *Home*, ↑ ↓ spostano Pellicole, Ricerca visiva, Progetti con l'AI e la banda Archivio
  (l'hero resta sempre in alto). L'ordine è `ordine` in `content/home.json`.
- **Pagine**: pagine nuove composte con i blocchi della pagina *Componenti* di Figma (vedi `docs/COMPONENTI.md`).
  *+ Nuova pagina* chiede il titolo e la crea (online come `<titolo>.html`). Nella pagina, *+ Aggiungi un blocco qui…* inserisce un blocco
  in quel punto: **Titolo pagina**, **Foto grande** (larga o a tutta pagina), **Testo** (con nota in piccolo), **Citazione**, **Scheda dati**
  (righe etichetta / valore), **Sequenza foto** (con uno dei layout, anche quelli salvati), **Altri progetti** (automatico), **Progetto successivo**
  (link a un'altra pagina), **Fascia** (Pellicole o Archivio). ↑ ↓ spostano un blocco, × lo toglie. Le foto si caricano dentro il blocco
  (o trascinandole dal Finder) e finiscono in `img/<pagina>/`; quelle che nessun blocco usa più vengono tolte al salvataggio.
  La pagina è in `content/pagine/<pagina>.json`. Per ora non compare nei menu: si raggiunge dal suo indirizzo o da un blocco *Progetto successivo*.
- **Pagina in costruzione**: ogni elemento con una pagina sua (progetti, Bohème, modì, AI, About, Archivio, Pagine) ha in alto
  l'interruttore *Pagina in costruzione*. Acceso = chi apre la pagina vede solo l'avviso "Pagina in costruzione" (stile della pagina 404,
  con menu e footer, non indicizzata da Google); nell'albero l'elemento ha la scritta *in costruzione*. L'elenco è `in_costruzione` in `content/sito.json`.
- **Impostazioni**: le parti che compaiono in più pagine. Email, Instagram, Lomography e LinkedIn (vuoto = non compare),
  la riga in fondo al footer (copyright, credito, partita IVA: una riga vuota non compare), titolo e anni di Bohème e modì
  (l'anno della pagina e quello accanto al titolo in home), titolo, descrizione, stato e anno dei progetti con l'AI.
  Tutto è in `content/sito.json`.
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
