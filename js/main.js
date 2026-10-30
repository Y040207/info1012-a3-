/* ==========================================================================
   main.js — shared behaviour for every page
   --------------------------------------------------------------------------
   Loaded by all four pages. Each function checks that the elements it needs
   exist before running, so one file can safely serve pages with different
   content (this avoids four near-identical scripts).
   ========================================================================== */

(function () {
  'use strict';

  /* ---------------------------------------------------------------------
     1. Highlight the current page in the navigation
     ---------------------------------------------------------------------
     We compare the file name in the URL with each link's href. Using
     aria-current instead of a CSS class keeps the accessible state and the
     visual state as one thing, so they can never drift apart.
     ------------------------------------------------------------------- */
  function markActiveNav() {
    var here = window.location.pathname.split('/').pop() || 'index.html';
    var links = document.querySelectorAll('.nav a');

    Array.prototype.forEach.call(links, function (link) {
      var target = link.getAttribute('href');
      if (target === here) {
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  /* ---------------------------------------------------------------------
     2. Live clock in the footer
     ---------------------------------------------------------------------
     Requirement: "the current date and time must be displayed at the bottom
     of the page". setInterval keeps it live rather than frozen at load time.
     ------------------------------------------------------------------- */
  function startClock() {
    var clock = document.getElementById('clock');
    if (!clock) return;

    function tick() {
      var now = new Date();
      clock.textContent = now.toLocaleString('en-AU', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }

    tick();
    window.setInterval(tick, 1000);
  }

  /* ---------------------------------------------------------------------
     3. Image cycler (home page only)
     ---------------------------------------------------------------------
     Requirement: "at least three images... a button ... to change or cycle
     through the images". The array lives in JS so adding a fourth image is
     a one-line change.
     ------------------------------------------------------------------- */
  var GALLERY = [
    {
      src: '../assets/images/study-desk.svg',
      alt: 'A study desk with an open textbook, a notebook and a cup of tea.',
      caption: 'A desk that has been sat at for a long time.'
    },
    {
      src: '../assets/images/calendar.svg',
      alt: 'A wall calendar with several dates circled in red pencil.',
      caption: 'Four deadlines in one fortnight — the reason this app exists.'
    },
    {
      src: '../assets/images/library.svg',
      alt: 'Library shelves with a student carrying a stack of books.',
      caption: 'Between classes, somewhere quiet to read.'
    }
  ];

  function initViewer() {
    var image = document.getElementById('viewer-image');
    var caption = document.getElementById('viewer-caption');
    var counter = document.getElementById('viewer-count');
    var nextBtn = document.getElementById('viewer-next');
    var dotsWrap = document.getElementById('viewer-dots');

    if (!image || !nextBtn) return;

    var index = 0;

    // Build one dot per image, once.
    var dots = GALLERY.map(function (item, i) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'dot';
      dot.setAttribute('aria-label', 'Show image ' + (i + 1));
      dot.addEventListener('click', function () { show(i); });
      dotsWrap.appendChild(dot);
      return dot;
    });

    function show(i) {
      index = (i + GALLERY.length) % GALLERY.length;
      var item = GALLERY[index];

      image.src = item.src;
      image.alt = item.alt;
      caption.textContent = item.caption;
      counter.textContent = 'Image ' + (index + 1) + ' of ' + GALLERY.length;

      dots.forEach(function (dot, n) {
        dot.setAttribute('aria-current', n === index ? 'true' : 'false');
      });
    }

    nextBtn.addEventListener('click', function () { show(index + 1); });
    show(0);
  }

  document.addEventListener('DOMContentLoaded', function () {
    markActiveNav();
    startClock();
    initViewer();
  });
})();
