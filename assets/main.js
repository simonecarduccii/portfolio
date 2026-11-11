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
