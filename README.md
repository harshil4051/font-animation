# 5 Kinetic Typography Animations (Vanilla JS & Webflow Ready)

A collection of 5 production-ready, accessible, responsive text reveal animations built with pure Vanilla JavaScript (0 external dependencies, no React). Designed for easy drop-in reuse on any website or inside Webflow using native custom attributes.

---

## Quick Navigation

1. [Slide Up (Characters Reveal)](#1-slide-up-characters-reveal)
2. [Text Roll (3D Letter Flip)](#2-text-roll-3d-letter-flip)
3. [Text Blur (Fade-in Blur)](#3-text-blur-fade-in-blur)
4. [Shutter Type (Mask Clip Reveal)](#4-shutter-type-mask-clip-reveal)
5. [Glyph Static (Decode / Scramble)](#5-glyph-static-decode--scramble)
6. [General Webflow Integration Guide](#webflow-integration-guide)

---

## 1. Slide Up (Characters Reveal)
Letters smoothly emerge and slide up from under their baseline with staggered timing.

* **Trigger Attribute:** `data-slide-up="characters"` *(or `"words"` / `"lines"`)*
* **Optional Attributes:**
  * `data-slide-stagger="0.03"` *(delay between characters in seconds)*
  * `data-slide-duration="0.5"` *(duration in seconds)*
  * `data-slide-delay="0"` *(initial delay)*
  * `data-slide-from="first"` *(`"first"` | `"last"` | `"center"`)*

### HTML
```html
<h2 data-slide-up="characters">Your Heading Text Here</h2>
```

### CSS (Paste into Webflow Head Code or Stylesheet)
```css
[data-slide-up] .sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}
[data-slide-up] .slide-word {
  display: inline-flex; overflow: visible; vertical-align: top;
}
[data-slide-up] .slide-char {
  position: relative; display: inline-block; overflow: hidden;
  white-space: pre-wrap; padding: 0 0.08em; margin: 0 -0.08em;
}
[data-slide-up] .slide-char-inner {
  display: inline-block; transform: translateY(100%); will-change: transform;
}
[data-slide-up] .slide-char-inner.is-visible {
  animation: hs-slide-up 0.5s cubic-bezier(0.625, 0.05, 0, 1) both;
}
@keyframes hs-slide-up {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  [data-slide-up] .slide-char-inner { transform: none; animation: none; }
}
```

### JS (Paste into Webflow Footer Code or Script Tag)
*Refer to `initSlideUp()` in [`webflow-animations.js`](./webflow-animations.js).*

---

## 2. Text Roll (3D Letter Flip)
Letters flip upwards with a dual-face 3D rolling motion, keeping full words intact across lines.

* **Trigger Attribute:** `data-text-roll="true"`
* **Optional Attributes:**
  * `data-roll-stagger="40"` *(delay in milliseconds per character)*

### HTML
```html
<h2 data-text-roll="true">Your Heading Text Here</h2>
```

### CSS (Paste into Webflow Head Code or Stylesheet)
```css
[data-text-roll] .text-roll { display: inline; white-space: normal; }
[data-text-roll] .text-roll__word { display: inline-block; white-space: nowrap; }
[data-text-roll] .text-roll__mask {
  display: inline-block; overflow: hidden; height: 1.15em; vertical-align: top;
  line-height: 1.15; padding: 0 0.06em; margin: 0 -0.06em;
}
[data-text-roll] .text-roll__char { display: block; white-space: pre; will-change: transform; }
[data-text-roll] .text-roll__face { display: block; height: 1.15em; line-height: 1.15; }
[data-text-roll] .text-roll.is-playing .text-roll__char {
  animation: hs-text-roll-up 500ms cubic-bezier(0.625, 0.05, 0, 1) both;
  animation-delay: var(--enter-delay, 0ms);
}
[data-text-roll] .text-roll__space { display: inline; white-space: pre-wrap; }
@keyframes hs-text-roll-up {
  from { transform: translateY(0); }
  to   { transform: translateY(-50%); }
}
@media (prefers-reduced-motion: reduce) {
  [data-text-roll] .text-roll.is-playing .text-roll__char { animation: none; transform: translateY(-50%); }
}
```

### JS (Paste into Webflow Footer Code or Script Tag)
*Refer to `initTextRoll()` in [`webflow-animations.js`](./webflow-animations.js).*

---

## 3. Text Blur (Fade-in Blur)
Words start blurred and smoothly resolve into crisp, high-contrast text on scroll.

* **Trigger Attribute:** `data-text-blur="true"`
* **Optional Attributes:**
  * `data-delay="0.30"` *(initial delay in seconds)*

### HTML
```html
<h2 data-text-blur="true">Your Heading Text Here</h2>
```

### CSS (Paste into Webflow Head Code or Stylesheet)
```css
[data-text-blur] [data-delay] {
  display: inline-block; opacity: 0; filter: blur(12px);
}
[data-text-blur] [data-delay].is-in {
  animation: hs-text-blur-in 0.9s ease forwards;
}
@keyframes hs-text-blur-in {
  to { opacity: 1; filter: blur(0); }
}
@media (prefers-reduced-motion: reduce) {
  [data-text-blur] [data-delay] { opacity: 1; filter: none; animation: none; }
}
```

### JS (Paste into Webflow Footer Code or Script Tag)
*Refer to `initTextBlur()` in [`webflow-animations.js`](./webflow-animations.js).*

---

## 4. Shutter Type (Mask Clip Reveal)
Each character is clipped to its own box and slides out from under its clipping edge as a single coordinated wavefront crossing the heading.

* **Trigger Attribute:** `data-text-shutter="true"`
* **Optional Attributes:**
  * `data-shutter-duration="900"` *(ms for full reveal front)*
  * `data-shutter-settle="520"` *(ms per character)*
  * `data-shutter-from="below"` *(`"below"` | `"above"` | `"behind"`)*
  * `data-shutter-trigger="view"` *(`"view"` | `"load"` | `"hover"`)*
  * `data-shutter-threshold="0.4"` *(viewport visibility threshold)*

### HTML
```html
<h2 data-text-shutter="true">Your Heading Text Here</h2>
```

### Files
* CSS: [`shutter-animation.css`](./shutter-animation.css)
* JS: [`shutter-animation.js`](./shutter-animation.js)

---

## 5. Glyph Static (Decode / Scramble)
Characters cycle rapidly through substitute glyphs and lock into place with a settling front. Character widths are pre-locked so lines never shiver or shift.

* **Trigger Attribute:** `data-text-glyph="true"`
* **Optional Attributes:**
  * `data-glyph-duration="1100"` *(ms for the full decode pass)*
  * `data-glyph-settle="380"` *(ms each character scrambles before locking)*
  * `data-glyph-fps="22"` *(swaps per second for readable static)*
  * `data-glyph-trigger="view"` *(`"view"` | `"load"` | `"hover"`)*
  * `data-glyph-accent="#2340ff"` *(optional accent color while scrambling)*

### HTML
```html
<h2 data-text-glyph="true">Your Heading Text Here</h2>
```

### Files
* CSS: [`glyph-animation.css`](./glyph-animation.css)
* JS: [`glyph-animation.js`](./glyph-animation.js)

---

## Webflow Integration Guide

1. **In Webflow Designer:**
   - Select your heading element.
   - Open **Element Settings (D)** → **Custom Attributes**.
   - Add the attribute for the animation you want (e.g., Name: `data-text-roll`, Value: `true`).

2. **Head Code:**
   - Go to **Page Settings → Custom Code → Inside `<head>` tag**.
   - Paste the corresponding CSS wrapped in `<style>...</style>`.

3. **Footer Code:**
   - Go to **Page Settings → Custom Code → Before `</body>` tag**.
   - Paste the corresponding JS wrapped in `<script>...</script>`.

---

## Features & Edge Protections Built In
- **No Mid-Word Breaking:** Words are wrapped in `white-space: nowrap` containers, preventing awkward line breaks mid-word.
- **No Edge Glyph Clipping:** All character masks use horizontal breathing padding and negative margins so outer terminals (such as bold **"s"**, **"r"**, **"W"**) are never sliced off.
- **Screen Reader Accessible:** Real text is preserved in `aria-label` or hidden `.sr-only` elements; animated spans carry `aria-hidden="true"`.
- **Reduced Motion:** Fully complies with `prefers-reduced-motion: reduce` OS settings.
