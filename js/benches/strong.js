/* Strong-force bench: drawing and wiring. Physics lives in js/physics/bbn.js. */
(function () {
  'use strict';
  const { bbn, ui } = FTL;
  const { C, GHOST, GRID, MONO, line, setVerdict, setReadouts } = ui;
  const COL = { p: C.ember, n: C.slate, d: C.teal, pp: C.violet, he: C.gold };

  function drawPlasma(view, P) {
    const { ctx, w, h } = view; const T = P.T();
    const heat = Math.min(1, Math.max(0, (Math.log10(T) + 1.6) / 1.6));   // 1 at 1 MeV, 0 at ~0.025 MeV
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * .75);
    g.addColorStop(0, `rgb(${Math.round(10 + heat * 80)},${Math.round(12 + heat * 34)},${Math.round(26 + heat * 40)})`);
    g.addColorStop(1, `rgb(${Math.round(7 + heat * 40)},${Math.round(9 + heat * 14)},${Math.round(20 + heat * 24)})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const S = Math.min(w, h), pad = S * 0.03, box = S - 2 * pad, ox = (w - box) / 2, oy = (h - box) / 2, rad = Math.max(2.2, S / 150);
    const dot = (x, y, c, rr) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, rr, 0, 7); ctx.fill(); };
    const ring = (x, y, c, rr, lw) => { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(x, y, rr, 0, 7); ctx.stroke(); };
    for (const q of P.ps) {
      const x = ox + q.x * box, y = oy + q.y * box;
      if (q.k === 'p' || q.k === 'n') dot(x, y, COL[q.k], rad);
      else if (q.k === 'd') { dot(x - rad * .6, y, C.ember, rad * .95); dot(x + rad * .6, y, C.slate, rad * .95); ring(x, y, C.teal, rad * 1.9, 1.3); }
      else if (q.k === 'pp') { dot(x - rad * .6, y, C.ember, rad * .95); dot(x + rad * .6, y, C.ember, rad * .95); ring(x, y, C.violet, rad * 1.9, 1.5); }
      else if (q.k === 'he') { const o = rad * .62; dot(x - o, y - o, C.ember, rad * .85); dot(x + o, y + o, C.ember, rad * .85); dot(x + o, y - o, C.slate, rad * .85); dot(x - o, y + o, C.slate, rad * .85); ring(x, y, C.gold, rad * 2.3, 1.6); }
    }
    for (const f of P.flashes) {
      const x = ox + f.x * box, y = oy + f.y * box, k = f.age / 22;
      ctx.globalAlpha = 1 - k; ring(x, y, COL[f.c], rad * (2 + k * 7), 2); ctx.globalAlpha = 1;
    }
  }
  function drawChart(view, P, ghost) {
    const { ctx, w, h } = view; ctx.clearRect(0, 0, w, h);
    const L = 40, R = 16, T = 10, B = 24, XM = Math.log10(bbn.T_STOP);
    const X = x => L + x / XM * (w - L - R), Y = y => T + (1 - y) * (h - T - B);
    ctx.font = '11px ' + MONO; ctx.strokeStyle = GRID; ctx.fillStyle = C.faint; ctx.lineWidth = 1;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    [0, .25, .5, .75, 1].forEach(v => { ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(w - R, Y(v)); ctx.stroke(); ctx.fillText(Math.round(v * 100) + '%', L - 6, Y(v)); });
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    [[1, '1 s'], [10, '10 s'], [60, '1 min'], [180, '3 min'], [600, '10 min'], [1800, '30 min']].forEach(([s, lab]) => { const x = X(Math.log10(s)); ctx.beginPath(); ctx.moveTo(x, T); ctx.lineTo(x, h - B); ctx.stroke(); ctx.fillText(lab, x, h - B + 6); });
    const mark = (tt, lab, col) => {
      if (!(tt < bbn.T_STOP)) return;
      const x = X(Math.log10(Math.max(1, tt))), right = x > w * .7;
      ctx.setLineDash([2, 4]); ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(x, T); ctx.lineTo(x, h - B); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = col; ctx.textAlign = right ? 'right' : 'left'; ctx.textBaseline = 'top'; ctx.fillText(lab, x + (right ? -5 : 5), T + 2);
    };
    mark(P.tbn, 'deuterium survives', C.teal);
    mark(P.tpp, 'diprotons survive', C.violet);
    line(ctx, ghost, X, Y, 0, 1, GHOST, 1.4, [5, 4]); line(ctx, ghost, X, Y, 0, 2, GHOST, 1.4, [5, 4]);
    line(ctx, P.hist, X, Y, 0, 3, C.slate, 2); line(ctx, P.hist, X, Y, 0, 4, C.teal, 2);
    if (P.hist.some(p => p[5] > 0)) line(ctx, P.hist, X, Y, 0, 5, C.violet, 2);
    line(ctx, P.hist, X, Y, 0, 1, C.ember, 2.4); line(ctx, P.hist, X, Y, 0, 2, C.gold, 2.4);
  }
  function fmtTime(s) { if (s < 60) return s.toFixed(s < 10 ? 1 : 0) + ' s'; const m = Math.floor(s / 60), r = Math.round(s % 60); return `${m} min ${String(r).padStart(2, '0')} s`; }

  let ghost = null;
  FTL.makeBench('strong', {
    initial: 0,
    presets: [{ v: -8, label: 'Much weaker (−8%)' }, { v: -3, label: 'Slightly weaker (−3%)' }, { v: 0, label: 'Ours' }, { v: 3, label: 'Slightly stronger (+3%)' }, { v: 8, label: 'Much stronger (+8%)' }],
    fmt: v => v === 0 ? 'ours' : (v > 0 ? '+' : '−') + Math.abs(v).toFixed(1).replace(/\.0$/, '') + '%',
    create(v) { if (!ghost) ghost = new bbn.Plasma(0).runToEnd().hist; return new bbn.Plasma(v); },
    draw(b) {
      const P = b.sim; drawPlasma(b.canvases.view, P); drawChart(b.canvases.chart, P, ghost);
      const f = P.fractions(), T = P.T(), pct = x => Math.round(x * 100) + '%';
      setReadouts(b, [['Time', fmtTime(P.t)], ['Temperature', (T * 11.6).toFixed(T < .09 ? 2 : 1) + ' billion K'], ['Hydrogen (mass)', pct(f.p)], ['Helium-4 (mass)', pct(f.he)]]);
      b.el.big.textContent = '';
      if (!P.finished()) {
        if (P.Bd === 0) setVerdict(b, '', 'Deuterium is not bound at this strength. Watch: protons and neutrons pass through each other without sticking.');
        else if (P.t < P.tbn) setVerdict(b, '', 'Too hot: any deuterium that forms is instantly blasted apart by high-energy light. Waiting for the plasma to cool…');
        else setVerdict(b, '', P.kpp > 0 && P.t >= P.tpp ? 'Diprotons are stable here: proton pairs are binding directly, decaying to deuterium and burning on to helium.' : 'Deuterium now survives. Neutrons are being locked into deuterium and then helium.');
        return;
      }
      if (P.Bd === 0) { b.el.big.textContent = 'NOTHING STICKS'; setVerdict(b, 'bad', 'No stable deuterium. Neutrons never bind and simply decay, leaving a universe of pure hydrogen. Worse, the first step of the Sun\'s fusion chain (proton + proton → deuterium) now has nothing to make, so stars cannot burn hydrogen the way ours do.'); }
      else if (P.tbn >= bbn.T_STOP) setVerdict(b, 'good', 'Deuterium is bound, but so weakly that it is blasted apart until the universe is too cool and thin for fusion. Almost no helium forms in the Big Bang. Stars can still burn hydrogen later, so this universe survives this test.');
      else if (P.kpp > 0 && P.tpp < bbn.T_STOP && f.p < 0.6) { b.el.big.textContent = f.p < 0.3 ? 'HYDROGEN BURNED' : ''; setVerdict(b, 'bad', `Bound diprotons let protons fuse directly. Only ${pct(f.p)} of the mass is left as hydrogen (ours: ~75%). Less hydrogen means less water and less fuel for long-lived, slow-burning stars like the Sun.`); }
      else setVerdict(b, 'good', `About ${pct(f.p)} hydrogen and ${pct(f.he)} helium by mass, close to what astronomers measure (≈75% / 25%). Plenty of fuel for long-lived stars, and hydrogen for water.`);
    },
  });
})();
