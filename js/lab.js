/* Fine-Tuning Lab — shared UI: colours, canvas helpers, formatting and the bench framework.
 * Each bench file calls FTL.makeBench(id, config); js/main.js starts the animation loop. */
(function (root) {
  'use strict';
  const FTL = root.FTL = root.FTL || {};

  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const C = {};
  ['gold', 'teal', 'ember', 'slate', 'violet', 'muted', 'faint', 'line', 'fg', 'ink', 'panel', 'raise'].forEach(k => { C[k] = css('--' + k); });
  const GHOST = 'rgba(158,156,187,0.6)';
  const GRID = 'rgba(255,255,255,0.06)';
  const MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';

  function fitCanvas(c) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = c.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }
  function fmtAgeMyr(m) {
    if (m < 1) return (m * 1000).toFixed(0) + ' kyr';
    if (m < 1000) return m.toFixed(m < 10 ? 1 : 0) + ' Myr';
    return (m / 1000).toFixed(2) + ' Gyr';
  }
  function fmtBig(x) {
    if (x >= 1e5) return x.toExponential(1).replace('e+', '×10^');
    return x >= 100 ? Math.round(x).toLocaleString() : x.toFixed(x < 10 ? 2 : 1);
  }
  /* A ratio to our universe, written to follow "… of ours": "1/270", "25%", "400%", "×12" */
  function fmtFactor(m) {
    if (!isFinite(m) || m <= 0) return '0';
    if (m >= 0.995 && m <= 1.005) return '100%';
    if (m < 0.1) { const inv = 1 / m; return '1/' + (inv >= 1e5 ? inv.toExponential(0).replace('e+', '×10^') : Math.round(inv).toLocaleString()); }
    if (m < 10) return Math.round(m * 100) + '%';
    return '×' + Math.round(m);
  }
  const pct = (x, d = 0) => (x * 100).toFixed(d) + '%';
  function pctSmart(x) {
    if (x >= 0.995) return '100%';
    if (x >= 0.1) return (x * 100).toFixed(0) + '%';
    if (x >= 0.01) return (x * 100).toFixed(1) + '%';
    if (x >= 0.0001) return (x * 100).toFixed(2) + '%';
    return x > 0 ? '<0.01%' : '0%';
  }
  function line(ctx, pts, X, Y, ix, iy, col, width, dash) {
    ctx.beginPath(); ctx.setLineDash(dash || []); ctx.strokeStyle = col; ctx.lineWidth = width;
    pts.forEach((p, i) => { const x = X(p[ix]), y = Y(p[iy]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.stroke(); ctx.setLineDash([]);
  }
  function dot(ctx, x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }

  /* ---------------- Bench framework ---------------- */
  const benches = [];
  function makeBench(id, cfg) {
    const rootEl = document.getElementById(id);
    if (!rootEl) return null;
    const el = {};
    rootEl.querySelectorAll('[data-role]').forEach(n => { el[n.dataset.role] = n; });
    const b = { id, root: rootEl, cfg, el, running: false, seen: false, visible: true, canvases: {} };

    cfg.presets.forEach((p, i) => {
      const iid = `${id}-p${i}`;
      const inp = document.createElement('input');
      inp.type = 'radio'; inp.name = `${id}-preset`; inp.id = iid; inp.value = p.v;
      if (p.v === cfg.initial) inp.checked = true;
      const lab = document.createElement('label'); lab.htmlFor = iid; lab.textContent = p.label;
      inp.addEventListener('change', () => { el.slider.value = p.v; b.setVal(p.v, true); });
      el.presets.append(inp, lab);
    });
    el.slider.addEventListener('input', () => {
      const v = +el.slider.value;
      rootEl.querySelectorAll('.presets input').forEach(x => { x.checked = Math.abs(+x.value - v) < 1e-9; });
      b.setVal(v, true);
    });
    el.play.addEventListener('click', () => { if (b.sim && b.sim.finished()) b.reset(); b.setRunning(!b.running); });
    el.restart.addEventListener('click', () => { b.reset(); b.setRunning(true); });

    b.setRunning = r => {
      b.running = r;
      el.play.textContent = r ? 'Pause' : (b.sim && b.sim.finished() ? 'Replay' : 'Play');
    };
    b.setVal = (v, go) => { b.val = v; el.out.textContent = cfg.fmt(v); b.reset(); if (go) b.setRunning(true); };
    b.reset = () => { b.sim = cfg.create(b.val); b.draw(); };
    b.resize = () => {
      rootEl.querySelectorAll('canvas[data-role]').forEach(c => { b.canvases[c.dataset.role] = fitCanvas(c); });
      b.draw();
    };
    b.draw = () => { if (b.canvases.view) cfg.draw(b); };
    b.tick = () => {
      if (!b.running) return;
      b.sim.step(); b.draw();
      if (b.sim.finished()) b.setRunning(false);
    };
    b.val = cfg.initial; el.slider.value = cfg.initial; el.out.textContent = cfg.fmt(cfg.initial);
    benches.push(b);
    return b;
  }

  /* Verdict box helper: kind is 'good' | 'warn' | 'bad' | '' */
  function setVerdict(b, kind, text) {
    const v = b.el.verdict; v.className = 'verdict' + (kind ? ' ' + kind : ''); v.textContent = text;
  }
  function setReadouts(b, pairs) {
    b.el.readouts.innerHTML = pairs.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  }
  /* items: [label, state ('yes'|'no'|'unk'|''), when] */
  function setMilestones(b, items) {
    b.el.ms.innerHTML = items.map(([lab, st, when]) => `<li class="${st || ''}">${lab}<span class="when">${when || ''}</span></li>`).join('');
  }

  Object.assign(FTL, {
    ui: { REDUCE, C, GHOST, GRID, MONO, fitCanvas, fmtAgeMyr, fmtBig, fmtFactor, pct, pctSmart, line, dot, setVerdict, setReadouts, setMilestones },
    makeBench, benches,
  });
})(window);
