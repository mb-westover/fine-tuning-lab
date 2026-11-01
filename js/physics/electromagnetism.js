/* Electromagnetism bench: what a different fine-structure constant α = f·α₀ does to matter.
 *
 * 1. Hydrogen. The neutron–proton mass difference (1.293 MeV) is the sum of a quark-mass part
 *    and an electromagnetic part that makes the proton heavier. Estimates of the EM part range
 *    from 0.58 MeV (Gasser, Leutwyler & Rusetsky 2021) to 1.04 MeV (Thomas, Wang & Young 2015);
 *    0.80 MeV is used here. If the gap drops below the electron mass (0.511 MeV), a hydrogen
 *    atom's proton swallows its electron (p + e⁻ → n + ν): no hydrogen, so no water.
 * 2. Big Bang helium. The same gap sets how many neutrons survive the first minutes.
 * 3. Carbon and oxygen from stars, via the Hoyle state (see helium-burning.js).
 * 4. Which nuclei hold together. Coulomb repulsion grows with α. Each element is represented
 *    by one isotope; its alpha-decay energy shifts with the extra Coulomb energy (liquid-drop
 *    model), and its half-life follows from Gamow tunnelling through the Coulomb barrier,
 *    pinned to the measured half-life or Q value in our universe where one is known.
 *    Heavy elements also face spontaneous fission once their fissility grows.
 * Everything here is a toy: the heavy-element cut-offs are uncertain by several percent in α. */
(function (root) {
  'use strict';
  const FTL = root.FTL = root.FTL || {};

  const ME = 0.51100, DNP = 1.29333, DEM = 0.80;            // MeV
  const B_D = 2.2246;                                       // deuteron binding, MeV
  const AV = 15.75, AS = 17.8, AC = 0.711, AA = 23.7;        // liquid-drop coefficients, MeV
  const DECAY_YR = 1e10;                                    // time elements have had to decay
  const STABLE_LOG_YR = 12;                                 // "stable" = half-life over 10¹² years
  const LOG_S_PER_YR = 7.4991;

  const SYM = 'H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og'.split(' ');
  const NAME = ('Hydrogen Helium Lithium Beryllium Boron Carbon Nitrogen Oxygen Fluorine Neon Sodium Magnesium Aluminum Silicon Phosphorus Sulfur Chlorine Argon Potassium Calcium Scandium Titanium Vanadium Chromium Manganese Iron Cobalt Nickel Copper Zinc Gallium Germanium Arsenic Selenium Bromine Krypton Rubidium Strontium Yttrium Zirconium Niobium Molybdenum Technetium Ruthenium Rhodium Palladium Silver Cadmium Indium Tin Antimony Tellurium Iodine Xenon Cesium Barium Lanthanum Cerium Praseodymium Neodymium Promethium Samarium Europium Gadolinium Terbium Dysprosium Holmium Erbium Thulium Ytterbium Lutetium Hafnium Tantalum Tungsten Rhenium Osmium Iridium Platinum Gold Mercury Thallium Lead Bismuth Polonium Astatine Radon Francium Radium Actinium Thorium Protactinium Uranium Neptunium Plutonium Americium Curium Berkelium Californium Einsteinium Fermium Mendelevium Nobelium Lawrencium Rutherfordium Dubnium Seaborgium Bohrium Hassium Meitnerium Darmstadtium Roentgenium Copernicium Nihonium Flerovium Moscovium Livermorium Tennessine Oganesson').split(' ');

  /* Representative isotope (mass number) for Z = 1…100. */
  const A_REP = [0, 1, 4, 7, 9, 11, 12, 14, 16, 19, 20, 23, 24, 27, 28, 31, 32, 35, 36, 39, 40, 45, 48, 51, 52, 55, 56, 59, 58, 63, 64,
    69, 74, 75, 80, 79, 84, 85, 88, 89, 90, 93, 98, 98, 102, 103, 106, 107, 114, 115, 120, 121, 130, 127, 132, 133, 138, 139, 140, 141, 144,
    145, 152, 153, 158, 159, 164, 165, 166, 169, 174, 175, 180, 181, 184, 187, 192, 193, 195, 197, 202, 205, 208, 209, 209, 210, 222, 223, 226, 227, 232,
    231, 238, 237, 244, 243, 247, 247, 251, 252, 257];

  /* Approximate solar-system abundances, log ε (H = 12), after Asplund et al. (2009); null = none survives today.
   * For elements with no survivors, PRODUCED_NOMINAL gives a rough amount made by stars before it decays. */
  const LOGEPS = [null, 12.00, 10.93, 3.26, 1.30, 2.79, 8.43, 7.83, 8.69, 4.42, 7.93, 6.24, 7.60, 6.45, 7.51, 5.41, 7.12, 5.50, 6.40, 5.03, 6.34,
    3.15, 4.95, 3.93, 5.64, 5.43, 7.50, 4.99, 6.22, 4.19, 4.56, 3.04, 3.65, 2.30, 3.34, 2.54, 3.25, 2.52, 2.87, 2.21, 2.58,
    1.46, 1.88, null, 1.75, 0.91, 1.57, 0.94, 1.71, 0.80, 2.04, 1.01, 2.18, 1.55, 2.24, 1.08, 2.18, 1.10, 1.58, 0.72, 1.42,
    null, 0.96, 0.52, 1.07, 0.30, 1.10, 0.48, 0.92, 0.10, 0.84, 0.10, 0.85, -0.12, 0.85, 0.26, 1.40, 1.38, 1.62, 0.92, 1.17,
    0.90, 1.75, 0.65, null, null, null, null, null, null, 0.02, null, -0.54, null, null, null, null, null, null, null, null];
  const PRODUCED_NOMINAL = { 43: 1.4, 61: 1.0, 84: 0.5, 85: 0.2, 86: 0.4, 87: 0.0, 88: 0.4, 89: 0.0, 91: -0.3, 93: -0.4, 94: -0.2, 95: -0.7, 96: -0.6, 97: -1.0, 98: -1.0, 99: -1.4, 100: -1.6 };

  /* Measured alpha-decay energies Q (MeV) of the representative isotopes; negative = bound against alpha emission.
   * Light nuclei use their real alpha-separation energies (C-12 → 3 ⁴He, Li-7 → ⁴He + ³H, Be-9 → 2 ⁴He + n).
   * Between zinc and lead, Q is interpolated between the anchors (an element survives through its most
   * stable isotope, so this errs on the side of stability). */
  const Q_REAL = { 3: -2.467, 4: -1.573, 5: -8.664, 6: -7.275, 7: -11.612, 8: -7.162, 9: -4.013, 10: -4.730, 11: -10.467, 12: -9.316, 13: -10.092,
    14: -9.984, 15: -9.669, 16: -6.948, 17: -6.997, 18: -6.639, 19: -7.218, 20: -7.040, 21: -7.936, 22: -9.443, 23: -10.29, 24: -9.35, 25: -7.933,
    26: -7.614, 27: -6.942, 28: -6.404, 29: -5.780, 30: -3.952, 82: -0.517, 83: 3.137, 84: 4.979, 85: 5.631, 86: 5.590, 88: 4.871,
    90: 4.082, 91: 5.150, 92: 4.270, 93: 4.958, 94: 4.666, 95: 5.439, 96: 5.352, 97: 5.889, 98: 6.176, 99: 6.760, 100: 6.864 };
  /* Measured alpha half-lives in our universe (years). */
  const T_REAL = { 83: 2.01e19, 84: 124, 85: 9.2e-4, 86: 0.010468, 88: 1600, 90: 1.405e10, 91: 3.276e4, 92: 4.468e9,
    93: 2.144e6, 94: 8.13e7, 95: 7370, 96: 1.56e7, 97: 1380, 98: 898, 99: 1.29, 100: 0.2751 };
  /* Beta-unstable elements (no stable isotope for reasons this model does not touch). Half-life in years. */
  const BETA = { 43: 4.2e6, 61: 17.7, 87: 4.2e-5, 89: 21.77 };
  const Q_ANCHORS = Object.keys(Q_REAL).map(Number).filter(z => z >= 30 && z <= 82).sort((a, b) => a - b);

  const ec = (Z, A) => Z > 1 ? AC * Z * (Z - 1) / Math.cbrt(A) : 0;     // liquid-drop Coulomb energy at α₀
  function bLD(Z, A, f) { return AV * A - AS * Math.pow(A, 2 / 3) - f * ec(Z, A) - AA * (A - 2 * Z) * (A - 2 * Z) / A; }
  function aValley(Z, f) { let A = 2 * Z; for (let i = 0; i < 40; i++) A = Z * (2 + f * AC / (2 * AA) * Math.pow(A, 2 / 3)); return A; }
  function qLD(Z, A, f) { return bLD(Z - 2, A - 4, f) + 28.296 - (f - 1) * ec(2, 4) - bLD(Z, A, f); }

  function qAt1(Z) {
    if (Q_REAL[Z] != null) return Q_REAL[Z];
    let lo = Q_ANCHORS[0], hi = Q_ANCHORS[Q_ANCHORS.length - 1];
    for (const z of Q_ANCHORS) { if (z <= Z) lo = z; if (z >= Z) { hi = z; break; } }
    if (lo === hi) return Q_REAL[lo];
    return Q_REAL[lo] + (Q_REAL[hi] - Q_REAL[lo]) * (Z - lo) / (hi - lo);
  }
  function qAt(Z, f) {
    const A = A_REP[Z], q1 = qAt1(Z);
    if (Z === 6) return q1 + (f - 1) * (ec(6, 12) - 3 * ec(2, 4));          // carbon-12 → three ⁴He
    if (Z < 30) return q1 + (f - 1) * (ec(Z, A) - ec(Z - 2, A - 4) - ec(2, 4));
    return q1 + qLD(Z, aValley(Z, f), f) - qLD(Z, aValley(Z, 1), 1);          // heavier: liquid-drop shift incl. the neutron-rich drift
  }
  /* Gamow tunnelling estimate of the alpha half-life, log10 seconds. */
  function logTalpha(Z, A, Q, f) {
    if (!(Q > 0)) return Infinity;
    const Zd = Z - 2, Ad = A - 4;
    const R = 1.2 * (Math.cbrt(Ad) + Math.cbrt(4));
    const x = Q / (1.43996 * 2 * Zd * f / R);
    if (x >= 1) return -21.05;
    const eta = 2 * Zd * f / 137.036 * Math.sqrt((Ad * 4 / A * 931.494) / (2 * Q));
    const g = (2 / Math.PI) * (Math.acos(Math.sqrt(x)) - Math.sqrt(x * (1 - x)));
    return 0.4343 * 2 * Math.PI * eta * g - 21.05;
  }
  /* Spontaneous-fission half-life (log10 years) from the liquid-drop fissility, fitted to U-238 and Cf/Fm. */
  const logTsf = (Z, A, f) => 15.9 - 274 * (f * 0.01997 * Z * Z / A - 0.71);

  function stableInOurs(Z) { return Z <= 83 && !BETA[Z]; }

  /* Half-life in years (Infinity = stable) of element Z when α = f·α₀; null = never made in nature. */
  function halfLife(Z, f, hydrogenStable) {
    if (Z === 1) return hydrogenStable ? Infinity : 0;
    if (Z === 2) return Infinity;
    if (Z > 100) return null;
    if (BETA[Z]) return BETA[Z];
    const A = A_REP[Z], q1 = qAt1(Z), q = qAt(Z, f);
    let la;   // log10 years
    if (T_REAL[Z]) la = Math.log10(T_REAL[Z]) + (logTalpha(Z, A, q, f) - logTalpha(Z, A, q1, 1));
    else {
      la = logTalpha(Z, A, q, f) - LOG_S_PER_YR;
      const l1 = logTalpha(Z, A, q1, 1) - LOG_S_PER_YR;
      if (stableInOurs(Z) && l1 < 18) la += 18 - l1;    // keep every element that is stable here stable at f = 1
    }
    if (Number.isNaN(la)) la = Infinity;
    let inv = la === Infinity ? 0 : Math.pow(10, -la);
    if (Z >= 70 && Z <= 92) {
      let ls = logTsf(Z, A, f);
      const ls1 = logTsf(Z, A, 1);
      if (Z <= 83 && ls1 < 18) ls += 18 - ls1;
      inv += Math.pow(10, -ls);
    }
    return inv === 0 ? Infinity : 1 / inv;
  }

  function neutronDecayPhaseSpace(D) {
    const q = D / ME; if (q <= 1) return 0;
    const s = Math.sqrt(q * q - 1);
    return s * (2 * q ** 4 - 9 * q * q - 8) / 60 + q * Math.acosh(q) / 4;
  }
  /* Helium mass fraction from the Big Bang: neutron/proton ratio freezes out near 0.75 MeV, then neutrons decay for ~200 s. */
  function heliumFraction(D) {
    const np0 = Math.exp(-D / 0.75);
    const rate = neutronDecayPhaseSpace(D) / neutronDecayPhaseSpace(DNP) / 879.4;
    const np = Math.min(1, np0 * Math.exp(-200 * rate));
    return Math.min(1, 2 * np / (1 + np));
  }

  const clampMult = m => Math.min(4, Math.max(1e-4, m));

  /* Everything the bench needs for one value of f = α/α₀. */
  function analyze(f) {
    const dnp = DNP + DEM * (1 - f);
    const hydrogenStable = dnp > ME;
    const fH = 1 + (DNP - ME) / DEM;
    const qpp = B_D - dnp - ME;                       // energy released by p + p → d + e⁺ + ν
    const XHe = heliumFraction(dnp), XHe0 = heliumFraction(DNP);

    const he = FTL.helium;
    const ours = he.ours();
    const hc = he.finalComposition({ f });
    const e8 = he.E8_0 + he.QEM_E8 * (f - 1);
    const hoyle = {
      shiftKeV: he.QEM_EPS * (f - 1), e8,
      be8Bound: e8 <= 0, valid: hc.valid && !hc.stalled,
      C: hc.valid ? hc.C : null, O: hc.valid ? hc.O : null, Ne: hc.valid ? hc.Ne : null,
    };
    // Outside the model: below f ≈ 0.967 ⁸Be is bound (unknown territory); far above, helium can't burn on the Hoyle resonance.
    hoyle.unknown = !hoyle.valid && f < 1;
    const fallback = hoyle.unknown ? 1 : 1e-4;
    hoyle.mC = hoyle.valid ? clampMult(hc.C / ours.C) : fallback;
    hoyle.mO = hoyle.valid ? clampMult(hc.O / ours.O) : fallback;
    const mCO = hoyle.valid ? clampMult((hc.C + hc.O) / (ours.C + ours.O)) : fallback;

    const els = [];
    let heaviestStable = 0;
    for (let Z = 1; Z <= 118; Z++) {
      const T = halfLife(Z, f, hydrogenStable);
      const T1 = halfLife(Z, 1, true);
      let produced = null;
      if (Z <= 100) {
        if (Z === 1) produced = 12 + Math.log10((1 - XHe) / (1 - XHe0));
        else if (Z === 2) produced = 12 + Math.log10((XHe / 4) / (1 - XHe0));
        else {
          let base = LOGEPS[Z];
          if (Z === 90 || Z === 92) base -= Math.log10(Math.exp(-Math.LN2 * DECAY_YR / T1));   // undo our own decay
          if (base == null) base = PRODUCED_NOMINAL[Z];
          let m = 1;
          if (Z === 6) m = hoyle.mC;
          else if (Z === 7 || Z === 9) m = mCO;
          else if (Z === 8) m = hoyle.mO;
          else if (Z >= 10 && Z <= 13) m = hoyle.mC;   // made by burning carbon
          else if (Z >= 14) m = hoyle.mO;              // made by burning oxygen and beyond
          produced = base + Math.log10(m);
        }
      }
      const survive = T == null ? 0 : T === Infinity ? 1 : Math.exp(-Math.LN2 * DECAY_YR / T);
      const final = produced == null || survive < 1e-6 ? null : produced + Math.log10(survive);
      const logT = T == null ? null : T === Infinity ? Infinity : Math.log10(Math.max(T, 1e-30));
      const isStable = T === Infinity || (logT != null && logT >= STABLE_LOG_YR);
      if (isStable && Z <= 100 && Z > heaviestStable) heaviestStable = Z;
      els.push({ Z, sym: SYM[Z - 1], name: NAME[Z - 1], produced, final, halfLifeYr: T, logT, stable: isStable,
        inOurs: LOGEPS[Z] != null, surviveFrac: survive });
    }
    const lost = els.filter(e => e.inOurs && e.final == null).map(e => e.Z);
    const gained = els.filter(e => !e.inOurs && e.final != null).map(e => e.Z);
    const by = Z => els[Z - 1];
    return {
      f, alphaInv: 137.036 / f, dnp, hydrogenStable, fH, qpp, XHe, XHe0, hoyle, elements: els, heaviestStable, lost, gained,
      carbonStable: by(6).stable, oxygenStable: by(8).stable, ironStable: by(26).stable,
    };
  }

  FTL.em = { analyze, halfLife, qAt, heliumFraction, SYM, NAME, DEM, DNP, ME, DECAY_YR };
})(typeof window !== 'undefined' ? window : globalThis);
