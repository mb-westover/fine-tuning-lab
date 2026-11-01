/* Gravity and dark-energy benches: a matter + Λ universe and the linear growth of density ripples.
 *
 * Units: the run starts at scale factor a = 1 with expansion rate H = 1 (matter domination,
 * t = 2/3). One code time unit is calibrated to 0.25 Myr so that our universe forms its first
 * stars at ~170 Myr and galaxies at ~0.7 Gyr.
 *
 *   a''  = -g / (2 a²) + Λ a                       (Friedmann acceleration, matter + Λ)
 *   D''  = -2 (a'/a) D' + (3/2) g D / a³            (linear growth of the density contrast D)
 *
 * g scales gravity's pull against the initial expansion (equivalently Ω_m), Λ is the
 * cosmological constant in code units. */
(function (root) {
  'use strict';
  const FTL = root.FTL = root.FTL || {};

  const LAM0 = 0.5 / Math.pow(1500, 3);   // our Λ: dark energy overtakes matter at ~1500× the starting size
  const D0 = 0.004;                        // initial density ripple
  const UNIT_MYR = 0.25;                   // Myr per code time unit
  const T0 = 2 / 3;
  const T_END = 14000 / UNIT_MYR;          // 14 Gyr
  const LIFE_UNITS = 5000 / UNIT_MYR;      // 5 Gyr of steady starlight after galaxies
  const STAR_CONTRAST = 0.4, GALAXY_CONTRAST = 1;

  function der(s, g, l) {
    const a = s[0], v = s[1], D = s[2], Dp = s[3];
    return [v, -g / (2 * a * a) + l * a, Dp, -2 * (v / a) * Dp + 1.5 * g * D / (a * a * a)];
  }
  function rk4(s, dt, g, l) {
    const k1 = der(s, g, l);
    const s2 = s.map((x, i) => x + .5 * dt * k1[i]), k2 = der(s2, g, l);
    const s3 = s.map((x, i) => x + .5 * dt * k2[i]), k3 = der(s3, g, l);
    const s4 = s.map((x, i) => x + dt * k3[i]), k4 = der(s4, g, l);
    return s.map((x, i) => x + dt / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
  }

  class Universe {
    constructor(g, l) {
      this.g = g; this.l = l;
      this.s = [1, 1, D0, D0];
      this.t = T0; this.amax = 1; this.collapsing = false; this.done = null;
      this.ms = { stars: null, gal: null, life: null };
      this.hist = [];
      this.record();
    }
    record() {
      this.hist.push([Math.log10(this.t * UNIT_MYR), Math.log10(Math.min(this.s[0], 1e9)), Math.log10(Math.max(1e-4, Math.min(this.s[2], 1e9)))]);
    }
    finished() { return !!this.done; }
    /* One animation frame: advance by a fixed step in log(time). */
    step() {
      if (this.done) return;
      const g = this.g, l = this.l;
      const tgt = this.s[1] > 0 ? this.t * Math.exp(.0135) : this.t * Math.exp(.0035);
      let it = 0;
      while (this.t < tgt && it < 4000) {
        const a = this.s[0], v = this.s[1];
        const dt = Math.min(.02 * a / Math.sqrt(v * v + g / a + Math.abs(l) * a * a), tgt - this.t);
        this.s = rk4(this.s, dt, g, l); this.t += dt; it++;
        if (this.s[0] > this.amax) this.amax = this.s[0];
        if (this.s[1] < 0) this.collapsing = true;
        if (this.collapsing && this.s[0] < .03 * this.amax) { this.done = 'crunch'; break; }
        if (this.s[0] > 1e7) { this.done = 'runaway'; break; }
      }
      const s = this.s;
      if (s[0] >= .4 * this.amax) {  // structure only counts while the universe is still big
        if (s[2] >= STAR_CONTRAST && this.ms.stars == null) this.ms.stars = this.t;
        if (s[2] >= GALAXY_CONTRAST && this.ms.gal == null) this.ms.gal = this.t;
      }
      if (this.ms.gal != null && this.ms.life == null && this.t - this.ms.gal >= LIFE_UNITS) this.ms.life = this.t;
      if (!this.done && this.t >= T_END) this.done = 'present';
      this.record();
      if (this.done === 'runaway') {  // expansion has run away; nothing else will happen
        if (this.ms.gal != null && this.ms.life == null && T_END - this.ms.gal >= LIFE_UNITS) this.ms.life = this.ms.gal + LIFE_UNITS;
        this.t = Math.max(this.t, T_END);
        this.hist.push([Math.log10(T_END * UNIT_MYR), 9, this.hist[this.hist.length - 1][2]]);
      }
    }
    runToEnd() { let n = 0; while (!this.done && n < 5000) { this.step(); n++; } return this; }
  }

  /* Dial mappings used by the two benches. */
  const gravityParams = pct => ({ g: 1 + pct / 100, l: LAM0 });
  const lambdaFactor = v => v >= 0 ? Math.pow(10, v) : -Math.pow(10, -v);   // slider is log10|Λ/Λ₀|, sign for negative Λ
  const lambdaParams = v => ({ g: 1, l: LAM0 * lambdaFactor(v) });

  FTL.cosmo = { Universe, LAM0, UNIT_MYR, T_END, LIFE_UNITS, gravityParams, lambdaFactor, lambdaParams };
})(typeof window !== 'undefined' ? window : globalThis);
