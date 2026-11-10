// Information architecture of the site, as Simone organises it (porfolio/information_architecture).
// Each element says which texts (parts of the Markdown files in docs/) and which photos it edits.
//
// Text fields:
//   {label, file, meta: "Key"}                      the value of a "- **Key:** value" line
//   {label, file, meta: "Key", in: "## Heading"}    ... looked up inside that section only
//   {label, file, section: "## Heading"}            the text under a heading (until the next one of the same level)
//   {sections: file}                                every "## " section of a project sheet, in order
// Photos:
//   {kind: "serie", dir: "img/x"}       cover.jpg + 01.jpg, 02.jpg ... (the page sequence)
//   {kind: "singola", file: "img/x.jpg"} one photo
//   {kind: "archivio"}                   img/archivio/0001.jpg ... with film, place and year
// "cartella" is the key of content/foto/<key>.json, which holds the Mac folder for the sync.

const C = "docs/CONTENUTI.md";
const P = (slug) => `docs/progetti/${slug}.md`;

const photoProject = (slug, doc, title, folderHint) => ({
  id: slug, title, page: `${slug}.html`, cartella: slug, folderHint,
  photos: { kind: "serie", dir: `img/${slug}`, cover: "Copertina (anche in home)", seq: "Sequenza della pagina" },
  texts: [
    { label: "Anno", file: P(doc), meta: "Anno" },
    { label: "Luogo", file: P(doc), meta: "Luogo" },
    { label: "Supporto", file: P(doc), meta: "Supporto" },
    { label: "Fotocamera", file: P(doc), meta: "Fotocamera" },
    { label: "Pellicola", file: P(doc), meta: "Pellicola" },
    { label: "Intro in alto (max 40 parole)", file: P(doc), section: "## Intro", rows: 4 },
    { label: "Testo in fondo, dopo le foto", file: P(doc), section: "## Testo", rows: 10 },
    { label: "Crediti", file: P(doc), section: "## Crediti", rows: 2 },
  ],
});

const culture = (slug, doc, title) => ({
  id: slug, title, page: `${slug}.html`, cartella: slug,
  photos: { kind: "serie", dir: `img/${slug}`, cover: "Copertina: sfondo in home e in alto nella pagina", seq: "Foto della pagina" },
  texts: [
    { label: "In breve (anteprima nei link)", file: P(doc), section: "## In breve", rows: 3 },
    { label: "Testo della pagina (la riga in maiuscolo è la scheda: ETICHETTA valore · ETICHETTA valore)", file: P(doc), section: "## Testo pagina", rows: 18 },
  ],
});

const ai = (slug, doc, title) => ({
  id: slug, title, page: `${slug}.html`, cartella: slug,
  photos: { kind: "serie", dir: `img/${slug}`, cover: "Copertina", seq: "Schermate" },
  texts: [{ sections: P(doc), meta: true }],
});

window.STRUTTURA = [
  {
    id: "home", title: "Home", page: "index.html",
    texts: [{ label: "Descrizione per Google (max 155 caratteri)", file: C, meta: "Description home", rows: 3 }],
    children: [
      {
        id: "hero", title: "Hero", page: "index.html", group: true,
        note: "In alto in home ci sono i titoli dei due progetti culturali: la foto di sfondo è la copertina di ciascuno.",
        children: [culture("boheme", "boheme-magazine", "Bohème Magazine"), culture("modi", "colectivo-modi", "Colectivo modì")],
      },
      {
        id: "pellicole", title: "Pellicole", page: "index.html", cartella: "home-pellicole",
        note: "La banda a colori sotto l'hero. Le tre voci (Tutto ciò che mi sta intorno, Tutte le mie pellicole, Tutta la mia vita) sono fisse.",
        photos: { kind: "singola", file: "img/home/pellicole.jpg", cover: "Foto della banda" },
      },
      {
        id: "ricerca-visiva", title: "Ricerca visiva", page: "index.html#ricerca-visiva", group: true,
        note: "La griglia di progetti fotografici in home. La copertina di ogni progetto è anche la sua foto nella griglia.",
        children: [
          photoProject("faccioni", "faccioni", "Faccini"),
          photoProject("place-of-freedom", "place-of-freedom", "Ghei"),
          photoProject("papa-che-fanno-i-papa", "papa-che-fanno-i-papa", "Papà"),
          photoProject("siculo", "siculo", "Vita mia"),
          { id: "maghreb", title: "Maghreb", soon: true },
          { id: "torino-17", title: "Torino 17", soon: true },
        ],
      },
      {
        id: "ia", title: "Progetti con l'AI", page: "ai.html",
        texts: [{ label: "Testo della pagina AI", file: C, meta: "Lead", in: "### Progetti con l'intelligenza artificiale", rows: 3 }],
        children: [ai("vedetta", "ai-boheme-vedetta", "Bohème Vedetta"), ai("coaching", "ai-coaching-corsa", "Running Coach")],
      },
      {
        id: "banda-archivio", title: "Archivio (banda)", page: "index.html", cartella: "home-archivio",
        note: "La banda in bianco e nero che porta all'archivio, in fondo a ogni pagina.",
        photos: { kind: "singola", file: "img/home/archivio.jpg", cover: "Foto della banda" },
      },
    ],
  },
  {
    id: "about", title: "About", page: "about.html", cartella: "about",
    photos: { kind: "singola", file: "img/about/ritratto.jpg", cover: "Ritratto" },
    texts: [
      { label: "Frase d'apertura (grande)", file: C, section: "### Frase d'apertura", rows: 3 },
      { label: "Bio (i titoletti tra **asterischi** diventano le sezioni)", file: C, section: "### Bio estesa", rows: 22 },
      { label: "Ambiti, competenze, strumenti, lingue, formazione (tabella: una riga per voce)", file: C, section: "### Ambiti, competenze", rows: 9 },
      { label: "Descrizione per Google", file: C, meta: "Description About", rows: 2 },
    ],
  },
  {
    id: "archivio", title: "Archivio", page: "archivio.html", cartella: "archivio",
    photos: { kind: "archivio" },
    texts: [
      { label: "Testo sopra la foto", file: C, meta: "Lead", in: "## Archivio (versione precedente)", rows: 2 },
      { label: "Bottone", file: C, meta: "Bottone", in: "## Archivio (versione precedente)" },
    ],
  },
];
