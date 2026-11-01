/* Hoyle-state bench: a red giant's helium-burning core. Physics lives in js/physics/helium-burning.js. */
(function () {
  'use strict';
  const { helium, util, ui } = FTL;
  const { C, GHOST, GRID, MONO, line, setVerdict, setReadouts, fmtFactor, pctSmart } = ui;
  const N0 = 210;                 // helium nuclei drawn at the start (a sample, not to scale)
  const E3 = 7.2747;              // MeV: three ⁴He above the carbon-12 ground state
  const BAD = 1 / 30, WARN = 1 / 3;
  const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
  const sup = s => String(s).split('').map(ch => SUP[ch] || ch).join('');

  /* Particle picture of the core, kept in step with the model's cumulative reaction counts. */
  class CoreRun {
    constructor(shift) {
      this.shift = shift;
      this.core = new helium.HeliumCore({ shift });
      this.r = util.mulberry32(42);
      this.ps = []; this.flashes = []; this.pairs = []; this.done = [0, 0, 0];
      for (let i = 0; i < N0; i++) { const [x, y] = this.inDisk(); this.ps.push({ x, y, th: this.r() * 6.283, k: 'he' }); }
    }
    inDisk() { let x, y; do { x = this.r() * 2 - 1; y = this.r() * 2 - 1; } while (x * x + y * y > 0.86); return [x, y]; }
    finished() { return this.core.finished(); }
    nearest(q, kind, skip) {
      let best = null, bd = Infinity;
      for (const o of this.ps) {
        if (o === q || o.k !== kind || o.dead || (skip && skip.includes(o))) continue;
        const d = (o.x - q.x) ** 2 + (o.y - q.y) ** 2;
        if (d < bd) { bd = d; best = o; }
      }
      return best;
    }
    pick(kind) { const c = this.ps.filter(p => p.k === kind && !p.dead); return c.length ? c[Math.floor(this.r() * c.length)] : null; }
    fuse(kind, n, into) {      // n nuclei of `kind` (plus the first) → `into`
      const a = this.pick(kind === 'he' ? 'he' : kind); if (!a) return false;
      const others = [];
      for (let i = 0; i < n; i++) { const o = this.nearest(a, 'he', others); if (!o) return false; others.push(o); }
      for (const o of others) { a.x = (a.x + o.x) / 2; a.y = (a.y + o.y) / 2; o.dead = true; }
      a.k = into; this.flashes.push({ x: a.x, y: a.y, age: 0, k: into });
      return true;
    }
    sync() {
      const scale = N0 / 0.25;
      const target = this.core.made.map(m => Math.floor(m * scale + 1e-9));
      const rules = [['he', 2, 'c'], ['c', 1, 'o'], ['o', 1, 'ne']];
      rules.forEach(([kind, n, into], i) => {
        let guard = 0;
        while (this.done[i] < target[i] && guard++ < 50) { if (!this.fuse(kind, n, into)) { this.done[i] = target[i]; break; } this.done[i]++; }
      });
      if (this.ps.some(p => p.dead)) this.ps = this.ps.filter(p => !p.dead);
      // beryllium-8: two helium nuclei touch and fall apart again almost at once
      const he = this.ps.filter(p => p.k === 'he');
      if (he.length > 4 && this.r() < 0.45 * he.length / N0 + 0.05) {
        const a = he[Math.floor(this.r() * he.length)], b = this.nearest(a, 'he');
        if (b && (a.x - b.x) ** 2 + (a.y - b.y) ** 2 < 0.04) this.pairs.push({ a, b, age: 0 });
      }
    }
    move() {
      const T9 = this.core.T9 || 0.1, sp = 0.006 + 0.03 * Math.min(1, T9 / 0.3);
      for (const q of this.ps) {
        const m = q.k === 'he' ? 1 : q.k === 'c' ? 1.7 : 2;
        q.th += (this.r() - .5) * 0.8;
        q.x += Math.cos(q.th) * sp / m; q.y += Math.sin(q.th) * sp / m;
        const d2 = q.x * q.x + q.y * q.y;
        if (d2 > 0.86) { const d = Math.sqrt(d2), k = Math.sqrt(0.86) / d; q.x *= k; q.y *= k; q.th += Math.PI; }
      }
      this.flashes.forEach(f => f.age++); this.flashes = this.flashes.filter(f => f.age < 24);
      this.pairs.forEach(p => p.age++); this.pairs = this.pairs.filter(p => p.age < 16 && !p.a.dead && !p.b.dead && p.a.k === 'he' && p.b.k === 'he');
    }
    step() { if (this.core.finished()) return; this.core.step(); this.sync(); this.move(); }
  }

  const KCOL = () => ({ he: C.gold, c: C.teal, o: C.violet, ne: C.ember });

  function heatRGB(T9) {   // dull red at 80 MK → orange-white at 300 MK
    const t = Math.min(1, Math.max(0, (T9 - 0.09) / 0.2));
    return [Math.round(90 + 150 * t), Math.round(22 + 140 * t), Math.round(14 + 90 * t)];
  }
  function drawCore(view, run) {
    const { ctx, w, h } = view, col = KCOL();
    const T9 = run.core.T9 || run.core.hist[0][5] || 0.1;
    const [r, g, bl] = heatRGB(T9);
    ctx.fillStyle = '#070914'; ctx.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.47;
    const gr = ctx.createRadialGradient(cx, cy, R * 0.05, cx, cy, R * 1.02);
    gr.addColorStop(0, `rgba(${r},${g},${bl},0.55)`); gr.addColorStop(0.7, `rgba(${Math.round(r * 0.6)},${Math.round(g * 0.4)},${Math.round(bl * 0.4)},0.35)`); gr.addColorStop(1, 'rgba(7,9,20,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, cy, R * 1.02, 0, 7); ctx.fill();
    const rad = Math.max(2.4, Math.min(w, h) / 120);
    const X = x => cx + x * R, Y = y => cy + y * R;
    for (const p of run.pairs) {   // ⁸Be: a brief dashed bond that snaps
      const k = p.age / 16;
      ctx.globalAlpha = 1 - k; ctx.strokeStyle = C.gold; ctx.lineWidth = 1.2; ctx.setLineDash([2, 2]);
      ctx.beginPath(); ctx.moveTo(X(p.a.x), Y(p.a.y)); ctx.lineTo(X(p.b.x), Y(p.b.y)); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    const size = { he: 1, c: 1.5, o: 1.7, ne: 1.9 };
    for (const q of run.ps) {
      const x = X(q.x), y = Y(q.y), rr = rad * size[q.k];
      ctx.fillStyle = col[q.k]; ctx.beginPath(); ctx.arc(x, y, rr, 0, 7); ctx.fill();
      if (q.k !== 'he') { ctx.strokeStyle = 'rgba(7,9,20,0.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, rr * 0.5, 0, 7); ctx.stroke(); }
    }
    for (const f of run.flashes) {
      const k = f.age / 24; ctx.globalAlpha = 1 - k; ctx.strokeStyle = col[f.k]; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(X(f.x), Y(f.y), rad * (2 + 6 * k), 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
    }
  }

  function drawChart(view, run, ghost, tOurs) {
    const { ctx, w, h } = view; ctx.clearRect(0, 0, w, h);
    const hist = run.core.hist, tNow = hist[hist.length - 1][0];
    const xmax = Math.max(tOurs * 1.12, tNow * 1.05);
    const L = 40, R = 14, T = 10, B = 24;
    const X = x => L + x / xmax * (w - L - R), Y = y => T + (1 - y) * (h - T - B);
    ctx.font = '11px ' + MONO; ctx.strokeStyle = GRID; ctx.fillStyle = C.faint; ctx.lineWidth = 1;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    [0, .25, .5, .75, 1].forEach(v => { ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(w - R, Y(v)); ctx.stroke(); ctx.fillText(Math.round(v * 100) + '%', L - 6, Y(v)); });
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const stepMyr = xmax > 30 ? 10 : 5;
    for (let t = 0; t <= xmax; t += stepMyr) { ctx.beginPath(); ctx.moveTo(X(t), T); ctx.lineTo(X(t), h - B); ctx.stroke(); ctx.fillText(t + ' Myr', X(t), h - B + 6); }
    line(ctx, ghost, X, Y, 0, 2, GHOST, 1.4, [5, 4]); line(ctx, ghost, X, Y, 0, 3, GHOST, 1.4, [5, 4]);
    line(ctx, hist, X, Y, 0, 1, C.gold, 2.2); line(ctx, hist, X, Y, 0, 4, C.ember, 2);
    line(ctx, hist, X, Y, 0, 3, C.violet, 2.4); line(ctx, hist, X, Y, 0, 2, C.teal, 2.4);
  }

  /* Energy levels of carbon-12 near the three-helium threshold, with the thermal tail of the core. */
  function drawLevels(view, run) {
    const { ctx, w, h } = view; ctx.clearRect(0, 0, w, h);
    const p = run.core.p, T9 = run.core.T9 || run.core.hist[0][5] || 0.1, kT = helium.KT_KEV * T9;
    const lo = 7.12, hi = 8.12, T = 8, B = 22;
    const Y = E => T + (1 - (E - lo) / (hi - lo)) * (h - T - B);
    const wedgeW = w * 0.42, xr = w - 6;
    // thermal tail: width ∝ (40 + log10 of the Boltzmann factor), so the edge is where 1 collision in 10⁴⁰ gets there
    ctx.beginPath(); ctx.moveTo(xr, Y(E3));
    for (let k = 0; k <= 40; k++) {
      const E = E3 + (hi - E3) * k / 40, lp = -(E - E3) * 1000 / kT * 0.4343;
      ctx.lineTo(xr - wedgeW * Math.max(0, 1 + lp / 40), Y(E));
    }
    ctx.lineTo(xr, Y(hi)); ctx.closePath();
    const gr = ctx.createLinearGradient(xr - wedgeW, 0, xr, 0);
    gr.addColorStop(0, 'rgba(241,181,77,0.06)'); gr.addColorStop(1, 'rgba(241,181,77,0.32)');
    ctx.fillStyle = gr; ctx.fill();
    ctx.font = '10.5px ' + MONO; ctx.textBaseline = 'bottom';
    const hline = (E, col, lw, dash, label, below) => {
      const y = Y(E); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.setLineDash(dash || []);
      ctx.beginPath(); ctx.moveTo(6, y); ctx.lineTo(xr, y); ctx.stroke(); ctx.setLineDash([]);
      if (label) { ctx.fillStyle = col; ctx.textAlign = 'left'; ctx.textBaseline = below ? 'top' : 'bottom'; ctx.fillText(label, 8, y + (below ? 3 : -3)); }
    };
    hline(E3, C.gold, 1.2, [4, 3], '3 helium nuclei', true);
    if (p.e8 > 0) hline(E3 + p.e8 / 1000, C.slate, 1, [2, 3], 'beryllium-8 + helium');
    if (Math.abs(p.eps - helium.EPS0) > 1) hline(E3 + helium.EPS0 / 1000, GHOST, 1, [5, 4], '');
    const yH = Y(E3 + p.eps / 1000);
    hline(E3 + p.eps / 1000, C.teal, 2.6, null, 'Hoyle state ' + (Math.abs(p.eps - helium.EPS0) > 1 ? `(${p.eps > helium.EPS0 ? '+' : '−'}${Math.round(Math.abs(p.eps - helium.EPS0))} keV)` : '(ours)'));
    const lp = Math.round(p.eps / kT * 0.4343);
    ctx.fillStyle = C.fg; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillText(`1 in 10${sup(lp)}`, xr - 2, yH - 4);
    ctx.fillStyle = C.faint; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.fillText(`thermal tail at ${Math.round(T9 * 1000)} MK (log scale)`, 8, h - 4);
  }

  function verdictFor(run, ours) {
    const X = run.core.X(), mC = X[1] / ours.C, mO = X[2] / ours.O;
    const cs = pctSmart(X[1]), os = pctSmart(X[2]);
    if (run.core.stalled) return ['bad', 'NO HELIUM BURNING', 'The Hoyle state sits so close to the beryllium-8 threshold that the resonance barely works. Helium cannot burn at any temperature this star can reach.'];
    if (mC < BAD) {
      const ne = X[3] > 0.05 ? ` Some of the oxygen has gone on to neon (${pctSmart(X[3])}).` : '';
      return ['bad', 'CARBON BURNED AWAY', `The core has to run hotter to fuse helium, and at that temperature carbon captures helium fast. Almost all of it becomes oxygen: carbon ends at ${cs} of the core (${fmtFactor(mC)} of ours).${ne}`];
    }
    if (mO < BAD) return ['bad', 'NO OXYGEN', `The core burns cool enough that carbon rarely captures another helium nucleus: ${cs} carbon, only ${os} oxygen (${fmtFactor(mO)} of ours). Little oxygen means little water or rock.`];
    if (mC < WARN) return ['warn', '', `Carbon survives, but only ${cs} of the core (our universe makes ${fmtFactor(1 / mC)} as much); oxygen ${os}. Both elements are made, in a lopsided mix.`];
    if (mO < WARN) return ['warn', '', `A carbon-rich core: ${cs} carbon, ${os} oxygen, which is ${fmtFactor(mO)} of our oxygen. Both elements are made, but oxygen is scarcer.`];
    if (Math.abs(run.shift) < 1) return ['good', '', `Carbon ${cs}, oxygen ${os} by mass, close to full stellar models of stars like ours. Carbon for organic chemistry, oxygen for water.`];
    return ['good', '', `Carbon ${cs}, oxygen ${os}: both made in healthy amounts (carbon ${fmtFactor(mC)}, oxygen ${fmtFactor(mO)} of ours).`];
  }

  let ghost = null;
  FTL.makeBench('hoyle', {
    initial: 0,
    presets: [{ v: -100, label: '−100 keV' }, { v: -40, label: '−40 keV' }, { v: 0, label: 'Ours' }, { v: 40, label: '+40 keV' }, { v: 100, label: '+100 keV' }],
    fmt: v => v === 0 ? '379 keV (ours)' : `${v > 0 ? '+' : '−'}${Math.abs(v)} keV`,
    create(v) {
      if (!ghost) ghost = new helium.HeliumCore({}).runToEnd().hist;
      return new CoreRun(v);
    },
    draw(b) {
      const run = b.sim, core = run.core, X = core.X(), ours = helium.ours();
      drawCore(b.canvases.view, run);
      drawChart(b.canvases.chart, run, ghost, helium.tOursMyr());
      drawLevels(b.canvases.levels, run);
      const T9 = core.T9 || core.hist[0][5] || 0;
      setReadouts(b, [
        ['Time', core.hist[core.hist.length - 1][0].toFixed(1) + ' Myr'],
        ['Core temperature', Math.round(T9 * 1000) + ' million K'],
        ['Helium left', pctSmart(X[0])],
        ['Carbon : oxygen', `${pctSmart(X[1])} : ${pctSmart(X[2])}`],
      ]);
      const seg = b.el.comp.children;
      [X[0], X[1], X[2], X[3]].forEach((x, i) => { seg[i].style.width = (x * 100).toFixed(2) + '%'; });
      const dAlpha = run.shift / helium.QEM_EPS * 100;
      b.el.hint.textContent = run.shift === 0 ? 'A shift of 40 keV is what a 1% change in the strength of electromagnetism would do.'
        : `Electromagnetism ${dAlpha > 0 ? 'stronger' : 'weaker'} by ${Math.abs(dAlpha).toFixed(1)}% would move the state this far.`;
      b.el.big.textContent = '';
      if (!core.finished()) {
        setVerdict(b, '', X[0] > 0.98 ? 'Helium is starting to fuse. Dashed links are beryllium-8: two helium nuclei that touch and fall apart again unless a third arrives.' : 'Burning… carbon builds up first, then some of it captures another helium nucleus and becomes oxygen.');
        return;
      }
      const [kind, big, text] = verdictFor(run, ours);
      b.el.big.textContent = big; setVerdict(b, kind, text);
    },
  });
})();
