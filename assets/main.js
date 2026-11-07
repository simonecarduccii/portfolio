// Header: becomes solid after scrolling past the hero.
(function () {
  var header = document.querySelector('.site-header.on-hero');
  if (!header) return;
  var onScroll = function () {
    header.classList.toggle('scrolled', window.scrollY > window.innerHeight * 0.6);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// Random photo from the archive (list in assets/archivio.js).
// Each click shows a different photo; the next one is preloaded so it appears at once.
(function () {
  var photos = (window.ARCHIVIO || []).filter(function (p) { return p && p.src; });
  var targets = document.querySelectorAll('[data-random-photo]');
  if (!photos.length || !targets.length) return;

  var last = -1;
  var queued = null;
  function randomIndex() {
    if (photos.length === 1) return 0;
    var i;
    do { i = Math.floor(Math.random() * photos.length); } while (i === last);
    return i;
  }
  function pick() {
    var i = queued !== null ? queued : randomIndex();
    last = i;
    queued = randomIndex();
    new Image().src = photos[queued].src;
    return photos[i];
  }

  function show(target) {
    var photo = pick();
    var media = target.querySelector('.media') || target;
    var img = media.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      media.appendChild(img);
    }
    img.classList.remove('fade');
    void img.offsetWidth;
    img.src = (target.getAttribute('data-base') || '') + photo.src;
    img.alt = photo.alt || 'Fotografia analogica di Simone Carducci';
    img.classList.add('fade');
    var info = document.querySelector('[data-photo-info]');
    if (info) {
      info.textContent = [photo.title, photo.camera, photo.film, photo.year].filter(Boolean).join(' · ') || '';
    }
  }

  targets.forEach(function (t) {
    show(t);
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

  var btn = document.querySelector('[data-next-photo]');
  if (btn) btn.addEventListener('click', function () { targets.forEach(show); });

  document.addEventListener('keydown', function (e) {
    if (btn && (e.key === ' ' || e.key === 'ArrowRight') && document.activeElement === document.body) {
      e.preventDefault();
      targets.forEach(show);
    }
  });
})();

// Mobile menu.
(function () {
  var header = document.querySelector('.site-header');
  var toggle = header && header.querySelector('.nav-toggle');
  if (!toggle) return;
  function set(open) {
    header.classList.toggle('menu-open', open);
    document.body.classList.toggle('no-scroll', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Chiudi il menu' : 'Apri il menu');
  }
  toggle.addEventListener('click', function () { set(!header.classList.contains('menu-open')); });
  header.querySelectorAll('.nav a').forEach(function (a) { a.addEventListener('click', function () { set(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
  window.addEventListener('resize', function () { if (window.innerWidth > 760) set(false); });
})();

// Gallery lightbox: click a project photo to see it full screen.
(function () {
  var galleries = document.querySelectorAll('.gallery');
  if (!galleries.length || !window.HTMLDialogElement) return;

  var box = document.createElement('dialog');
  box.className = 'lightbox';
  box.setAttribute('aria-label', 'Foto a schermo intero');
  box.innerHTML = '<img alt=""><button class="lb-prev" type="button" aria-label="Foto precedente">←</button>' +
    '<button class="lb-next" type="button" aria-label="Foto successiva">→</button>' +
    '<button class="lb-close" type="button">Chiudi ✕</button><span class="lb-count"></span>';
  document.body.appendChild(box);
  var big = box.querySelector('img');
  var count = box.querySelector('.lb-count');
  var list = [];
  var index = 0;

  function show(i) {
    index = (i + list.length) % list.length;
    big.src = list[index].currentSrc || list[index].src;
    big.alt = list[index].alt;
    count.textContent = (index + 1) + ' / ' + list.length;
    box.querySelector('.lb-prev').hidden = box.querySelector('.lb-next').hidden = list.length < 2;
  }

  galleries.forEach(function (g) {
    g.addEventListener('click', function (e) {
      var img = e.target.closest('img');
      if (!img) return;
      // Only photos that actually loaded (missing ones remove themselves).
      list = Array.prototype.slice.call(g.querySelectorAll('img'));
      show(list.indexOf(img));
      box.showModal();
      document.body.classList.add('no-scroll');
    });
  });

  box.addEventListener('close', function () { document.body.classList.remove('no-scroll'); });
  box.querySelector('.lb-close').addEventListener('click', function () { box.close(); });
  box.querySelector('.lb-prev').addEventListener('click', function () { show(index - 1); });
  box.querySelector('.lb-next').addEventListener('click', function () { show(index + 1); });
  box.addEventListener('click', function (e) { if (e.target === box) box.close(); });
  box.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') show(index - 1);
    if (e.key === 'ArrowRight') show(index + 1);
  });

  var startX = null;
  box.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
  box.addEventListener('touchend', function (e) {
    if (startX === null) return;
    var dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) show(index + (dx < 0 ? 1 : -1));
    startX = null;
  });
})();
