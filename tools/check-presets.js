#!/usr/bin/env node
/* Runs every physics engine headless (no browser) and checks that each preset still produces the
 * outcome the page describes. Usage:  node tools/check-presets.js
 * Exits with code 1 if any expectation fails. */
'use strict';
const path = require('path');
const load = f => require(path.join(__dirname, '..', 'js', 'physics', f));
['core.js', 'cosmology.js', 'bbn.js', 'helium-burning.js', 'electromagnetism.js'].forEach(load);
const { cosmo, bbn, helium, em } = globalThis.FTL;

let failures = 0;
function check(label, ok, detail) {
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label.padEnd(34)} ${detail}`);
  if (!ok) failures++;
}
const myr = t => (t * cosmo.UNIT_MYR).toFixed(0) + ' Myr';
const ratio = (x, y) => { const m = x / y; return m >= 0.1 ? '×' + m.toFixed(2) : '1/' + Math.round(1 / m); };

/* ---- gravity and dark energy ---- */
function universe(params) { const p = params; return new cosmo.Universe(p.g, p.l).runToEnd(); }
function describe(u) {
  const ms = u.ms;
  return `${u.done.padEnd(8)} stars ${ms.stars ? myr(ms.stars) : '—'}, galaxies ${ms.gal ? myr(ms.gal) : '—'}, 5 Gyr of starlight ${ms.life ? 'yes' : 'no'}`;
}
console.log('\nGravity (percent change)');
for (const [v, expectLife] of [[-5, false], [-1, false], [0, true], [1, false], [5, false]]) {
  const u = universe(cosmo.gravityParams(v));
  check(`gravity ${v > 0 ? '+' : ''}${v}%`, !!u.ms.life === expectLife, describe(u));
}
console.log('\nDark energy (log10 of Λ/Λ₀; negative = negative Λ)');
for (const [v, expect] of [[-3, 'nolife'], [0, 'life'], [2, 'life'], [3.5, 'nogal'], [5, 'nostars']]) {
  const u = universe(cosmo.lambdaParams(v)), ms = u.ms;
  const got = ms.life ? 'life' : !ms.stars ? 'nostars' : !ms.gal ? 'nogal' : 'nolife';
  check(`Λ setting ${v}`, got === expect || (expect === 'nolife' && got !== 'life'), describe(u));
}

/* ---- strong force ---- */
console.log('\nStrong force (percent change): Big Bang mass fractions after 30 minutes');
for (const [v, test] of [[-8, f => f.he === 0], [-3, f => f.p > 0.7], [0, f => f.p > 0.7 && f.p < 0.8], [3, f => f.p > 0.7], [8, f => f.p < 0.3]]) {
  const P = new bbn.Plasma(v).runToEnd(), f = P.fractions();
  check(`strong ${v > 0 ? '+' : ''}${v}%`, test(f), `hydrogen ${(f.p * 100).toFixed(0)}%, helium ${(f.he * 100).toFixed(0)}%, deuterium ${(f.d * 100).toFixed(0)}%, diprotons ${(f.pp * 100).toFixed(0)}%`);
}

/* ---- Hoyle state ---- */
console.log('\nHoyle state (shift in keV): core composition at helium exhaustion');
const ours = helium.ours();
for (const [v, test] of [[-100, r => r.O / ours.O < 1 / 30], [-40, r => r.O / ours.O < 1 / 3 && r.O / ours.O > 1 / 30], [0, r => r.C > 0.15 && r.O > 0.6],
  [40, r => r.C / ours.C < 1 / 30], [100, r => r.C / ours.C < 1 / 30]]) {
  const r = helium.finalComposition({ shift: v });
  check(`Hoyle ${v > 0 ? '+' : ''}${v} keV`, test(r), `C ${(r.C * 100).toFixed(2)}% (${ratio(r.C, ours.C)}), O ${(r.O * 100).toFixed(2)}% (${ratio(r.O, ours.O)}), Ne ${(r.Ne * 100).toFixed(1)}%, T ${Math.round(r.T9start * 1000)}→${Math.round(r.T9end * 1000)} MK, ${r.Myr.toFixed(1)} Myr`);
}

/* ---- electromagnetism ---- */
console.log('\nElectromagnetism (α/α₀)');
for (const [f, test] of [
  [0.5, a => a.hydrogenStable && a.hoyle.unknown],
  [0.975, a => a.hydrogenStable && a.hoyle.mO < 1 / 30],
  [1, a => a.hydrogenStable && a.hoyle.mC === 1 && a.heaviestStable === 83 && a.lost.length === 0],
  [1.025, a => a.hydrogenStable && a.hoyle.mC < 1 / 30],
  [2, a => !a.hydrogenStable && !a.ironStable],
]) {
  const a = em.analyze(f), h = a.hoyle;
  const hs = a.elements[a.heaviestStable - 1].sym;
  check(`α ×${f}`, test(a), `hydrogen ${a.hydrogenStable ? 'stable' : 'UNSTABLE'} (n−p ${a.dnp.toFixed(2)} MeV), Hoyle ${h.unknown ? '⁸Be bound' : (h.shiftKeV >= 0 ? '+' : '') + Math.round(h.shiftKeV) + ' keV, C ' + ratio(h.mC, 1) + ', O ' + ratio(h.mO, 1)}, heaviest stable ${hs}, lost ${a.lost.length}, new ${a.gained.length}`);
}

console.log(failures ? `\n${failures} check(s) failed.` : '\nAll presets behave as described.');
process.exit(failures ? 1 : 0);
