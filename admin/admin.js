// Admin of the portfolio: browse the site by its information architecture (admin/struttura.js)
// and edit the texts and photos of each element together. Saving makes one commit on GitHub;
// the Action "Update site" then rebuilds the pages and GitHub Pages publishes them.
// No server: the browser talks to the GitHub API with Simone's token (kept in this browser only).
(function () {
  "use strict";

  const REPO = "simonecarduccii/simonecarducci";
  const BRANCH = "main";
  const API = "https://api.github.com";
  const SITE = "../"; // the admin lives at <site>/admin/
  const KEY = "portfolio-admin-token";
  const MAX_SIDE = 2000, ARCHIVE_SIDE = 1800, THUMB_SIDE = 900, QUALITY = 0.86;

  const $ = (sel, el = document) => el.querySelector(sel);
  const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k === "class") el.className = v;
      else if (k === "html") el.innerHTML = v;
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid);
    return el;
  };

  let token = null;
  let tree = {};         // path -> blob sha, for the whole repo at the last load
  const texts = {};      // path -> file content at the last load
  let current = null;    // element being edited
  let draft = null;      // its pending changes

  // ------------------------------------------------------------------ GitHub

  async function gh(method, path, body) {
    const res = await fetch(API + path, {
      method,
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    if (!res.ok) {
      const err = new Error(`GitHub ${res.status}: ${(await res.text()).slice(0, 200)}`);
      err.status = res.status;
      throw err;
    }
    return res.status === 204 ? null : res.json();
  }

  async function loadTree() {
    const ref = await gh("GET", `/repos/${REPO}/git/ref/heads/${BRANCH}`);
    const commit = await gh("GET", `/repos/${REPO}/git/commits/${ref.object.sha}`);
    const t = await gh("GET", `/repos/${REPO}/git/trees/${commit.tree.sha}?recursive=1`);
    tree = {};
    t.tree.forEach((e) => { if (e.type === "blob") tree[e.path] = e.sha; });
    return ref.object.sha;
  }

  const b64ToText = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\n/g, "")), (c) => c.charCodeAt(0)));

  async function readText(path, fresh) {
    if (!fresh && texts[path] != null) return texts[path];
    if (!tree[path]) return "";
    const blob = await gh("GET", `/repos/${REPO}/git/blobs/${tree[path]}`);
    texts[path] = b64ToText(blob.content);
    return texts[path];
  }

  async function blobFrom(data) {
    // data: {text} or {blob: Blob}
    if (data.text != null) return (await gh("POST", `/repos/${REPO}/git/blobs`, { content: data.text, encoding: "utf-8" })).sha;
    const b64 = await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result.split(",")[1]); r.readAsDataURL(data.blob); });
    return (await gh("POST", `/repos/${REPO}/git/blobs`, { content: b64, encoding: "base64" })).sha;
  }

  // changes: async (freshReader) => {path: sha | null}. Retried on a fresh head if someone pushed meanwhile.
  async function commit(message, build) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const head = await loadTree();
      const changes = await build();
      const entries = Object.entries(changes).map(([path, sha]) => ({ path, mode: "100644", type: "blob", sha }));
      if (!entries.length) return null;
      const base = (await gh("GET", `/repos/${REPO}/git/commits/${head}`)).tree.sha;
      const t = await gh("POST", `/repos/${REPO}/git/trees`, { base_tree: base, tree: entries });
      const c = await gh("POST", `/repos/${REPO}/git/commits`, { message, tree: t.sha, parents: [head] });
      try {
        await gh("PATCH", `/repos/${REPO}/git/refs/heads/${BRANCH}`, { sha: c.sha });
        await loadTree();
        return c.sha;
      } catch (e) {
        if (e.status !== 422 || attempt === 2) throw e;
      }
    }
  }

  // ------------------------------------------------------------------ Markdown fields

  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const level = (line) => (line.match(/^(#{1,6}) /) || [, ""])[1].length;

  function sectionRange(lines, heading, from = 0, to = lines.length) {
    const lv = level(heading);
    const i = lines.findIndex((l, n) => n >= from && n < to && l.startsWith(heading));
    if (i < 0) return null;
    let j = i + 1;
    while (j < to && !(level(lines[j]) && level(lines[j]) <= lv)) j++;
    return [i, j];
  }

  function metaLine(lines, key, scope) {
    let [a, b] = [0, lines.length];
    if (scope) { const r = sectionRange(lines, scope); if (!r) return -1; [a, b] = r; }
    const re = new RegExp("^\\s*- \\*\\*" + esc(key) + "[^*]*:\\*\\*");
    for (let n = a; n < b; n++) if (re.test(lines[n])) return n;
    return -1;
  }

  function getField(text, f) {
    const lines = text.split("\n");
    if (f.meta) {
      const n = metaLine(lines, f.meta, f.in);
      return n < 0 ? null : lines[n].replace(/^\s*- \*\*[^*]+:\*\*\s?/, "");
    }
    const r = sectionRange(lines, f.section);
    return r ? lines.slice(r[0] + 1, r[1]).join("\n").trim() : null;
  }

  function setField(text, f, value) {
    const lines = text.split("\n");
    if (f.meta) {
      const n = metaLine(lines, f.meta, f.in);
      if (n < 0) return text;
      lines[n] = lines[n].match(/^\s*- \*\*[^*]+:\*\*/)[0] + " " + value.replace(/\n+/g, " ").trim();
      return lines.join("\n");
    }
    const r = sectionRange(lines, f.section);
    if (!r) return text;
    const body = value.trim() ? ["", ...value.trim().split("\n"), ""] : [""];
    lines.splice(r[0] + 1, r[1] - r[0] - 1, ...body);
    return lines.join("\n");
  }

  // {sections: file}: every meta line before the first "## " and every "## " section, for the AI sheets.
  function expandFields(spec, text) {
    if (!spec.sections) return [spec];
    const lines = text.split("\n");
    const out = [];
    const first = lines.findIndex((l) => level(l) === 2);
    lines.slice(0, first < 0 ? lines.length : first).forEach((l) => {
      const m = l.match(/^- \*\*([^*]+?):\*\*/);
      if (m && !m[1].startsWith("Immagine")) out.push({ label: m[1], file: spec.sections, meta: m[1] });
    });
    lines.forEach((l) => {
      if (level(l) === 2) out.push({ label: l.slice(3), file: spec.sections, section: l, rows: 6 });
    });
    return out;
  }

  // ------------------------------------------------------------------ images

  async function toJpeg(file, side) {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const k = Math.min(1, side / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    // re-encoding drops every metadata block (GPS, camera)
    return new Promise((ok) => c.toBlob(ok, "image/jpeg", QUALITY));
  }

  const siteUrl = (path) => SITE + path + (tree[path] ? "?v=" + tree[path].slice(0, 8) : "");

  // ------------------------------------------------------------------ sidebar

  function flatten(nodes, parent, out = []) {
    nodes.forEach((n) => { n.parent = parent; out.push(n); if (n.children) flatten(n.children, n, out); });
    return out;
  }
  let ALL = flatten(window.STRUTTURA, null);

  // Ricerca visiva follows content/home.json: same order, titles and visibility as the home grid.
  async function applyHome() {
    let data = { ricerca_visiva: [] };
    try { data = JSON.parse(await readText("content/home.json", true) || "{}"); } catch (e) { /* keep empty */ }
    const group = ALL.find((n) => n.homeList);
    group.children = (data.ricerca_visiva || []).map((r) => {
      const doc = r.pagina && window.PROGETTI_FOTO[r.pagina];
      const n = doc ? window.photoProject(r.pagina, doc, r.titolo) : { id: r.id, title: r.titolo, soon: true };
      n.hidden = r.visibile === false;
      return n;
    });
    ALL = flatten(window.STRUTTURA, null);
    return data;
  }

  function renderNav() {
    const list = (nodes, depth) => h("ul", { class: "tree d" + depth }, nodes.map((n) => h("li", {},
      h("button", {
        type: "button", class: "node" + (n.soon ? " soon" : "") + (n.hidden ? " hidden" : "") + (current === n ? " on" : "") + (n.group ? " group" : ""),
        disabled: n.soon || null, title: n.soon ? "Pagina non ancora creata" : null,
        onclick: () => open(n),
      }, n.title, n.hidden ? h("span", { class: "tag" }, "nascosto") : n.soon ? h("span", { class: "tag" }, "in arrivo") : null),
      n.children ? list(n.children, depth + 1) : null)));
    $("#nav").replaceChildren(list(window.STRUTTURA, 0));
  }

  // ------------------------------------------------------------------ element view

  async function open(node) {
    if (draft && draft.dirty && !confirm("Hai modifiche non salvate. Le perdi?")) return;
    current = node;
    location.hash = node.id;
    renderNav();
    const main = $("#main");
    main.replaceChildren(h("p", { class: "muted" }, "Carico…"));
    try {
      draft = { dirty: false, texts: {}, photos: null, cartella: null };
      const view = await renderElement(node);
      main.replaceChildren(view);
      setPreview(node.page);
    } catch (e) {
      main.replaceChildren(h("p", { class: "error" }, "Non riesco a caricare: " + e.message));
    }
  }

  function markDirty() {
    draft.dirty = true;
    $("#save").disabled = false;
    $("#save-state").textContent = "Modifiche non salvate";
  }

  async function renderElement(node) {
    const path = [];
    for (let p = node.parent; p; p = p.parent) path.unshift(p.title);
    const head = h("header", { class: "el-head" },
      h("p", { class: "crumbs" }, path.join(" / ")),
      h("h1", {}, node.title),
      node.page ? h("a", { class: "open-page", href: SITE + node.page, target: "_blank", rel: "noopener" }, "Apri la pagina ↗") : null,
      node.note ? h("p", { class: "note" }, node.note) : null);

    const body = h("div", { class: "el-body" });
    if (node.photos) body.append(await photoPanel(node));
    if (node.texts) body.append(await textPanel(node));
    if (node.homeList) body.append(await homePanel());
    else if (node.children) {
      body.append(h("section", { class: "panel" }, h("h2", {}, "Dentro questa sezione"),
        h("div", { class: "cards" }, node.children.map((c) => h("button", {
          type: "button", class: "card" + (c.soon ? " soon" : ""), disabled: c.soon || null, onclick: () => open(c),
        }, cardImage(c), h("span", {}, c.title), c.soon ? h("small", {}, "in arrivo") : null)))));
    }
    const bar = h("div", { class: "savebar" },
      h("span", { id: "save-state", class: "muted" }, "Nessuna modifica"),
      h("button", { id: "save", type: "button", class: "primary", disabled: true, onclick: save }, "Salva e pubblica"));
    return h("div", {}, head, body, (node.photos || node.texts || node.homeList) ? bar : null);
  }

  function cardImage(c) {
    if (!c.photos && c.children) {
      const first = c.children.find((k) => k.photos);
      if (first) return cardImage(first);
    }
    const src = c.photos && (c.photos.kind === "serie" ? `${c.photos.dir}/cover.jpg` : c.photos.file);
    return src && tree[src] ? h("img", { src: siteUrl(src), alt: "", loading: "lazy" }) : h("span", { class: "ph" });
  }

  // ---------------------------------------------------------------- home grid (Ricerca visiva)

  async function homePanel() {
    const data = await applyHome();
    const list = (data.ricerca_visiva || []).map((r) => ({ ...r }));
    draft.home = { data, list };
    const ul = h("ol", { class: "home-list" });
    const draw = () => ul.replaceChildren(...list.map((r, i) => {
      const cover = r.pagina && `img/${r.pagina}/cover.jpg`;
      const title = h("input", { type: "text", value: r.titolo, "aria-label": "Titolo" });
      title.addEventListener("input", () => { r.titolo = title.value; markDirty(); });
      const year = h("input", { type: "text", value: r.anno, class: "year", "aria-label": "Anno" });
      year.addEventListener("input", () => { r.anno = year.value; markDirty(); });
      const vis = h("input", { type: "checkbox" });
      vis.checked = r.visibile !== false;
      vis.addEventListener("change", () => { r.visibile = vis.checked; li.classList.toggle("off", !vis.checked); markDirty(); });
      const li = h("li", { draggable: "true", class: r.visibile === false ? "off" : null },
        h("span", { class: "grip", title: "Trascina per spostare" }, "⋮⋮"),
        cover && tree[cover] ? h("img", { src: siteUrl(cover), alt: "" }) : h("span", { class: "ph" }, "foto in arrivo"),
        h("div", { class: "home-fields" }, title, year,
          h("small", {}, r.pagina ? `pagina ${r.pagina}.html` : "senza pagina (in home come “foto in arrivo”)")),
        h("div", { class: "ctl" }, h("label", { class: "vis" }, vis, " In home"),
        h("span", { class: "tools" },
          h("button", { type: "button", title: "Su", onclick: () => move(i, i - 1) }, "↑"),
          h("button", { type: "button", title: "Giù", onclick: () => move(i, i + 1) }, "↓"),
          r.pagina ? h("button", { type: "button", title: "Apri foto e testi", onclick: () => open(ALL.find((n) => n.id === r.pagina)) }, "Apri") : null)));
      li.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/x-home", String(i)); li.classList.add("dragging"); });
      li.addEventListener("dragend", () => li.classList.remove("dragging"));
      li.addEventListener("dragover", (e) => { if (e.dataTransfer.types.includes("text/x-home")) e.preventDefault(); });
      li.addEventListener("drop", (e) => { const from = e.dataTransfer.getData("text/x-home"); if (from !== "") { e.preventDefault(); move(+from, i); } });
      return li;
    }));
    const move = (a, b) => {
      if (b < 0 || b >= list.length) return;
      const [it] = list.splice(a, 1); list.splice(b, 0, it); draw(); markDirty();
    };
    draw();
    return h("section", { class: "panel" }, h("h2", {}, "Progetti in home"),
      h("p", { class: "hint" }, "Trascina per cambiare l'ordine della griglia (il primo è in alto a sinistra). Togli la spunta per nasconderlo dalla home. Il titolo è anche quello della pagina del progetto."),
      ul);
  }

  // ---------------------------------------------------------------- texts

  async function textPanel(node) {
    const panel = h("section", { class: "panel" }, h("h2", {}, "Testi"));
    for (const spec of node.texts) {
      const file = spec.file || spec.sections;
      const text = await readText(file);
      for (const f of expandFields(spec, text)) {
        const value = getField(text, f);
        if (value == null) continue;
        const id = "f" + Math.random().toString(36).slice(2, 8);
        const input = (f.rows || value.length > 80)
          ? h("textarea", { id, rows: f.rows || Math.min(12, Math.ceil(value.length / 70) + 1) })
          : h("input", { id, type: "text" });
        input.value = value;
        input.addEventListener("input", () => { draft.texts[file + "\u0000" + (f.meta || f.section) + "\u0000" + (f.in || "")] = { f, value: input.value }; markDirty(); });
        panel.append(h("label", { class: "field", for: id }, h("span", {}, f.label), input,
          /\[DA VERIFICARE/.test(value) ? h("small", { class: "verify" }, "Contiene una nota [DA VERIFICARE], evidenziata sul sito finché non la togli.") : null));
      }
    }
    panel.append(h("p", { class: "hint" }, "**grassetto**, _corsivo_, [testo del link](https://...). Un rigo vuoto separa i paragrafi."));
    return panel;
  }

  // ---------------------------------------------------------------- photos

  async function photoPanel(node) {
    const ph = node.photos;
    const panel = h("section", { class: "panel" }, h("h2", {}, "Foto"));
    if (node.cartella) panel.append(await folderField(node));
    if (ph.kind === "archivio") { panel.append(await archivePanel()); return panel; }

    const coverPath = ph.kind === "serie" ? `${ph.dir}/cover.jpg` : ph.file;
    const state = {
      cover: tree[coverPath] ? { sha: tree[coverPath], url: siteUrl(coverPath) } : null,
      seq: [],
      removed: [],
    };
    if (ph.kind === "serie") {
      Object.keys(tree).filter((p) => p.startsWith(ph.dir + "/") && /^\d{2,}\.jpg$/.test(p.slice(ph.dir.length + 1)))
        .sort().forEach((p) => state.seq.push({ sha: tree[p], url: siteUrl(p) }));
    }
    draft.photos = { node, state, coverPath };

    const coverBox = h("div", { class: "cover-slot" });
    const drawCover = () => coverBox.replaceChildren(
      state.cover ? h("img", { src: state.cover.url, alt: "" }) : h("span", { class: "ph" }, "Nessuna foto"),
      h("label", { class: "btn" }, state.cover ? "Sostituisci" : "Carica",
        h("input", { type: "file", accept: "image/*", hidden: true, onchange: async (e) => {
          const f = e.target.files[0]; if (!f) return;
          state.cover = await newPhoto(f, MAX_SIDE); drawCover(); markDirty();
        } })));
    drawCover();
    dropZone(coverBox, async (files) => { state.cover = await newPhoto(files[0], MAX_SIDE); drawCover(); markDirty(); });
    panel.append(h("h3", {}, ph.cover || "Foto"), coverBox);

    if (ph.kind === "serie") {
      const grid = h("ol", { class: "seq" });
      const draw = () => {
        grid.replaceChildren(...state.seq.map((it, i) => {
          const li = h("li", { draggable: "true" },
            h("img", { src: it.url, alt: "" }),
            h("span", { class: "num" }, String(i + 1).padStart(2, "0")),
            h("span", { class: "tools" },
              h("button", { type: "button", title: "Prima", onclick: () => move(i, i - 1) }, "←"),
              h("button", { type: "button", title: "Dopo", onclick: () => move(i, i + 1) }, "→"),
              h("button", { type: "button", title: "Usa come copertina", onclick: () => { state.cover = { ...it }; drawCover(); markDirty(); } }, "★"),
              h("button", { type: "button", title: "Togli", onclick: () => { state.seq.splice(i, 1); draw(); markDirty(); } }, "×")));
          li.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/x-seq", String(i)); li.classList.add("dragging"); });
          li.addEventListener("dragend", () => li.classList.remove("dragging"));
          li.addEventListener("dragover", (e) => { if (e.dataTransfer.types.includes("text/x-seq")) e.preventDefault(); });
          li.addEventListener("drop", (e) => {
            const from = e.dataTransfer.getData("text/x-seq");
            if (from === "") return;
            e.preventDefault(); e.stopPropagation(); move(+from, i);
          });
          return li;
        }), h("li", { class: "add" }, h("label", {}, "+ Aggiungi foto",
          h("input", { type: "file", accept: "image/*", multiple: true, hidden: true, onchange: (e) => addFiles(e.target.files) }))));
      };
      const move = (a, b) => {
        if (b < 0 || b >= state.seq.length) return;
        const [it] = state.seq.splice(a, 1); state.seq.splice(b, 0, it); draw(); markDirty();
      };
      const addFiles = async (files) => {
        for (const f of files) if (f.type.startsWith("image/")) state.seq.push(await newPhoto(f, MAX_SIDE));
        draw(); markDirty();
      };
      dropZone(grid, addFiles);
      draw();
      panel.append(h("h3", {}, ph.seq, h("small", {}, " trascina per riordinare, o trascina qui le foto dal Finder")), grid);
    }
    return panel;
  }

  async function newPhoto(file, side) {
    const blob = await toJpeg(file, side);
    return { blob, url: URL.createObjectURL(blob), name: file.name };
  }

  function dropZone(el, onFiles) {
    el.addEventListener("dragover", (e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); el.classList.add("over"); } });
    el.addEventListener("dragleave", () => el.classList.remove("over"));
    el.addEventListener("drop", (e) => {
      if (!e.dataTransfer.files.length) return;
      e.preventDefault(); el.classList.remove("over"); onFiles([...e.dataTransfer.files]);
    });
  }

  async function folderField(node) {
    const path = `content/foto/${node.cartella}.json`;
    let data = {};
    try { data = JSON.parse(await readText(path) || "{}"); } catch (e) { data = {}; }
    draft.cartella = { path, data, value: data.cartella || "" };
    const input = h("input", { type: "text", placeholder: "es. 01home/03ricerca_visiva/01faccini", value: data.cartella || "" });
    input.addEventListener("input", () => { draft.cartella.value = input.value.trim(); markDirty(); });
    return h("label", { class: "field folder" },
      h("span", {}, "Cartella sul Mac (dentro porfolio/information_architecture)"), input,
      h("small", {}, "Se cambi una foto in questa cartella, il Mac la manda al sito entro 3 minuti. Vince l'ultima modifica, qui o nella cartella."));
  }

  // ---------------------------------------------------------------- archive

  async function archivePanel() {
    let list = [];
    try { list = JSON.parse(await readText("img/archivio/archivio.json") || "[]"); } catch (e) { list = []; }
    const state = { list: list.map((p) => ({ ...p })), added: [], removed: [] };
    draft.archive = state;
    const grid = h("div", { class: "archive-grid" });
    const draw = () => grid.replaceChildren(
      ...state.list.map((p, i) => h("div", { class: "arc" },
        h("img", { src: p._url || siteUrl(`img/archivio/thumbs/${p.file}`), alt: "", loading: "lazy" }),
        h("span", { class: "num" }, p.n),
        ...["film", "luogo", "anno"].map((k) => {
          const inp = h("input", { type: "text", placeholder: k, value: p[k] == null ? "" : p[k] });
          inp.addEventListener("input", () => { p[k] = k === "anno" ? (inp.value ? Number(inp.value) || inp.value : null) : inp.value; markDirty(); });
          return inp;
        }),
        h("button", { type: "button", class: "x", title: "Togli dall'archivio", onclick: () => {
          if (!p._new) state.removed.push(p.file); else state.added = state.added.filter((a) => a.entry !== p);
          state.list.splice(i, 1); draw(); markDirty();
        } }, "×"))),
      h("label", { class: "arc add" }, "+ Aggiungi foto",
        h("input", { type: "file", accept: "image/*", multiple: true, hidden: true, onchange: (e) => add(e.target.files) })));
    const add = async (files) => {
      let n = Math.max(0, ...state.list.map((p) => parseInt(p.n, 10) || 0), ...Object.keys(tree)
        .filter((p) => /^img\/archivio\/\d+\.jpg$/.test(p)).map((p) => parseInt(p.match(/(\d+)\.jpg$/)[1], 10)));
      for (const f of files) {
        if (!f.type.startsWith("image/")) continue;
        n += 1;
        const num = String(n).padStart(4, "0");
        const big = await toJpeg(f, ARCHIVE_SIDE), thumb = await toJpeg(f, THUMB_SIDE);
        const entry = { n: num, file: num + ".jpg", film: "", luogo: "", anno: null, _new: true, _url: URL.createObjectURL(thumb) };
        state.list.push(entry);
        state.added.push({ entry, big, thumb });
      }
      draw(); markDirty();
    };
    dropZone(grid, add);
    draw();
    return h("div", {}, h("h3", {}, "Foto dell'archivio", h("small", {}, ` ${state.list.length} foto · escono a caso nella pagina Archivio`)), grid);
  }

  // ---------------------------------------------------------------- save

  async function save() {
    const btn = $("#save"), st = $("#save-state");
    btn.disabled = true;
    st.textContent = "Salvo…";
    const node = current;
    try {
      const sha = await commit(`Update ${node.title} from admin`, async () => {
        const out = {};
        // texts: apply each edited field to the latest version of its file
        const byFile = {};
        Object.values(draft.texts).forEach(({ f, value }) => { (byFile[f.file] = byFile[f.file] || []).push([f, value]); });
        for (const [file, edits] of Object.entries(byFile)) {
          let text = await readText(file, true);
          const before = text;
          edits.forEach(([f, v]) => { text = setField(text, f, v); });
          if (text !== before) out[file] = await blobFrom({ text });
        }
        // home grid
        if (draft.home) {
          const fresh = JSON.parse(await readText("content/home.json", true) || "{}");
          const json = JSON.stringify({ ...fresh, ricerca_visiva: draft.home.list }, null, 2) + "\n";
          if (json !== texts["content/home.json"]) out["content/home.json"] = await blobFrom({ text: json });
        }
        // Mac folder
        if (draft.cartella && draft.cartella.value !== (draft.cartella.data.cartella || "")) {
          const data = { ...draft.cartella.data, cartella: draft.cartella.value };
          out[draft.cartella.path] = await blobFrom({ text: JSON.stringify(data, null, 2) + "\n" });
        }
        // photos of a page: cover + 01, 02 ... rebuilt from existing blobs and new uploads
        if (draft.photos) {
          const { node: n, state, coverPath } = draft.photos;
          const shaOf = async (it) => it.sha || (it.sha = await blobFrom({ blob: it.blob }));
          if (state.cover && state.cover.sha !== tree[coverPath]) out[coverPath] = await shaOf(state.cover);
          if (n.photos.kind === "serie") {
            const dir = n.photos.dir;
            for (let i = 0; i < state.seq.length; i++) {
              const p = `${dir}/${String(i + 1).padStart(2, "0")}.jpg`;
              const s = await shaOf(state.seq[i]);
              if (tree[p] !== s) out[p] = s;
            }
            Object.keys(tree).forEach((p) => {
              const m = p.startsWith(dir + "/") && p.slice(dir.length + 1).match(/^(\d{2,})\.jpg$/);
              if (m && parseInt(m[1], 10) > state.seq.length) out[p] = null;
            });
          }
        }
        // archive: new files, removed files, archivio.json
        if (draft.archive) {
          const a = draft.archive;
          for (const { entry, big, thumb } of a.added) {
            out[`img/archivio/${entry.file}`] = await blobFrom({ blob: big });
            out[`img/archivio/thumbs/${entry.file}`] = await blobFrom({ blob: thumb });
          }
          a.removed.forEach((file) => { out[`img/archivio/${file}`] = null; if (tree[`img/archivio/thumbs/${file}`]) out[`img/archivio/thumbs/${file}`] = null; });
          const clean = a.list.map(({ _new, _url, ...p }) => p);
          const json = JSON.stringify(clean, null, 2) + "\n";
          if (json !== (texts["img/archivio/archivio.json"] || "")) out["img/archivio/archivio.json"] = await blobFrom({ text: json });
        }
        return out;
      });
      draft.dirty = false;
      if (draft.home) { await applyHome(); renderNav(); }
      if (!sha) { st.textContent = "Niente da salvare"; return; }
      st.textContent = "Salvato. Il sito si aggiorna in 1-2 minuti…";
      waitPublished(sha, node);
    } catch (e) {
      btn.disabled = false;
      st.textContent = "";
      alert("Salvataggio non riuscito: " + e.message);
    }
  }

  // Follow the publication: the Action commits the rebuilt pages after ours, then Pages deploys.
  async function waitPublished(sha, node) {
    const st = () => $("#save-state");
    const t0 = Date.now();
    while (Date.now() - t0 < 150000) {
      await new Promise((r) => setTimeout(r, 10000));
      try {
        const commits = await gh("GET", `/repos/${REPO}/commits?sha=${BRANCH}&per_page=3`);
        const i = commits.findIndex((c) => c.sha === sha);
        if (i > 0 || Date.now() - t0 > 60000) break;
      } catch (e) { break; }
    }
    await new Promise((r) => setTimeout(r, 45000));
    if (current === node && st()) st().textContent = "Online ✓ (se non vedi la modifica, ricarica la pagina)";
    setPreview(node.page, true);
    if (current === node) open(node);
  }

  // ---------------------------------------------------------------- preview

  function setPreview(page, reload) {
    const frame = $("#preview iframe");
    if (!page) return;
    const url = SITE + page.replace(/#.*/, "") + (reload ? "?t=" + Date.now() : "") + (page.includes("#") ? page.slice(page.indexOf("#")) : "");
    if (reload || frame.dataset.page !== page) { frame.src = url; frame.dataset.page = page; }
    $("#preview a").href = SITE + page;
  }

  // ---------------------------------------------------------------- login

  async function start() {
    token = localStorage.getItem(KEY);
    if (!token) return showLogin();
    try {
      await loadTree();
    } catch (e) {
      return showLogin(e.status === 401 ? "Il token non funziona più: creane uno nuovo." : "Non riesco a collegarmi a GitHub: " + e.message);
    }
    await applyHome();
    document.body.classList.add("ready");
    renderNav();
    const start = ALL.find((n) => n.id === location.hash.slice(1) && !n.soon) || ALL[0];
    open(start);
  }

  function showLogin(msg) {
    document.body.classList.remove("ready");
    const input = $("#token");
    $("#login-msg").textContent = msg || "";
    $("#login").onsubmit = async (e) => {
      e.preventDefault();
      token = input.value.trim();
      try {
        await gh("GET", `/repos/${REPO}`);
        localStorage.setItem(KEY, token);
        input.value = "";
        start();
      } catch (err) {
        $("#login-msg").textContent = "Token non valido per " + REPO + " (" + err.status + ").";
      }
    };
  }

  $("#logout").addEventListener("click", () => { localStorage.removeItem(KEY); location.reload(); });
  $("#toggle-preview").addEventListener("click", () => document.body.classList.toggle("no-preview"));
  window.addEventListener("beforeunload", (e) => { if (draft && draft.dirty) { e.preventDefault(); e.returnValue = ""; } });
  window.addEventListener("hashchange", () => {
    const n = ALL.find((x) => x.id === location.hash.slice(1));
    if (n && n !== current && !n.soon) open(n);
  });
  start();
})();
