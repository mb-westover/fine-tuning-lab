/* Fine-Tuning Lab — shared helpers for the physics engines.
 * Every physics file attaches itself to the global FTL namespace and touches no DOM,
 * so the same code runs in the browser and in Node (see tools/check-presets.js). */
(function (root) {
  'use strict';
  const FTL = root.FTL = root.FTL || {};

  /* Small deterministic PRNG so every run of a given setting looks the same. */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function gauss(r) { let u = 0; while (!u) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

  FTL.util = { mulberry32, gauss, clamp };
})(typeof window !== 'undefined' ? window : globalThis);
