/* Strong-force bench: a particle picture of Big Bang nucleosynthesis.
 *
 * 300 nucleons start at 1 s with the observed neutron fraction (~1 neutron per 5.5 protons).
 * Temperature falls as T ∝ t^(-1/2). Deuterium survives photodisintegration once the
 * temperature drops below ~1/30 of its binding energy (about 0.07 MeV for ours).
 *
 * Strong-force scaling s = 1 + δ (δ in percent / 100):
 *   deuteron binding  B_d = 2.22 MeV × (s − 0.94) / 0.06   → unbound below s ≈ 0.94
 *   diproton binding  B_pp ∝ (s − 1.035)                  → bound above s ≈ 1.035
 * Both thresholds sit inside the range of published estimates, which differ by a few percent.
 * Reaction probabilities and the diproton's weak decay are sped up to fit an animation. */
(function (root) {
  'use strict';
  const FTL = root.FTL = root.FTL || {};
  const { mulberry32 } = FTL.util;

  const T_START = 1, T_STOP = 1800, FRAMES = 780;
  const DLN = Math.log(T_STOP / T_START) / FRAMES;
  const TAU_N = 880;                    // neutron lifetime, s
  const S_D = 0.94, S_PP = 1.035;
  const N_PARTICLES = 300, N_NEUTRONS = 46;
  const MASS = { p: 1, n: 1, d: 2, pp: 2, he: 4 };

  class Plasma {
    constructor(pct) {
      this.s = 1 + pct / 100;
      this.r = mulberry32(7);
      this.Bd = this.s > S_D ? 2.22 * (this.s - S_D) / (1 - S_D) : 0;
      this.Tbn = 0.07 * this.Bd / 2.22;                       // MeV: deuterium bottleneck temperature
      this.Bpp = this.s > S_PP ? 2.22 * (this.s - S_PP) / 0.06 : 0;
      this.Tpp = 0.07 * this.Bpp / 2.22;
      this.kpp = this.s > S_PP ? 0.03 * Math.min(1, (this.s - S_PP) / 0.04) : 0;
      this.tbn = this.Tbn > 0 ? 1 / (this.Tbn * this.Tbn) : Infinity;   // time when T = Tbn (T in MeV ≈ t^-1/2)
      this.tpp = this.Tpp > 0 ? 1 / (this.Tpp * this.Tpp) : Infinity;
      this.t = T_START; this.frame = 0; this.ps = []; this.flashes = []; this.hist = [];
      const r = this.r;
      for (let i = 0; i < N_PARTICLES; i++) this.ps.push({ x: r(), y: r(), th: r() * 6.283, k: i < N_NEUTRONS ? 'n' : 'p' });
      this.record();
    }
    T() { return 1 / Math.sqrt(this.t); }   // MeV
    fractions() {
      const m = { p: 0, n: 0, d: 0, pp: 0, he: 0 };
      for (const q of this.ps) m[q.k] += MASS[q.k];
      for (const k in m) m[k] /= N_PARTICLES;
      return m;
    }
    record() { const f = this.fractions(); this.hist.push([Math.log10(this.t), f.p, f.he, f.n, f.d, f.pp]); }
    finished() { return this.frame >= FRAMES; }
    find(q, kind, R) {
      let best = null, bd = R * R;
      for (const o of this.ps) {
        if (o === q || o.k !== kind || o.dead) continue;
        const dx = o.x - q.x, dy = o.y - q.y, d2 = dx * dx + dy * dy;
        if (d2 < bd) { bd = d2; best = o; }
      }
      return best;
    }
    merge(a, b, k) { b.dead = true; a.x = (a.x + b.x) / 2; a.y = (a.y + b.y) / 2; a.k = k; this.flashes.push({ x: a.x, y: a.y, age: 0, c: k }); }
    step() {
      if (this.finished()) return;
      const t1 = this.t * Math.exp(DLN), dt = t1 - this.t; this.t = t1; this.frame++;
      const T = this.T(), r = this.r;
      const base = 0.0042 * (0.18 + 0.82 * Math.sqrt(Math.min(1, T)));
      for (const q of this.ps) {
        q.th += (r() - .5) * 0.9; const sp = base / Math.sqrt(MASS[q.k]);
        q.x += Math.cos(q.th) * sp; q.y += Math.sin(q.th) * sp;
        if (q.x < 0) { q.x = -q.x; q.th = Math.PI - q.th; } if (q.x > 1) { q.x = 2 - q.x; q.th = Math.PI - q.th; }
        if (q.y < 0) { q.y = -q.y; q.th = -q.th; } if (q.y > 1) { q.y = 2 - q.y; q.th = -q.th; }
      }
      const pdec = 1 - Math.exp(-dt / TAU_N);
      for (const q of this.ps) {
        if (q.dead) continue;
        if (q.k === 'n') {
          if (r() < pdec) { q.k = 'p'; continue; }
          if (this.t >= this.tbn && r() < 0.25) { const o = this.find(q, 'p', 0.05); if (o) this.merge(q, o, 'd'); }
        } else if (q.k === 'd') {
          if (r() < 0.5) { const o = this.find(q, 'd', 0.2); if (o) this.merge(q, o, 'he'); }
        } else if (q.k === 'p') {
          if (this.kpp > 0 && this.t >= this.tpp && r() < this.kpp) { const o = this.find(q, 'p', 0.05); if (o) this.merge(q, o, 'pp'); }
        } else if (q.k === 'pp') {
          if (r() < 0.012) q.k = 'd';   // weak decay of the diproton to deuterium (sped up)
        }
      }
      if (this.ps.some(q => q.dead)) this.ps = this.ps.filter(q => !q.dead);
      this.flashes.forEach(f => f.age++); this.flashes = this.flashes.filter(f => f.age < 22);
      this.record();
    }
    runToEnd() { while (!this.finished()) this.step(); return this; }
  }

  FTL.bbn = { Plasma, T_STOP, FRAMES };
})(typeof window !== 'undefined' ? window : globalThis);
