/* ==========================================================================
   WEBFLOW TEXT ANIMATIONS — JAVASCRIPT
   Paste into Webflow: Project Settings → Custom Code → Footer Code
   (or Page Settings → Custom Code → Before </body> tag)
   ========================================================================== */

(function () {
  'use strict';

  /* ========================================================================
     SHARED UTILITIES
     ======================================================================== */

  // Execute function once DOM is fully parsed
  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  // Trigger callback once element enters the viewport
  function whenSeen(el, play, options) {
    if (!("IntersectionObserver" in window)) {
      play();
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        play();
        observer.disconnect();
      });
    }, options || { threshold: 0.35 });
    observer.observe(el);
  }

  // Safely split text into unicode graphemes (handles emojis & accents)
  function splitGraphemes(text) {
    if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
      var segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
      return Array.from(segmenter.segment(text), function (part) { return part.segment; });
    }
    return Array.from(text);
  }

  // Calculate character stagger delay based on direction ('first', 'last', 'center')
  function staggerDelay(index, total, from, stagger) {
    if (from === "last") return (total - 1 - index) * stagger;
    if (from === "center") return Math.abs(Math.floor(total / 2) - index) * stagger;
    return index * stagger;
  }


  /* ========================================================================
     ANIMATION 1: SLIDE UP
     Trigger Attribute: data-slide-up="characters" | "words" | "lines"
     Optional Attributes:
       - data-slide-stagger="0.03"  (delay between characters in seconds)
       - data-slide-duration="0.5"   (duration of character slide in seconds)
       - data-slide-delay="0"        (initial delay before animation begins)
       - data-slide-from="first"     ("first" | "last" | "center")
     ======================================================================== */
  function initSlideUp(el) {
    if (el.dataset.hsReady === "slide") return;
    el.dataset.hsReady = "slide";

    var mode = el.getAttribute("data-slide-up");
    var split = mode === "words" || mode === "lines" ? mode : "characters";
    var text = el.textContent;
    var stagger = parseFloat(el.getAttribute("data-slide-stagger") || "0.03");
    var delay = parseFloat(el.getAttribute("data-slide-delay") || "0");
    var from = el.getAttribute("data-slide-from") || "first";
    var duration = parseFloat(el.getAttribute("data-slide-duration") || "0.5");

    var words = split === "lines" ? text.split("\n") : text.split(" ");
    var units = words.map(function (word, i) {
      return {
        characters: split === "characters" ? splitGraphemes(word) : [word],
        needsSpace: split !== "lines" && i !== words.length - 1
      };
    });
    var total = units.reduce(function (sum, word) {
      return sum + word.characters.length + (word.needsSpace ? 1 : 0);
    }, 0);

    var sr = document.createElement("span");
    sr.className = "sr-only";
    sr.textContent = text;
    var fragment = document.createDocumentFragment();
    fragment.appendChild(sr);

    var previous = 0;
    units.forEach(function (word) {
      var wordEl = document.createElement("span");
      wordEl.className = "slide-word";
      wordEl.setAttribute("aria-hidden", "true");
      word.characters.forEach(function (char, charIndex) {
        wordEl.appendChild(makeChar(char, previous + charIndex));
      });
      if (word.needsSpace) wordEl.appendChild(makeChar(" ", previous + word.characters.length));
      previous += word.characters.length + (word.needsSpace ? 1 : 0);
      fragment.appendChild(wordEl);
    });

    el.textContent = "";
    el.appendChild(fragment);

    function makeChar(char, index) {
      var wrap = document.createElement("span");
      wrap.className = "slide-char";
      var inner = document.createElement("span");
      inner.className = "slide-char-inner";
      inner.textContent = char;
      inner.style.animationDuration = duration + "s";
      inner.style.animationDelay = (delay + staggerDelay(index, total, from, stagger)) + "s";
      wrap.appendChild(inner);
      return wrap;
    }

    whenSeen(el, function () {
      el.querySelectorAll(".slide-char-inner").forEach(function (inner) {
        inner.classList.add("is-visible");
      });
    });
  }


  /* ========================================================================
     ANIMATION 2: TEXT ROLL (3D LETTER FLIP)
     Trigger Attribute: data-text-roll="true"
     Optional Attributes:
       - data-roll-stagger="40"  (delay per character in milliseconds)
     ======================================================================== */
  function initTextRoll(element) {
    if (element.dataset.hsReady === "roll") return;
    element.dataset.hsReady = "roll";

    var raw = element.getAttribute("data-text-roll");
    var text = raw && raw !== "true" && raw !== "characters" ? raw : element.textContent.trim();
    var stagger = parseFloat(element.getAttribute("data-roll-stagger") || "40");
    var wrapper = document.createElement("span");
    wrapper.className = "text-roll";
    wrapper.setAttribute("aria-label", text);

    var parts = text.split(/(\s+)/);
    var charIndex = 0;

    parts.forEach(function (part) {
      if (!part) return;
      if (/^\s+$/.test(part)) {
        var space = document.createElement("span");
        space.className = "text-roll__space";
        space.setAttribute("aria-hidden", "true");
        space.textContent = " ";
        wrapper.appendChild(space);
        return;
      }

      var word = document.createElement("span");
      word.className = "text-roll__word";
      word.setAttribute("aria-hidden", "true");

      var characters = splitGraphemes(part);
      characters.forEach(function (character) {
        var mask = document.createElement("span");
        mask.className = "text-roll__mask";

        var letter = document.createElement("span");
        letter.className = "text-roll__char";
        letter.setAttribute("aria-hidden", "true");
        letter.style.setProperty("--enter-delay", (charIndex * stagger) + "ms");

        var enteringFace = document.createElement("span");
        enteringFace.className = "text-roll__face text-roll__face--enter";
        enteringFace.textContent = character;

        var exitingFace = document.createElement("span");
        exitingFace.className = "text-roll__face text-roll__face--exit";
        exitingFace.textContent = character;

        letter.append(enteringFace, exitingFace);
        mask.appendChild(letter);
        word.appendChild(mask);
        charIndex++;
      });

      wrapper.appendChild(word);
    });

    element.replaceChildren(wrapper);
    whenSeen(element, function () { wrapper.classList.add("is-playing"); }, { threshold: 0.4 });
  }


  /* ========================================================================
     ANIMATION 3: TEXT BLUR FADE
     Trigger Attribute: data-text-blur="true"
     Optional Attributes:
       - data-delay="0.30"  (initial delay in seconds before blurring in)
     ======================================================================== */
  function initTextBlur(root) {
    if (root.dataset.hsReady === "blur") return;
    root.dataset.hsReady = "blur";

    var manual = root.querySelector("[data-delay]");
    if (!manual) {
      var words = root.textContent.trim().split(/\s+/);
      var start = parseFloat(root.getAttribute("data-delay") || "0");
      root.textContent = "";
      words.forEach(function (word, index) {
        var span = document.createElement("span");
        span.textContent = word;
        span.setAttribute("data-delay", (start + index * 0.12).toFixed(2));
        root.appendChild(span);
        if (index !== words.length - 1) root.appendChild(document.createTextNode(" "));
      });
    }

    var nodes = root.querySelectorAll("[data-delay]");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var item = entry.target;
        var itemDelay = parseFloat(item.getAttribute("data-delay") || "0");
        item.style.animationDelay = (0.04 + itemDelay) + "s";
        item.classList.add("is-in");
        io.unobserve(item);
      });
    }, { rootMargin: "-50px", threshold: 0.2 });
    nodes.forEach(function (node) { io.observe(node); });
  }


  /* ========================================================================
     AUTO-INITIALIZATION ON PAGE LOAD
     ======================================================================== */
  onReady(function () {
    document.querySelectorAll("[data-slide-up]").forEach(initSlideUp);
    document.querySelectorAll("[data-text-roll]").forEach(initTextRoll);
    document.querySelectorAll("[data-text-blur]").forEach(initTextBlur);
  });
})();
