/* Hoyle-state bench (and the electromagnetism bench's carbon/oxygen output):
 * a one-zone model of the helium-burning core of a red giant.
 *
 * Reactions (rates from Caughlan & Fowler 1988):
 *   3 ⁴He → ¹²C        resonant through the Hoyle state:  λ ∝ T9⁻³ exp(−ε/kT) · ωγ/ωγ₀
 *   ¹²C + ⁴He → ¹⁶O    CF88 fit × 1.7 (a common normalisation in stellar models)
 *   ¹⁶O + ⁴He → ²⁰Ne   CF88 fit
 *
 * ε is the Hoyle state's energy above the three-helium threshold (379.47 keV in our universe).
 * The resonance strength is ωγ = Γα Γγ / (Γα + Γγ). Γα (8.5 eV for ours) shrinks with the
 * Coulomb-barrier penetrability exp(−2πη) as the state approaches the ⁸Be + ⁴He threshold.
 *
 * The core burns at whatever temperature makes the nuclear power meet a fixed demand (the
 * star's luminosity), at fixed density. A higher Hoyle state forces a hotter core, where
 * ¹²C + ⁴He → ¹⁶O runs much faster; a lower one lets the core burn cooler, where carbon
 * survives but little oxygen is made.
 *
 * Calibration: density 10⁴ g/cm³ and a starting temperature of 1.15×10⁸ K. Our universe then
 * ends core helium burning with ~25% carbon and ~75% oxygen by mass, close to full stellar
 * models (Schlattl et al. 2004: 19–21% C, 76–78% O for 15–25 solar-mass stars).
 *
 * For the electromagnetism bench, α = f·α₀ shifts ε by +3.99 MeV·(f−1) and the ⁸Be ground
 * state by +2.75 MeV·(f−1) (Epelbaum et al. 2013), and raises the Coulomb barrier of the
 * α-capture reactions (Gamow exponent ∝ f^(2/3)). */
(function (root) {
  'use strict';
  const FTL = root.FTL = root.FTL || {};

  const KT_KEV = 86.17333;                               // kT in keV at T9 = 1
  const ERG_PER_MOL_MEV = 6.02214076e23 * 1.602176634e-6;
  const SEC_PER_MYR = 3.15576e13;
  const Q3A = 7.2747, QCA = 7.1619, QOA = 4.7298;        // MeV released per reaction
  const EPS0 = 379.47;                                   // keV: Hoyle state above 3 ⁴He (ours)
  const E8_0 = 91.84;                                    // keV: ⁸Be ground state above 2 ⁴He (ours)
  const QEM_EPS = 3990, QEM_E8 = 2750;                   // keV per unit δα/α (Epelbaum et al. 2013)
  const G_RAD = 3.7e-3, G_ALPHA0 = 8.5;                  // eV: Hoyle-state radiative and alpha widths
  const MU_BEA_KEV = 2.483984e6;                         // reduced mass of ⁸Be + ⁴He, keV/c²

  const cfg = { rho: 1.0e4, T9start: 0.115, epsReq: null, frames: 560, stopX4: 0.002 };

  function eta(EkeV, f) { return 8 * f / 137.036 * Math.sqrt(MU_BEA_KEV / (2 * EkeV)); }
  const ETA0 = eta(EPS0 - E8_0, 1);
  function omegaGamma(eHB, f) {   // eHB: Hoyle state above ⁸Be + ⁴He, keV
    if (eHB <= 1) return 0;
    const ga = G_ALPHA0 * Math.exp(-2 * Math.PI * (eta(eHB, f) - ETA0));
    return ga * G_RAD / (ga + G_RAD);
  }
  const OG0 = omegaGamma(EPS0 - E8_0, 1);

  /* N_A² <ααα>  [cm⁶ mol⁻² s⁻¹] */
  function lam3a(T9, p) {
    return 2.79e-8 * Math.pow(T9, -3) * Math.exp(-p.eps / (KT_KEV * T9)) * omegaGamma(p.eps - p.e8, p.f) / OG0;
  }
  /* N_A <σv> for ¹²C(α,γ)¹⁶O  [cm³ mol⁻¹ s⁻¹] */
  function lamCa(T9, f) {
    const t13 = Math.cbrt(T9), t23 = t13 * t13, tau = 32.120 * Math.pow(f, 2 / 3) / t13;
    const a = 1.04e8 / (T9 * T9) / Math.pow(1 + 0.0489 / t23, 2) * Math.exp(-tau - Math.pow(T9 / 3.496, 2));
    const b = 1.76e8 / (T9 * T9) / Math.pow(1 + 0.2654 / t23, 2) * Math.exp(-tau);
    const c = 1.25e3 * Math.pow(T9, -1.5) * Math.exp(-27.499 / T9);
    const d = 1.43e-2 * Math.pow(T9, 5) * Math.exp(-15.541 / T9);
    return 1.7 * (a + b + c + d);
  }
  /* N_A <σv> for ¹⁶O(α,γ)²⁰Ne */
  function lamOa(T9, f) {
    const t13 = Math.cbrt(T9), t23 = t13 * t13;
    const a = 9.37e9 / t23 * Math.exp(-39.757 * Math.pow(f, 2 / 3) / t13 - Math.pow(T9 / 1.586, 2));
    const b = 62.1 * Math.pow(T9, -1.5) * Math.exp(-10.297 / T9);
    const c = 538 * Math.pow(T9, -1.5) * Math.exp(-12.226 / T9);
    const d = 13.0 * T9 * T9 * Math.exp(-20.093 / T9);
    return a + b + c + d;
  }

  function coeffs(Y, T9, p) {
    const rho = cfg.rho, y4 = Math.max(0, Y[0]);
    return { r1: rho * rho * y4 * y4 * y4 * lam3a(T9, p) / 6, a: rho * y4 * lamCa(T9, p.f), b: rho * y4 * lamOa(T9, p.f) };
  }
  function power(Y, T9, p) {
    const k = coeffs(Y, T9, p);
    return ERG_PER_MOL_MEV * (k.r1 * Q3A + k.a * Math.max(0, Y[1]) * QCA + k.b * Math.max(0, Y[2]) * QOA);
  }
  /* Temperature at which nuclear power meets the demand (the star's thermostat). */
  function solveT(Y, p) {
    let lo = Math.log(0.02), hi = Math.log(3);
    if (power(Y, Math.exp(hi), p) < cfg.epsReq) return null;
    for (let i = 0; i < 46; i++) {
      const mid = 0.5 * (lo + hi);
      if (power(Y, Math.exp(mid), p) > cfg.epsReq) hi = mid; else lo = mid;
    }
    return Math.exp(0.5 * (lo + hi));
  }
  function calibrate() { cfg.epsReq = power([0.25, 0, 0, 0], cfg.T9start, { eps: EPS0, e8: E8_0, f: 1 }); }

  /* Advance the composition by dt with frozen coefficients. Carbon is integrated exactly,
   * oxygen implicitly, and helium follows from mass conservation, so nothing goes negative. */
  function update(Y, k, dt) {
    const ea = Math.exp(-k.a * dt);
    const c = k.a * dt > 1e-9 ? Y[1] * ea + k.r1 / k.a * (1 - ea) : Y[1] + k.r1 * dt;
    const o = (Y[2] + dt * k.a * 0.5 * (Y[1] + c)) / (1 + k.b * dt);
    const ne = Y[3] + dt * k.b * 0.5 * (Y[2] + o);
    const nf = ne - Y[3], of = o - Y[2] + nf, cf = c - Y[1] + of;   // ²⁰Ne, ¹⁶O, ¹²C made this step
    return { Y: [Y[0] - 3 * cf - of - nf, c, o, ne], made: [cf, of, nf] };
  }

  class HeliumCore {
    /* opts.shift: Hoyle-state shift in keV; opts.f: α/α₀ */
    constructor(opts = {}) {
      if (cfg.epsReq == null) calibrate();
      const f = opts.f ?? 1, shift = opts.shift ?? 0;
      this.p = { f, eps: EPS0 + QEM_EPS * (f - 1) + shift, e8: E8_0 + QEM_E8 * (f - 1) };
      this.valid = this.p.e8 > 2 && this.p.eps - this.p.e8 > 25;   // outside this, ⁸Be is bound or the resonance is gone
      this.Y = [0.25, 0, 0, 0];                                     // mol/g: ⁴He, ¹²C, ¹⁶O, ²⁰Ne
      this.made = [0, 0, 0];                                        // cumulative mol/g of ¹²C, ¹⁶O, ²⁰Ne formed
      this.t = 0; this.frame = 0; this.done = false; this.stalled = false;
      this.T9 = this.valid ? solveT(this.Y, this.p) : null;
      if (this.T9 == null) { this.done = true; this.stalled = true; }
      this.hist = [];
      this.record();
    }
    X() { const Y = this.Y; return [4 * Y[0], 12 * Y[1], 16 * Y[2], 20 * Y[3]]; }
    record() { const X = this.X(); this.hist.push([this.t / SEC_PER_MYR, X[0], X[1], X[2], X[3], this.T9 || 0]); }
    finished() { return this.done; }
    /* Integrate for dtTotal seconds with adaptive midpoint steps. */
    advance(dtTotal, maxSteps = 400) {
      let left = dtTotal, guard = 0;
      while (left > 0 && !this.done && guard++ < maxSteps) {
        const T1 = solveT(this.Y, this.p);
        if (T1 == null) { this.done = true; this.stalled = true; break; }
        const k1 = coeffs(this.Y, T1, this.p);
        const burn = 3 * k1.r1 + k1.a * this.Y[1] + k1.b * this.Y[2];      // helium use, mol g⁻¹ s⁻¹
        // use at most ~3% of the original helium, and at most 20% of what is left, per step
        let dt = Math.min(left, Math.min(0.0025 + 0.02 * this.Y[0], 0.2 * this.Y[0]) / Math.max(burn, 1e-300));
        let out = null;
        for (let tries = 0; tries < 12; tries++) {
          const mid = update(this.Y, k1, 0.5 * dt).Y;
          const Tm = mid[0] > 0 ? solveT(mid, this.p) : null;
          if (Tm != null) {
            out = update(this.Y, coeffs(mid, Tm, this.p), dt);
            out.T9 = Tm;
            if (out.Y[0] >= 0) break;
          }
          dt *= 0.5;
        }
        if (!out || out.Y[0] < 0) { this.done = true; break; }
        this.Y = out.Y;
        for (let i = 0; i < 3; i++) this.made[i] += out.made[i];
        this.T9 = out.T9;
        this.t += dt; left -= dt;
        if (4 * this.Y[0] < cfg.stopX4) this.done = true;
      }
    }
    step() {
      if (this.done) return;
      this.advance(HeliumCore.frameDt());
      this.frame++;
      this.record();
    }
    runToEnd() { let n = 0; while (!this.done && n++ < 4000) this.step(); return this; }
    static frameDt() {
      if (HeliumCore._fdt == null) {
        HeliumCore._fdt = 1e18;              // provisional, so the reference run below can be built
        const ref = new HeliumCore({});
        ref.advance(1e20, 1e5);              // our universe, run to helium exhaustion in one go
        HeliumCore._tOurs = ref.t;
        HeliumCore._fdt = ref.t / cfg.frames;
      }
      return HeliumCore._fdt;
    }
  }

  /* Final composition for a given setting, without animation. */
  function finalComposition(opts) {
    const c = new HeliumCore(opts);
    if (!c.valid) return { valid: false };
    if (!c.stalled) c.advance(1e20, 1e5);
    const X = c.X();
    return { valid: true, stalled: c.stalled, He: X[0], C: X[1], O: X[2], Ne: X[3], T9start: c.hist[0][5], T9end: c.T9, Myr: c.t / SEC_PER_MYR };
  }
  let oursCache = null;
  const ours = () => oursCache || (oursCache = finalComposition({}));

  FTL.helium = {
    HeliumCore, finalComposition, ours, cfg, lam3a, lamCa, lamOa,
    EPS0, E8_0, QEM_EPS, QEM_E8, KT_KEV, SEC_PER_MYR,
    tOursMyr: () => { HeliumCore.frameDt(); return HeliumCore._tOurs / SEC_PER_MYR; },
  };
})(typeof window !== 'undefined' ? window : globalThis);
