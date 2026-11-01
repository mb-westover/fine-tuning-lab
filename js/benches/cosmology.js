/* Gravity and dark-energy benches: drawing and wiring. Physics lives in js/physics/cosmology.js. */
(function () {
  'use strict';
  const { cosmo, util, ui } = FTL;
  const { C, GHOST, GRID, MONO, fmtAgeMyr, fmtBig, line, setVerdict, setReadouts, setMilestones } = ui;
  const { UNIT_MYR } = cosmo;

  /* Displacement field for the cosmic web (Zel'dovich approximation): particles start on a jittered
   * grid and move along a fixed random displacement field scaled by the growth factor D. */
  const FN = 56, NP = FN * FN, GG = 40;
  const field = (() => {
    const r = util.mulberry32(20261018), modes = [];
    for (let i = -8; i <= 8; i++) for (let j = 0; j <= 8; j++) {
      if (j === 0 && i <= 0) continue;
      const k2 = i * i + j * j; if (k2 > 64) continue;
      modes.push([i, j, Math.pow(k2, -1.35) * util.gauss(r), r() * Math.PI * 2]);
    }
    const qx = new Float32Array(NP), qy = new Float32Array(NP), px = new Float32Array(NP), py = new Float32Array(NP);
    let ss = 0; const TP = 2 * Math.PI;
    for (let a = 0; a < FN; a++) for (let b = 0; b < FN; b++) {
      const n = a * FN + b, x = (a + .5 + (r() - .5) * .35) / FN, y = (b + .5 + (r() - .5) * .35) / FN;
      qx[n] = x; qy[n] = y;
      let sx = 0, sy = 0, dv = 0;
      for (const [i, j, amp, ph] of modes) {
        const arg = TP * (i * x + j * y) + ph, sn = Math.sin(arg), cs = Math.cos(arg);
        sx += amp * TP * i * sn; sy += amp * TP * j * sn; dv += amp * TP * TP * (i * i + j * j) * cs;
      }
      px[n] = sx; py[n] = sy; ss += dv * dv;
    }
    const k = 1 / Math.sqrt(ss / NP);
    for (let n = 0; n < NP; n++) { px[n] *= k; py[n] *= k; }
    return { qx, qy, px, py };
  })();

  function drawUniverse(view, u) {
    const { ctx, w, h } = view;
    const a = u.s[0], D = u.s[2];
    const frac = u.collapsing ? Math.max(0, a / u.amax) : 1;
    const heat = u.collapsing ? Math.min(1, Math.max(0, (0.55 - frac) / 0.5)) : 0;
    ctx.fillStyle = `rgb(${Math.round(7 + heat * 150)},${Math.round(9 + heat * 40)},${Math.round(20 + heat * 10)})`;
    ctx.fillRect(0, 0, w, h);
    const size = Math.min(w, h) * Math.max(frac, 0.03), ox = (w - size) / 2, oy = (h - size) / 2;
    const Dv = Math.min(D, 1.5);
    const counts = new Uint16Array(GG * GG), xs = new Float32Array(NP), ys = new Float32Array(NP);
    for (let n = 0; n < NP; n++) {
      let x = field.qx[n] + Dv * field.px[n], y = field.qy[n] + Dv * field.py[n];
      x -= Math.floor(x); y -= Math.floor(y); xs[n] = x; ys[n] = y;
      counts[Math.min(GG - 1, (x * GG) | 0) * GG + Math.min(GG - 1, (y * GG) | 0)]++;
    }
    if (u.collapsing && frac < 1) { ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.strokeRect(ox + .5, oy + .5, size - 1, size - 1); }
    const ps = Math.max(1.1, size / 360);
    ctx.fillStyle = heat > 0 ? `rgba(255,${Math.round(200 - heat * 90)},${Math.round(170 - heat * 120)},0.7)` : 'rgba(150,170,225,0.62)';
    for (let n = 0; n < NP; n++) ctx.fillRect(ox + xs[n] * size - ps / 2, oy + ys[n] * size - ps / 2, ps, ps);
    if (heat < 0.6) {   // stars glow where matter has piled up
      ctx.globalCompositeOperation = 'lighter';
      const cell = size / GG;
      for (let i = 0; i < GG; i++) for (let j = 0; j < GG; j++) {
        const c = counts[i * GG + j]; if (c < 7) continue;
        const s = Math.min(1, (c - 6) / 10), cx = ox + (i + .5) * cell, cy = oy + (j + .5) * cell, R = cell * (1.2 + 2.2 * s);
        const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
        gr.addColorStop(0, `rgba(255,226,160,${0.55 + 0.45 * s})`); gr.addColorStop(.25, `rgba(241,181,77,${0.35 * s + 0.15})`); gr.addColorStop(1, 'rgba(241,181,77,0)');
        ctx.fillStyle = gr; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    if (u.done === 'crunch') {
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) * .22, gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      gr.addColorStop(0, 'rgba(255,250,235,1)'); gr.addColorStop(.2, 'rgba(255,190,120,.8)'); gr.addColorStop(1, 'rgba(232,104,79,0)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
    }
  }

  const XMIN = -1, XMAX = 4.3;
  function drawChart(view, u, ghost) {
    const { ctx, w, h } = view; ctx.clearRect(0, 0, w, h);
    const L = 40, R = 78, T = 8, B = 24, YMIN = -3, YMAX = 4.3;
    const X = x => L + (x - XMIN) / (XMAX - XMIN) * (w - L - R), Y = y => T + (1 - (y - YMIN) / (YMAX - YMIN)) * (h - T - B);
    ctx.font = '11px ' + MONO; ctx.textBaseline = 'middle';
    ctx.strokeStyle = GRID; ctx.lineWidth = 1; ctx.fillStyle = C.faint;
    [[-2, '0.01'], [0, '1'], [2, '100'], [4, '10⁴']].forEach(([v, lab]) => { ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(w - R, Y(v)); ctx.stroke(); ctx.textAlign = 'right'; ctx.fillText(lab, L - 6, Y(v)); });
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    [[0, '1 Myr'], [1, '10 Myr'], [2, '100 Myr'], [3, '1 Gyr'], [4, '10 Gyr']].forEach(([v, lab]) => { ctx.beginPath(); ctx.moveTo(X(v), T); ctx.lineTo(X(v), h - B); ctx.stroke(); ctx.fillText(lab, X(v), h - B + 6); });
    ctx.setLineDash([2, 4]); ctx.strokeStyle = 'rgba(241,181,77,0.45)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(241,181,77,0.75)';
    [[Math.log10(.4), 'first stars'], [0, 'galaxies']].forEach(([v, lab], k) => { ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(w - R, Y(v)); ctx.stroke(); ctx.fillText(lab, w - R + 6, Y(v) + (k ? -6 : 7)); });
    ctx.setLineDash([]);
    ctx.save(); ctx.beginPath(); ctx.rect(L, T, w - L - R, h - T - B); ctx.clip();
    line(ctx, ghost, X, Y, 0, 1, GHOST, 1.4, [5, 4]); line(ctx, ghost, X, Y, 0, 2, GHOST, 1.4, [5, 4]);
    line(ctx, u.hist, X, Y, 0, 1, C.teal, 2.2); line(ctx, u.hist, X, Y, 0, 2, C.gold, 2.2);
    const last = u.hist[u.hist.length - 1];
    if (last) [[1, C.teal], [2, C.gold]].forEach(([i, c]) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(X(last[0]), Y(last[i]), 3.5, 0, 7); ctx.fill(); });
    ctx.restore();
    ctx.fillStyle = C.faint; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('age of universe →', L + 4, T + 2);
  }

  function cosmoBench(id, params, presets, fmt) {
    let ghost = null;
    const MS = [['stars', 'First stars light up'], ['gal', 'Galaxies assemble'], ['life', '5 Gyr of steady starlight']];
    return FTL.makeBench(id, {
      presets, fmt, initial: 0,
      create(v) {
        const { g, l } = params(v);
        if (!ghost) { const o = params(0); ghost = new cosmo.Universe(o.g, o.l).runToEnd().hist; }
        return new cosmo.Universe(g, l);
      },
      draw(b) {
        const u = b.sim;
        drawUniverse(b.canvases.view, u); drawChart(b.canvases.chart, u, ghost);
        const myr = u.t * UNIT_MYR;
        const state = u.done === 'crunch' ? 'Big Crunch' : u.collapsing ? 'Collapsing' : (u.s[1] / u.s[0] < 1e-9 ? 'Coasting' : 'Expanding');
        setReadouts(b, [['Age', fmtAgeMyr(myr)], ['Size vs. start', '×' + fmtBig(u.s[0])], ['Clumpiness', u.s[2] < 10 ? u.s[2].toFixed(3) : '≫1'], ['Universe is', state]]);
        setMilestones(b, MS.map(([k, lab]) => { const t = u.ms[k]; return [lab, t != null ? 'yes' : (u.done ? 'no' : ''), t != null ? fmtAgeMyr(t * UNIT_MYR) : '']; }));
        b.el.big.textContent = u.done === 'crunch' ? 'BIG CRUNCH' : (u.done && u.ms.stars == null ? 'NO STARS' : '');
        if (!u.done) { setVerdict(b, '', u.collapsing ? 'Gravity has won: the universe has stopped expanding and is falling back on itself.' : 'Running…'); return; }
        const age = fmtAgeMyr(myr), ms = u.ms;
        if (u.done === 'crunch') {
          if (ms.stars == null) setVerdict(b, 'bad', `Gravity won early. Expansion stalled at ${fmtBig(u.amax)}× the starting size and everything fell back into a Big Crunch at ${age}, before any star could form.`);
          else if (!ms.life) setVerdict(b, 'bad', `${ms.gal ? 'Galaxies' : 'A few stars'} formed, but the Big Crunch arrived at ${age}. Not enough time for generations of stars to forge heavy elements, build planets, and give life a chance.`);
          else setVerdict(b, 'good', `Galaxies formed and starlight lasted billions of years, but this universe ends in a Big Crunch at ${age}.`);
        } else if (ms.stars == null) setVerdict(b, 'bad', 'Expansion won. Matter thinned out faster than gravity could gather it. After 14 billion years the universe is a cold, nearly uniform gas with no stars at all.');
        else if (ms.gal == null) setVerdict(b, 'bad', `A few stars lit up in the very densest spots (by ${fmtAgeMyr(ms.stars * UNIT_MYR)}), but expansion froze structure before galaxies could assemble. Too few stars, and no galaxies to recycle their heavy elements.`);
        else setVerdict(b, 'good', `Galaxies by ${fmtAgeMyr(ms.gal * UNIT_MYR)}, then billions of years of steady starlight: room for heavy elements, planets, and life.${u.done === 'runaway' ? ' (Expansion has since run away, so no new structure will form.)' : ''}`);
      },
    });
  }

  const pctFmt = v => v === 0 ? 'ours' : (v > 0 ? '+' : '−') + Math.abs(v).toFixed(2).replace(/\.?0+$/, '') + '%';
  cosmoBench('gravity', cosmo.gravityParams,
    [{ v: -5, label: 'Much weaker (−5%)' }, { v: -1, label: 'Slightly weaker (−1%)' }, { v: 0, label: 'Ours' }, { v: 1, label: 'Slightly stronger (+1%)' }, { v: 5, label: 'Much stronger (+5%)' }],
    pctFmt);

  cosmoBench('lambda', cosmo.lambdaParams,
    [{ v: -3, label: 'Negative (−1,000×)' }, { v: 0, label: 'Ours' }, { v: 2, label: '100×' }, { v: 3.5, label: '3,000×' }, { v: 5, label: '100,000×' }],
    v => { const f = cosmo.lambdaFactor(v), m = Math.abs(f); return (f < 0 ? '−' : '') + (m < 10 ? m.toFixed(2) : Math.round(m).toLocaleString()) + '× ours'; });
})();
