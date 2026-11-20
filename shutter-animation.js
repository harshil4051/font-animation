/*!
 * Shutter Type — runtime · v1.0.0
 * unbland — https://unbland.dev
 *
 * Free to use in any project, commercial or personal, under the Unbland Free
 * Effect Licence. See LICENSE.txt. Keep this comment. Do not resell it or
 * republish it as your own effect.
 *
 * Each character is clipped to its own box and slides out from under that
 * edge, with the reveal sweeping across the block as a single front. The
 * shutter is the clipping edge itself; there is nothing drawn over the text.
 *
 * Webflow Installation:
 * 1. Add Custom Attribute to your heading in Webflow Designer:
 *    - Name: data-text-shutter
 *    - Value: true
 * 2. Paste CSS from shutter-animation.css into:
 *    Project / Page Settings → Custom Code → Inside <head> tag
 * 3. Paste this script into:
 *    Project / Page Settings → Custom Code → Before </body> tag
 */
(function (global) {
  'use strict';

  var DEFAULTS = {
    duration:   900,      // ms for the reveal to cross the whole block
    settle:     520,      // ms any one character takes to arrive
    from:       'below',  // 'below' | 'above' | 'behind'
    sweep:      'auto',   // 'ltr' | 'rtl' | 'auto' — 'auto' follows element's direction
    trigger:    'view',   // 'view' | 'hover' | 'load' | 'manual'
    threshold:  0.4,
    once:       true,
    credit:     true,
  };

  var CSS = `
.st-root{display:inline-block;position:relative;max-width:100%}
.st-w{display:inline-block;white-space:nowrap}
.st-c{display:inline-block;overflow:hidden;
  padding-block:.26em .3em;margin-block:-.26em -.3em;padding-inline:.08em;margin-inline:-.08em;vertical-align:baseline}
.st-g{display:inline-block;will-change:transform,opacity}
@media (prefers-reduced-motion:reduce){
  .st-g{will-change:auto;transform:none!important;opacity:1!important}
}
`;

  var styled = false;
  function injectCSS(doc) {
    if (styled || doc.getElementById('st-style')) {
      styled = true;
      return;
    }
    var s = doc.createElement('style');
    s.id = 'st-style';
    s.textContent = CSS;
    doc.head.appendChild(s);
    styled = true;
  }

  function warn(msg) {
    console.warn('[Shutter Type] ' + msg);
  }

  /* Decelerating cubic ease-out */
  function easeOut(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function splitGraphemes(text) {
    if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
      var segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
      return Array.from(segmenter.segment(text), function (part) { return part.segment; });
    }
    return Array.from(text);
  }

  function create(target, options) {
    var host = typeof target === 'string' ? document.querySelector(target) : target;
    if (!host) {
      warn('no element matches ' + target);
      return null;
    }
    if (host.__shutterType) {
      warn('already running on this element; destroying the old one');
      host.__shutterType.destroy();
    }

    var cfg = Object.assign({}, DEFAULTS, options || {});
    var doc = host.ownerDocument || document;
    injectCSS(doc);

    var text = host.textContent;
    var original = Array.from(host.childNodes);

    var root = doc.createElement('span');
    root.className = 'st-root';
    root.setAttribute('aria-hidden', 'true');

    var chars = [];
    var parts = text.split(/(\s+)/);
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      if (part === '') continue;
      if (/^\s+$/.test(part)) {
        root.appendChild(doc.createTextNode(part));
        continue;
      }
      var word = doc.createElement('span');
      word.className = 'st-w';
      var glyphList = splitGraphemes(part);
      for (var j = 0; j < glyphList.length; j++) {
        var ch = glyphList[j];
        var box = doc.createElement('span');
        box.className = 'st-c';
        var glyph = doc.createElement('span');
        glyph.className = 'st-g';
        glyph.textContent = ch;
        box.appendChild(glyph);
        word.appendChild(box);
        chars.push({ box: box, glyph: glyph, x: 0, start: 0, at: -1 });
      }
      root.appendChild(word);
    }

    if (!chars.length) {
      warn('the element has no text to reveal');
      return null;
    }

    var hadLabel = host.hasAttribute('aria-label');
    if (!hadLabel) {
      host.setAttribute('aria-label', text.replace(/\s+/g, ' ').trim());
    }
    host.textContent = '';
    host.appendChild(root);

    var reduced = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)');
    var motionOff = function () {
      return reduced && reduced.matches;
    };

    function sweepDir() {
      if (cfg.sweep === 'ltr' || cfg.sweep === 'rtl') return cfg.sweep;
      var dir = (global.getComputedStyle(host).direction || 'ltr').toLowerCase();
      return dir === 'rtl' ? 'rtl' : 'ltr';
    }

    var x0 = 0, x1 = 0, rtl = false;

    function measure() {
      var r = root.getBoundingClientRect();
      rtl = sweepDir() === 'rtl';
      var rects = chars.map(function (c) {
        return c.box.getBoundingClientRect();
      });

      x0 = Infinity;
      x1 = -Infinity;
      for (var k = 0; k < rects.length; k++) {
        var rect = rects[k];
        x0 = Math.min(x0, rect.left - r.left);
        x1 = Math.max(x1, rect.right - r.left);
      }
      var span = Math.max(1, x1 - x0);

      for (var m = 0; m < chars.length; m++) {
        var cx = rects[m].left + rects[m].width / 2 - r.left;
        chars[m].x = cx;
        var p = (cx - x0) / span;
        chars[m].start = (rtl ? 1 - p : p) * Math.max(0, cfg.duration - cfg.settle);
      }
    }
    measure();

    function setChar(c, t) {
      var q = Math.round(t * 200) / 200;
      if (c.at === q) return;
      c.at = q;
      if (q >= 1) {
        c.glyph.style.transform = 'none';
        c.glyph.style.opacity = '';
        return;
      }
      var e = easeOut(q);
      if (cfg.from === 'behind') {
        c.glyph.style.transform = 'none';
        c.glyph.style.opacity = e.toFixed(3);
      } else {
        var sign = cfg.from === 'above' ? -1 : 1;
        c.glyph.style.transform = 'translateY(' + ((sign * (1 - e) * 110).toFixed(2)) + '%)';
        c.glyph.style.opacity = '';
      }
    }

    function hideAll() {
      for (var n = 0; n < chars.length; n++) {
        chars[n].at = -1;
        setChar(chars[n], 0);
      }
    }

    function showAll() {
      for (var p = 0; p < chars.length; p++) {
        chars[p].at = 1;
        chars[p].glyph.style.transform = 'none';
        chars[p].glyph.style.opacity = '';
      }
    }

    var raf = 0, t0 = 0, running = false, done = false, destroyed = false;

    function frame(now) {
      raf = 0;
      if (destroyed) return;
      if (!t0) t0 = now;
      var t = now - t0;

      var pending = false;
      for (var q = 0; q < chars.length; q++) {
        var c = chars[q];
        var local = cfg.settle > 0 ? (t - c.start) / cfg.settle : 1;
        var clamped = local <= 0 ? 0 : local >= 1 ? 1 : local;
        setChar(c, clamped);
        if (clamped < 1) pending = true;
      }

      if (pending) {
        raf = global.requestAnimationFrame(frame);
      } else {
        running = false;
        done = true;
        showAll();
      }
    }

    function play() {
      if (destroyed) return;
      if (motionOff()) {
        showAll();
        done = true;
        return;
      }
      if (running) return;
      measure();
      hideAll();
      running = true;
      done = false;
      t0 = 0;
      raf = global.requestAnimationFrame(frame);
    }

    function reveal() {
      if (raf) {
        global.cancelAnimationFrame(raf);
        raf = 0;
      }
      running = false;
      done = true;
      showAll();
    }

    if ((cfg.trigger === 'view' || cfg.trigger === 'load') && !motionOff()) {
      hideAll();
    }

    var io = null, onEnter = null;
    if (cfg.trigger === 'view') {
      if (global.IntersectionObserver) {
        io = new global.IntersectionObserver(function (entries) {
          for (var idx = 0; idx < entries.length; idx++) {
            if (!entries[idx].isIntersecting) continue;
            play();
            if (cfg.once && io) {
              io.disconnect();
              io = null;
            }
          }
        }, { threshold: cfg.threshold });
        io.observe(host);
      } else {
        play();
      }
    } else if (cfg.trigger === 'hover') {
      onEnter = function () {
        if (!cfg.once || !done) play();
      };
      host.addEventListener('pointerenter', onEnter, { passive: true });
    } else if (cfg.trigger === 'load') {
      play();
    }

    var onReduced = function () {
      if (motionOff()) reveal();
    };
    if (reduced && reduced.addEventListener) {
      reduced.addEventListener('change', onReduced);
    }

    var ro = null;
    if (global.ResizeObserver) {
      ro = new global.ResizeObserver(function () {
        if (!running) measure();
      });
      ro.observe(host);
    }
    if (doc.fonts && doc.fonts.status !== 'loaded') {
      doc.fonts.ready.then(function () {
        if (!destroyed && !running) measure();
      });
    }

    if (cfg.credit) {
      console.log('Shutter Type — a free unbland effect · https://unbland.dev');
    }

    var api = {
      play: play,
      reveal: reveal,
      destroy: function () {
        if (destroyed) return;
        destroyed = true;
        if (raf) {
          global.cancelAnimationFrame(raf);
          raf = 0;
        }
        if (io) io.disconnect();
        if (ro) ro.disconnect();
        if (onEnter) host.removeEventListener('pointerenter', onEnter);
        if (reduced && reduced.removeEventListener) reduced.removeEventListener('change', onReduced);
        if (!hadLabel) host.removeAttribute('aria-label');
        host.textContent = '';
        for (var rIdx = 0; rIdx < original.length; rIdx++) {
          host.appendChild(original[rIdx]);
        }
        delete host.__shutterType;
      },
      get element() {
        return host;
      }
    };

    host.__shutterType = api;
    return api;
  }

  /* Expose API globally */
  global.UnblandShutterType = {
    create: create,
    DEFAULTS: DEFAULTS
  };

  /* Auto-initialize Webflow elements with [data-text-shutter] or [data-shutter-type] */
  function initShutterElement(el) {
    if (el.dataset.hsReady === "shutter") return;
    el.dataset.hsReady = "shutter";

    var duration = parseFloat(el.getAttribute("data-shutter-duration") || "900");
    var settle = parseFloat(el.getAttribute("data-shutter-settle") || "520");
    var from = el.getAttribute("data-shutter-from") || "below";
    var sweep = el.getAttribute("data-shutter-sweep") || "auto";
    var trigger = el.getAttribute("data-shutter-trigger") || "view";
    var threshold = parseFloat(el.getAttribute("data-shutter-threshold") || "0.4");
    var onceAttr = el.getAttribute("data-shutter-once");
    var once = onceAttr === null ? true : (onceAttr !== "false");

    create(el, {
      duration: duration,
      settle: settle,
      from: from,
      sweep: sweep,
      trigger: trigger,
      threshold: threshold,
      once: once,
      credit: false // Keep console clean in production Webflow
    });
  }

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  onReady(function () {
    var elements = document.querySelectorAll("[data-text-shutter], [data-shutter-type]");
    for (var i = 0; i < elements.length; i++) {
      initShutterElement(elements[i]);
    }
  });

})(typeof window !== 'undefined' ? window : globalThis);
