/*!
 * Glyph Static — runtime · v1.0.0
 * unbland — https://unbland.dev
 *
 * Free to use in any project, commercial or personal, under the Unbland Free
 * Effect Licence. See LICENSE.txt. Keep this comment. Do not resell it or
 * republish it as your own effect.
 *
 * Text resolves out of noise. Each character cycles through substitute glyphs
 * and then locks to the one it was always going to be, with the settling front
 * running through the line.
 *
 * Webflow Installation:
 * 1. Add Custom Attribute to your heading in Webflow Designer:
 *    - Name: data-text-glyph
 *    - Value: true
 * 2. Paste CSS from glyph-animation.css into:
 *    Project / Page Settings → Custom Code → Inside <head> tag
 * 3. Paste this script into:
 *    Project / Page Settings → Custom Code → Before </body> tag
 */
(function (global) {
  'use strict';

  var DEFAULTS = {
    glyphs:     'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    duration:   1100,   // ms from first character starting to last one locking
    settle:     380,    // ms any one character spends scrambling before it locks
    fps:        22,     // glyph swaps per second
    trigger:    'view', // 'view' | 'hover' | 'load' | 'manual'
    threshold:  0.4,    // viewport visibility threshold
    once:       true,   // whether to play once
    accent:     '',     // optional accent color during scramble
    credit:     true,
  };

  var CSS = `
.gs-root{display:inline}
.gs-w{display:inline-block;white-space:nowrap}
.gs-c{display:inline-block;text-align:center}
.gs-c[data-gs-live]{color:var(--gs-accent,inherit)}
@media (prefers-reduced-motion:reduce){
  .gs-c{color:inherit!important}
}
`;

  var styled = false;
  function injectCSS(doc) {
    if (styled || doc.getElementById('gs-style')) {
      styled = true;
      return;
    }
    var s = doc.createElement('style');
    s.id = 'gs-style';
    s.textContent = CSS;
    doc.head.appendChild(s);
    styled = true;
  }

  function warn(msg) {
    console.warn('[Glyph Static] ' + msg);
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
    if (host.__glyphStatic) {
      warn('already running on this element; destroying the old one');
      host.__glyphStatic.destroy();
    }

    var cfg = Object.assign({}, DEFAULTS, options || {});
    var doc = host.ownerDocument || document;
    var pool = Array.from(String(cfg.glyphs || ''));
    if (!pool.length) {
      warn('no glyphs to scramble with');
      return null;
    }

    injectCSS(doc);

    var text = host.textContent;
    var original = Array.from(host.childNodes);

    var root = doc.createElement('span');
    root.className = 'gs-root';
    root.setAttribute('aria-hidden', 'true');
    if (cfg.accent) root.style.setProperty('--gs-accent', cfg.accent);

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
      word.className = 'gs-w';
      var glyphList = splitGraphemes(part);
      for (var j = 0; j < glyphList.length; j++) {
        var ch = glyphList[j];
        var c = doc.createElement('span');
        c.className = 'gs-c';
        c.textContent = ch;
        word.appendChild(c);
        chars.push({ el: c, ch: ch, start: 0, shown: ch });
      }
      root.appendChild(word);
    }

    if (!chars.length) {
      warn('the element has no text to scramble');
      return null;
    }

    var hadLabel = host.hasAttribute('aria-label');
    if (!hadLabel) {
      host.setAttribute('aria-label', text.replace(/\s+/g, ' ').trim());
    }
    host.textContent = '';
    host.appendChild(root);

    function lock() {
      var rects = chars.map(function (c) {
        return c.el.getBoundingClientRect();
      });
      for (var k = 0; k < chars.length; k++) {
        chars[k].el.style.width = rects[k].width.toFixed(3) + 'px';
      }
    }
    lock();

    function castPool() {
      var ruler = doc.createElement('span');
      ruler.className = 'gs-c';
      ruler.setAttribute('aria-hidden', 'true');
      ruler.style.cssText = 'position:absolute;visibility:hidden;width:auto;white-space:pre';
      root.appendChild(ruler);

      var widths = new Array(pool.length);
      for (var p = 0; p < pool.length; p++) {
        ruler.textContent = pool[p];
        widths[p] = ruler.getBoundingClientRect().width;
      }
      ruler.remove();

      var SHORTLIST = 6;
      for (var m = 0; m < chars.length; m++) {
        var c = chars[m];
        if (c.ch === ' ') {
          c.cast = [' '];
          continue;
        }
        var w = c.el.getBoundingClientRect().width;
        var order = widths
          .map(function (gw, idx) {
            return { i: idx, d: Math.abs(gw - w) };
          })
          .sort(function (a, b) {
            return a.d - b.d;
          })
          .slice(0, SHORTLIST);

        c.cast = order.map(function (o) {
          return pool[o.i];
        });
      }
    }
    castPool();

    var span = Math.max(0, cfg.duration - cfg.settle);
    for (var sIdx = 0; sIdx < chars.length; sIdx++) {
      chars[sIdx].start = chars.length > 1 ? (sIdx / (chars.length - 1)) * span : 0;
    }

    var reduced = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)');
    var motionOff = function () {
      return reduced && reduced.matches;
    };

    var raf = 0, t0 = 0, running = false, done = false, destroyed = false;
    var lastSwap = 0;

    function setChar(c, ch, live) {
      if (c.shown !== ch) {
        c.el.textContent = ch;
        c.shown = ch;
      }
      if (live && !c.live) {
        c.el.setAttribute('data-gs-live', '');
        c.live = true;
      } else if (!live && c.live) {
        c.el.removeAttribute('data-gs-live');
        c.live = false;
      }
    }

    function finish() {
      for (var fIdx = 0; fIdx < chars.length; fIdx++) {
        setChar(chars[fIdx], chars[fIdx].ch, false);
      }
      running = false;
      done = true;
      if (raf) {
        global.cancelAnimationFrame(raf);
        raf = 0;
      }
    }

    function frame(now) {
      raf = 0;
      if (destroyed) return;
      if (!t0) t0 = now;
      var t = now - t0;

      var swap = now - lastSwap >= 1000 / cfg.fps;
      if (swap) lastSwap = now;

      var pending = false;
      for (var f = 0; f < chars.length; f++) {
        var c = chars[f];
        if (t < c.start) {
          setChar(c, ' ', false);
          pending = true;
          continue;
        }
        if (t >= c.start + cfg.settle) {
          setChar(c, c.ch, false);
          continue;
        }
        pending = true;
        if (c.ch === ' ') {
          setChar(c, ' ', false);
          continue;
        }
        if (swap || c.shown === ' ') {
          setChar(c, c.cast[(Math.random() * c.cast.length) | 0], true);
        }
      }

      if (pending) {
        raf = global.requestAnimationFrame(frame);
      } else {
        finish();
      }
    }

    function play() {
      if (destroyed) return;
      if (motionOff()) {
        finish();
        return;
      }
      if (running) return;
      running = true;
      done = false;
      t0 = 0;
      lastSwap = 0;
      raf = global.requestAnimationFrame(frame);
    }

    if ((cfg.trigger === 'view' || cfg.trigger === 'load') && !motionOff()) {
      for (var b = 0; b < chars.length; b++) {
        setChar(chars[b], ' ', false);
      }
    }

    var io = null, onEnter = null;
    if (cfg.trigger === 'view') {
      if (global.IntersectionObserver) {
        io = new global.IntersectionObserver(function (entries) {
          for (var e = 0; e < entries.length; e++) {
            if (!entries[e].isIntersecting) continue;
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
      if (motionOff()) finish();
    };
    if (reduced && reduced.addEventListener) {
      reduced.addEventListener('change', onReduced);
    }

    if (doc.fonts && doc.fonts.status !== 'loaded') {
      doc.fonts.ready.then(function () {
        if (destroyed) return;
        for (var rIdx = 0; rIdx < chars.length; rIdx++) {
          chars[rIdx].el.style.width = '';
        }
        var held = chars.map(function (c) {
          return c.shown;
        });
        for (var hIdx = 0; hIdx < chars.length; hIdx++) {
          setChar(chars[hIdx], chars[hIdx].ch, false);
        }
        lock();
        castPool();
        for (var reIdx = 0; reIdx < chars.length; reIdx++) {
          if (held[reIdx] !== chars[reIdx].ch) {
            setChar(chars[reIdx], held[reIdx], true);
          }
        }
      });
    }

    if (cfg.credit) {
      console.log('Glyph Static — a free unbland effect · https://unbland.dev');
    }

    var api = {
      play: play,
      reveal: finish,
      destroy: function () {
        if (destroyed) return;
        destroyed = true;
        if (raf) {
          global.cancelAnimationFrame(raf);
          raf = 0;
        }
        if (io) io.disconnect();
        if (onEnter) host.removeEventListener('pointerenter', onEnter);
        if (reduced && reduced.removeEventListener) reduced.removeEventListener('change', onReduced);
        if (!hadLabel) host.removeAttribute('aria-label');
        host.textContent = '';
        for (var oIdx = 0; oIdx < original.length; oIdx++) {
          host.appendChild(original[oIdx]);
        }
        delete host.__glyphStatic;
      },
      get element() {
        return host;
      }
    };

    host.__glyphStatic = api;
    return api;
  }

  /* Expose API globally */
  global.UnblandGlyphStatic = {
    create: create,
    DEFAULTS: DEFAULTS
  };

  /* Auto-initialize Webflow elements with [data-text-glyph] or [data-glyph-static] */
  function initGlyphElement(el) {
    if (el.dataset.hsReady === "glyph") return;
    el.dataset.hsReady = "glyph";

    var duration = parseFloat(el.getAttribute("data-glyph-duration") || "1100");
    var settle = parseFloat(el.getAttribute("data-glyph-settle") || "380");
    var fps = parseFloat(el.getAttribute("data-glyph-fps") || "22");
    var trigger = el.getAttribute("data-glyph-trigger") || "view";
    var threshold = parseFloat(el.getAttribute("data-glyph-threshold") || "0.4");
    var accent = el.getAttribute("data-glyph-accent") || "";
    var glyphs = el.getAttribute("data-glyph-pool") || DEFAULTS.glyphs;
    var onceAttr = el.getAttribute("data-glyph-once");
    var once = onceAttr === null ? true : (onceAttr !== "false");

    create(el, {
      duration: duration,
      settle: settle,
      fps: fps,
      trigger: trigger,
      threshold: threshold,
      accent: accent,
      glyphs: glyphs,
      once: once,
      credit: false
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
    var elements = document.querySelectorAll("[data-text-glyph], [data-glyph-static]");
    for (var i = 0; i < elements.length; i++) {
      initGlyphElement(elements[i]);
    }
  });

})(typeof window !== 'undefined' ? window : globalThis);
