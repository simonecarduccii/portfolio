// Simone Carducci — portfolio. Small, dependency-free interactions.

// Header: transparent over a full-bleed hero, solid after 40px of scroll.
(function () {
  var header = document.querySelector('.site-header.overlay');
  if (!header) return;
  var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 40); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// Random photo from the archive. The list is img/archivio/archivio.json, written by
// tools/optimize_images.py: [{"n":"0001","file":"0001.jpg","film":"...","luogo":"...","anno":2024}].
// Each click shows a different photo; the next one is preloaded so it appears at once.
// (fetch needs a web server: preview locally with `python3 -m http.server`.)
(function () {
  var targets = document.querySelectorAll('[data-random-photo]');
  if (!targets.length || !window.fetch) return;
  fetch('img/archivio/archivio.json')
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(function (list) {
      start((Array.isArray(list) ? list : []).filter(function (p) { return p && p.file; }).map(function (p) {
        return {
          n: p.n, src: 'img/archivio/' + p.file, thumb: 'img/archivio/thumbs/' + p.file,
          film: p.film, place: p.luogo, year: p.anno,
          alt: 'Fotografia analogica di Simone Carducci' + (p.luogo ? ', ' + p.luogo : '') + (p.anno ? ', ' + p.anno : '')
        };
      }));
    })
    .catch(function () {});

  function start(photos) {
  if (!photos.length) return;

  var last = -1;
  var queued = null;
  function randomIndex() {
    if (photos.length === 1) return 0;
    var i;
    do { i = Math.floor(Math.random() * photos.length); } while (i === last);
    return i;
  }
  function pick(forced) {
    var i = forced !== undefined ? forced : (queued !== null ? queued : randomIndex());
    last = i;
    queued = randomIndex();
    new Image().src = photos[queued].src;
    return i;
  }

  function show(target, forced, noHistory) {
    var i = pick(forced);
    if (!noHistory) (target._history = target._history || []).push(i);
    var photo = photos[i];
    var media = target.classList.contains('media') ? target : (target.querySelector('.media') || target);
    var img = media.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      media.appendChild(img);
    }
    img.classList.remove('fade');
    void img.offsetWidth;
    img.src = photo.src;
    img.alt = photo.alt || 'Fotografia analogica di Simone Carducci';
    img.classList.add('fade');
    media.classList.add('has-photo');
    var info = document.querySelector('[data-photo-info]');
    if (info) {
      var n = 'N. ' + (photo.n || String(i + 1).padStart(4, '0'));
      info.textContent = [n, photo.film, [photo.place, photo.year].filter(Boolean).join(', ')]
        .filter(Boolean).join(' — ');
    }
  }

  targets.forEach(function (t) {
    // data-keep: the band starts on its fixed photo; the chevron swaps in archive photos.
    if (!t.hasAttribute('data-keep')) show(t);
    if (!t.hasAttribute('data-click-next')) return;
    t.setAttribute('role', 'button');
    t.setAttribute('tabindex', '0');
    t.setAttribute('aria-label', "Mostra un'altra foto");
    t.addEventListener('click', function () { show(t); });
    t.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(t); }
    });
    var startX = null;
    t.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
    t.addEventListener('touchend', function (e) {
      if (startX !== null && Math.abs(e.changedTouches[0].clientX - startX) > 40) show(t);
      startX = null;
    });
  });

  // Chevrons on the home band and the archive cover: next = another random photo,
  // previous = back through the photos already seen there.
  document.querySelectorAll('[data-band-next], [data-cover-next], [data-cover-prev]').forEach(function (b) {
    var target = b.closest('section').querySelector('[data-random-photo]');
    if (!target) return;
    b.addEventListener('click', function (e) {
      e.preventDefault();
      if (!b.hasAttribute('data-cover-prev')) { show(target); return; }
      var h = target._history || [];
      if (h.length < 2) return;
      h.pop();
      show(target, h[h.length - 1], true);
    });
  });
  var cover = document.querySelector('[data-cover-stage]');

  var stage = document.querySelector('.archive-stage');
  var btn = document.querySelector('[data-next-photo]');
  if (btn && stage) btn.addEventListener('click', function () { show(stage); });

  document.addEventListener('keydown', function (e) {
    if (document.activeElement !== document.body) return;
    if (e.key === ' ' || e.key === 'ArrowRight') {
      var t = stage && stage.getBoundingClientRect().top < window.innerHeight / 2 ? stage : (cover || stage);
      if (!t) return;
      e.preventDefault();
      show(t);
    }
  });

  // Contact sheet under the archive: every photo as a thumbnail, click to project it.
  var sheet = document.querySelector('[data-contact-sheet]');
  if (sheet && stage) {
    photos.forEach(function (p, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Mostra la foto ' + (i + 1));
      b.innerHTML = '<img loading="lazy" alt="">';
      b.firstChild.src = p.thumb;
      b.firstChild.onerror = function () { this.onerror = null; this.src = p.src; };
      b.addEventListener('click', function () {
        show(stage, i);
        stage.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      sheet.appendChild(b);
    });
  }
  }
})();

// Home hero: hovering a project title shows its cover behind the list.
(function () {
  var hero = document.querySelector('.hero');
  if (!hero) return;
  var links = hero.querySelectorAll('.hero-list a[data-cover]');
  var layers = {};
  if (links[0]) links[0].parentNode.classList.add('is-active');
  links.forEach(function (a) {
    var src = a.getAttribute('data-cover');
    var probe = new Image();
    probe.onload = function () {
      var img = document.createElement('img');
      img.className = 'hero-cover';
      img.alt = '';
      img.src = src;
      if (a.getAttribute('data-pos')) img.style.objectPosition = a.getAttribute('data-pos');
      hero.insertBefore(img, hero.querySelector('.hero-list'));
      layers[src] = img;
    };
    probe.src = src;
    // The last cover shown stays visible after the cursor leaves the title.
    var on = function () {
      if (!layers[src]) return;
      Object.keys(layers).forEach(function (k) { layers[k].classList.toggle('on', k === src); });
      // The title of the photo on screen stays highlighted until another one is shown.
      links.forEach(function (b) { b.parentNode.classList.toggle('is-active', b === a); });
    };
    a.addEventListener('mouseenter', on);
    a.addEventListener('focus', on);
  });
})();

// Photo sequences: once some photos exist, hide the empty slots and renumber.
(function () {
  document.querySelectorAll('.photo-seq').forEach(function (seq) {
    var items = Array.prototype.slice.call(seq.querySelectorAll('li[data-src]'));
    var pending = items.length;
    var sizes = [];
    items.forEach(function (li, i) {
      var probe = new Image();
      probe.onload = function () { sizes[i] = [probe.naturalWidth, probe.naturalHeight]; settle(); };
      probe.onerror = settle;
      probe.src = li.getAttribute('data-src');
    });
    function settle() {
      if (--pending) return;
      var filled = items.filter(function (li, i) { return sizes[i]; });
      if (!filled.length) return; // nothing uploaded yet: keep the placeholders
      var total = String(filled.length).padStart(2, '0');
      items.forEach(function (li, i) {
        if (!sizes[i]) { li.remove(); return; }
        if (sizes[i][1] > sizes[i][0]) li.classList.add('portrait');
        var c = li.querySelector('.count');
        if (c) c.textContent = String(filled.indexOf(li) + 1).padStart(2, '0') + '/' + total;
      });
    }
  });
})();

// Lightbox: every photo on a page (not the ones that are links) opens full screen.
// Click the right or left half of the photo (an arrow appears on hover) to move, ✕ or a click outside to close.
(function () {
  if (!window.HTMLDialogElement) return;
  var SEL = '.photo-seq img, .photo-first img, .gallery img, .p-hero img, .about-intro img';
  function photos() {
    return Array.prototype.slice.call(document.querySelectorAll(SEL))
      .filter(function (img) { return !img.closest('a') && img.isConnected; });
  }
  if (!photos().length) return;

  var box = document.createElement('dialog');
  box.className = 'lightbox';
  box.setAttribute('aria-label', 'Foto a schermo intero');
  box.innerHTML = '<div class="lb-stage"><img alt="">' +
    '<button class="lb-zone lb-prev" type="button" aria-label="Foto precedente"><span>&larr;</span></button>' +
    '<button class="lb-zone lb-next" type="button" aria-label="Foto successiva"><span>&rarr;</span></button></div>' +
    '<button class="lb-close" type="button" aria-label="Chiudi" autofocus>&#10005;</button><span class="lb-count label"></span>';
  document.body.appendChild(box);
  var big = box.querySelector('img');
  var count = box.querySelector('.lb-count');
  var prev = box.querySelector('.lb-prev');
  var next = box.querySelector('.lb-next');
  var list = [];
  var index = 0;

  function show(i) {
    index = (i + list.length) % list.length;
    big.src = list[index].currentSrc || list[index].src;
    big.alt = list[index].alt;
    count.textContent = list.length > 1 ? (index + 1) + ' / ' + list.length : '';
    prev.hidden = next.hidden = list.length < 2;
  }

  document.addEventListener('click', function (e) {
    var img = e.target.closest && e.target.closest('img');
    if (!img || box.contains(img)) return;
    list = photos();
    var i = list.indexOf(img);
    if (i < 0) return;
    show(i);
    box.showModal();
    document.body.classList.add('no-scroll');
  });

  box.addEventListener('close', function () { document.body.classList.remove('no-scroll'); });
  box.querySelector('.lb-close').addEventListener('click', function () { box.close(); });
  prev.addEventListener('click', function () { show(index - 1); });
  next.addEventListener('click', function () { show(index + 1); });
  // A click anywhere that is not the photo or a button closes the lightbox.
  box.addEventListener('click', function (e) { if (!e.target.closest('.lb-stage, button')) box.close(); });
  box.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') show(index - 1);
    if (e.key === 'ArrowRight') show(index + 1);
  });

  var startX = null;
  box.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
  box.addEventListener('touchend', function (e) {
    if (startX === null) return;
    var dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40 && list.length > 1) show(index + (dx < 0 ? 1 : -1));
    startX = null;
  });
})();

// "Altri progetti": one row; the arrows appear only when some projects don't fit and scroll one card at a time.
(function () {
  document.querySelectorAll('.related').forEach(function (sec) {
    var row = sec.querySelector('.related-row');
    var nav = sec.querySelector('.related-nav');
    if (!row || !nav) return;
    var prev = nav.querySelector('[data-rel-step="-1"]');
    var next = nav.querySelector('[data-rel-step="1"]');
    function update() {
      var max = row.scrollWidth - row.clientWidth;
      nav.hidden = max <= 1;
      prev.disabled = row.scrollLeft <= 1;
      next.disabled = row.scrollLeft >= max - 1;
    }
    nav.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      var tile = row.querySelector('.tile');
      var step = tile ? tile.getBoundingClientRect().width + parseFloat(getComputedStyle(row).columnGap || 0) : row.clientWidth;
      row.scrollBy({ left: step * Number(b.getAttribute('data-rel-step')), behavior: 'smooth' });
    });
    row.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  });
})();

// Posters by category: a deck of cards. The arrows, a swipe or the keyboard arrows on the focused deck bring the
// poster behind to the front (and back); the download link follows the front poster.
(function () {
  document.querySelectorAll('.deck-col').forEach(function (col) {
    var deck = col.querySelector('.deck');
    var cards = deck ? [].slice.call(deck.querySelectorAll('.card')) : [];
    var n = cards.length;
    if (n < 2) return;
    var count = col.querySelector('.poster-count');
    var link = col.querySelector('.poster-dl');
    var i = 0;
    function show() {
      cards.forEach(function (c, k) {
        var d = (k - i + n) % n;
        c.style.setProperty('--d', d);
        c.classList.toggle('far', d > 3);
        if (d === 0) c.removeAttribute('aria-hidden'); else c.setAttribute('aria-hidden', 'true');
      });
      if (count) count.textContent = (i + 1) + ' / ' + n;
      if (link) { link.href = cards[i].getAttribute('data-dl'); link.setAttribute('download', cards[i].getAttribute('data-name')); }
    }
    function step(s) {
      if (s > 0) { // the front card slides away, then goes to the back
        var front = cards[i];
        front.classList.add('leaving');
        setTimeout(function () { front.classList.remove('leaving'); }, 260);
      }
      i = (i + s + n) % n;
      show();
    }
    col.addEventListener('click', function (e) {
      var b = e.target.closest('[data-step]');
      if (b) step(Number(b.getAttribute('data-step')));
    });
    deck.addEventListener('click', function () { step(1); });
    deck.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    });
    var x0 = null;
    deck.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    deck.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
    });
    show();
  });
})();

// One player for several videos: a click on the list plays that video in the player.
(function () {
  document.querySelectorAll('.video-player').forEach(function (vp) {
    var frame = vp.querySelector('iframe');
    vp.addEventListener('click', function (e) {
      var b = e.target.closest('.vp-item');
      if (!b || !frame) return;
      var src = b.getAttribute('data-src');
      frame.src = src + (src.indexOf('?') < 0 ? '?' : '&') + 'autoplay=1';
      frame.title = b.getAttribute('data-title');
      vp.querySelectorAll('.vp-item').forEach(function (x) { if (x === b) x.setAttribute('aria-current', 'true'); else x.removeAttribute('aria-current'); });
    });
  });
})();

// Videos one at a time: a random one when the page opens, "Un altro video" plays another (never the same twice in a row).
function scRandomPlayer(box, autoplay) {
  var list = [];
  try { list = JSON.parse(box.getAttribute('data-videos') || '[]'); } catch (e) { return; }
  if (!list.length) return;
  var holder = box.querySelector('.video');
  var caption = box.querySelector('.vr-caption');
  var current = -1;
  function play(auto) {
    var i = current;
    if (list.length > 1) { while (i === current) i = Math.floor(Math.random() * list.length); } else i = 0;
    current = i;
    var v = list[i];
    if (/^https?:/.test(v.src)) {
      holder.className = 'video';
      holder.innerHTML = '';
      var f = document.createElement('iframe');
      f.src = v.src + (auto ? (v.src.indexOf('?') < 0 ? '?' : '&') + 'autoplay=1' : '');
      f.title = v.title; f.loading = 'lazy'; f.allowFullscreen = true;
      f.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture; encrypted-media');
      holder.appendChild(f);
    } else {
      holder.className = 'video file';
      holder.innerHTML = '';
      var el = document.createElement('video');
      el.src = v.src; el.controls = true; el.playsInline = true; el.preload = 'metadata';
      holder.appendChild(el);
      if (auto) el.play().catch(function () {});
    }
    if (caption) caption.textContent = v.title || '';
  }
  var next = box.querySelector('.vr-next');
  if (next) next.addEventListener('click', function () { play(true); });
  play(autoplay);
}
document.querySelectorAll('.page-videos .video-random').forEach(function (b) { scRandomPlayer(b, false); });

// "Foto" / "Video" under each poster deck: a window where you first choose the evening (by its poster),
// then a grid of all its photos (click one to see it large) or the list of its DJ sets (click one to watch it).
(function () {
  var dlg = document.querySelector('.ev-dialog');
  if (!dlg || typeof dlg.showModal !== 'function') {
    document.querySelectorAll('.ev-btns').forEach(function (b) { b.hidden = true; });
    return;
  }
  var title = dlg.querySelector('.ev-dialog-title');
  var body = dlg.querySelector('.ev-dialog-body');
  var ev = null; // {name, kind, label, serate}
  function esc(t) { var d = document.createElement('div'); d.textContent = t == null ? '' : t; return d.innerHTML; }
  function ytId(src) { var m = /youtube(?:-nocookie)?\.com\/embed\/([\w-]{6,})/.exec(src || ''); return m ? m[1] : ''; }
  // header: "POP NO POP · Foto" then the evening, with a link back to the step before
  function head(back, parts) {
    title.innerHTML = (back ? '<button type="button" class="ev-back" aria-label="Indietro">&larr;</button>' : '') +
      parts.map(esc).join(' <span class="ev-sep">·</span> ');
    var bb = title.querySelector('.ev-back');
    if (bb) bb.addEventListener('click', back);
    body.onkeydown = null;
  }
  function pickSerata() {
    var list = ev.serate;
    if (list.length === 1) return open(0, false);
    head(null, [ev.name, ev.label]);
    body.innerHTML = '<p class="ev-step">Scegli la serata</p><ul class="ev-serate-grid">' + list.map(function (se, k) {
      var n = ev.kind === 'foto' ? se.photos.length + ' foto' : se.videos.length + (se.videos.length === 1 ? ' video' : ' video');
      return '<li><button type="button" data-k="' + k + '">' +
        (se.poster ? '<img src="' + esc(se.poster) + '" alt="" loading="lazy">' : '<span class="ev-noposter"></span>') +
        '<span class="ev-sname">' + esc(se.name) + '</span><span class="ev-snum">' + n + '</span></button></li>';
    }).join('') + '</ul>';
    body.querySelectorAll('[data-k]').forEach(function (b) {
      b.addEventListener('click', function () { open(Number(b.getAttribute('data-k')), true); });
    });
    var first = body.querySelector('[data-k]'); if (first) first.focus();
  }
  function open(k, fromList) {
    var se = ev.serate[k];
    var back = fromList ? pickSerata : null;
    if (ev.kind === 'foto') grid(se, back); else djs(se, back);
  }
  function grid(se, back) {
    head(back, [ev.name, se.name]);
    body.innerHTML = '<ul class="ev-grid">' + se.photos.map(function (p, i) {
      return '<li><button type="button" data-i="' + i + '"><img src="' + esc(p.src) + '" alt="' + esc(p.alt) + '" loading="lazy"></button></li>';
    }).join('') + '</ul>';
    body.querySelectorAll('[data-i]').forEach(function (b) {
      b.addEventListener('click', function () { photo(se, Number(b.getAttribute('data-i')), back); });
    });
  }
  function photo(se, i, backToList) {
    var items = se.photos;
    head(function () { grid(se, backToList); }, [ev.name, se.name]);
    body.innerHTML = '<img class="ev-photo" alt=""><div class="ev-photo-nav"><button type="button" data-s="-1" aria-label="Foto precedente">&larr;</button>' +
      '<span class="poster-count"></span><button type="button" data-s="1" aria-label="Foto successiva">&rarr;</button></div>';
    var im = body.querySelector('img'), count = body.querySelector('.poster-count');
    function show() { im.src = items[i].src; im.alt = items[i].alt || ''; count.textContent = (i + 1) + ' / ' + items.length; }
    var nav = body.querySelector('.ev-photo-nav');
    nav.hidden = items.length < 2;
    nav.addEventListener('click', function (e) {
      var b = e.target.closest('[data-s]'); if (!b) return;
      i = (i + Number(b.getAttribute('data-s')) + items.length) % items.length; show();
    });
    body.onkeydown = function (e) {
      if (e.key === 'ArrowRight') { i = (i + 1) % items.length; show(); }
      if (e.key === 'ArrowLeft') { i = (i - 1 + items.length) % items.length; show(); }
    };
    show();
  }
  function djs(se, back) {
    if (se.videos.length === 1) return play(se, 0, back);
    head(back, [ev.name, se.name]);
    body.innerHTML = '<p class="ev-step">Scegli il DJ set</p><ul class="ev-djs">' + se.videos.map(function (v, i) {
      var id = ytId(v.src);
      return '<li><button type="button" data-v="' + i + '">' +
        (id ? '<img src="https://i.ytimg.com/vi/' + id + '/mqdefault.jpg" alt="" loading="lazy">' : '<span class="ev-noposter"></span>') +
        '<span class="ev-sname">' + esc(v.title) + '</span></button></li>';
    }).join('') + '</ul>';
    body.querySelectorAll('[data-v]').forEach(function (b) {
      b.addEventListener('click', function () { play(se, Number(b.getAttribute('data-v')), function () { djs(se, back); }); });
    });
  }
  function play(se, i, back) {
    var v = se.videos[i];
    head(back, [ev.name, se.name]);
    body.innerHTML = '<div class="video-random"><div class="video"></div><div class="vr-foot"><p class="vr-caption"></p></div></div>';
    var box = body.firstChild;
    box.setAttribute('data-videos', JSON.stringify([v]));
    scRandomPlayer(box, true);
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.ev-btn');
    if (!b) return;
    var all = [];
    try { all = JSON.parse(b.getAttribute('data-serate') || '[]'); } catch (err) { return; }
    var kind = b.getAttribute('data-kind');
    var serate = all.filter(function (se) { return kind === 'foto' ? se.photos.length : se.videos.length; });
    if (!serate.length) return;
    ev = { name: b.getAttribute('data-title'), kind: kind, label: b.textContent, serate: serate };
    pickSerata();
    dlg.showModal();
  });
  dlg.addEventListener('keydown', function (e) { if (body.onkeydown) body.onkeydown(e); });
  dlg.querySelector('.ev-close').addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', function () { body.innerHTML = ''; }); // stops the video
})();

// Galleria: always ten cells (5 x 2) with photos picked at random from every evening; the arrow top right picks ten
// others, the one on its left goes back; the buttons show one evening only.
(function () {
  document.querySelectorAll('.page-gallery').forEach(function (sec) {
    var grid = sec.querySelector('.gallery-grid');
    var bar = sec.querySelector('.g-filter');
    var nav = sec.querySelector('.g-nav');
    if (!grid) return;
    var all = [].slice.call(grid.querySelectorAll('.g-item'));
    var PER = 10, g = '', history = [], at = -1;
    function shuffle(a) { for (var k = a.length - 1; k > 0; k--) { var j = Math.floor(Math.random() * (k + 1)); var t = a[k]; a[k] = a[j]; a[j] = t; } return a; }
    function pool() { return all.filter(function (el) { return g === '' || el.getAttribute('data-g') === g; }); }
    // ten new ones: first those not on screen now, then the others
    function pick() {
      var list = pool(), now = history[at] || [];
      var fresh = shuffle(list.filter(function (el) { return now.indexOf(el) < 0; }));
      var old = shuffle(list.filter(function (el) { return now.indexOf(el) >= 0; }));
      return fresh.concat(old).slice(0, PER);
    }
    function show(set) {
      all.forEach(function (el) { el.hidden = true; });
      grid.querySelectorAll('.g-empty').forEach(function (el) { el.remove(); });
      set.forEach(function (el) { el.hidden = false; grid.appendChild(el); });
      for (var m = set.length; m < PER; m++) { var e = document.createElement('div'); e.className = 'g-item g-empty'; e.setAttribute('aria-hidden', 'true'); grid.appendChild(e); }
      if (nav) {
        nav.hidden = pool().length <= PER;
        nav.querySelector('[data-gs="-1"]').disabled = at < 1;
      }
    }
    function next() { history = history.slice(0, at + 1); history.push(pick()); at = history.length - 1; show(history[at]); }
    if (nav) nav.addEventListener('click', function (e) {
      var b = e.target.closest('[data-gs]'); if (!b) return;
      if (b.getAttribute('data-gs') === '1') next(); else if (at > 0) { at--; show(history[at]); }
    });
    if (bar) bar.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      g = b.getAttribute('data-g'); history = []; at = -1;
      bar.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      next();
    });
    next();
  });
})();

// Social: a reel uploaded as a file plays silently; "Audio" turns the sound on (and off).
document.addEventListener('click', function (e) {
  var b = e.target.closest('.ig-sound');
  if (!b) return;
  var v = b.parentNode.querySelector('video');
  v.muted = !v.muted;
  if (!v.muted) v.play();
  b.setAttribute('aria-pressed', v.muted ? 'false' : 'true');
});

// Instagram embeds tell their real height with a message; size each frame to it so nothing is cut.
window.addEventListener('message', function (e) {
  if (!/^https:\/\/www\.instagram\.com$/.test(e.origin)) return;
  var data = e.data;
  try { if (typeof data === 'string') data = JSON.parse(data); } catch (err) { return; }
  if (!data || data.type !== 'MEASURE' || !data.details || !data.details.height) return;
  document.querySelectorAll('.ig-embed iframe').forEach(function (f) {
    if (f.contentWindow === e.source) { f.style.aspectRatio = 'auto'; f.style.height = data.details.height + 'px'; }
  });
});
