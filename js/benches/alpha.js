/* Electromagnetism bench: the periodic table, built over cosmic history. Physics lives in js/physics/electromagnetism.js. */
(function () {
  'use strict';
  const { em, ui } = FTL;
  const { C, GHOST, GRID, MONO, setVerdict, setReadouts, setMilestones, fmtFactor } = ui;
  const FRAMES = 900, BAD = 1 / 30, WARN = 1 / 3;
  const STAGES = [
    { s: 0, e: 95, title: 'The first three minutes', sub: 'hydrogen and helium from the Big Bang' },
    { s: 95, e: 195, title: 'Atoms form', sub: '380,000 years: nuclei capture electrons' },
    { s: 195, e: 450, title: 'Stars burn', sub: 'carbon, oxygen and everything up to iron' },
    { s: 450, e: 600, title: 'Exploding and merging stars', sub: 'the heavy elements' },
    { s: 600, e: 880, title: 'Radioactive decay', sub: '' },
    { s: 880, e: 901, title: 'Today', sub: 'about 10 billion years of decay' },
  ];
  const DECAY0 = 600, DECAY1 = 880;
  const SERIF = '"Bricolage Grotesque", "Avenir Next", system-ui, sans-serif';

  /* Column and row of element Z in the standard 18-column table; lanthanides/actinides in rows 8.4 and 9.4. */
  function cell(Z) {
    if (Z === 1) return [1, 1]; if (Z === 2) return [18, 1];
    if (Z <= 4) return [Z - 2, 2]; if (Z <= 10) return [Z + 8, 2];
    if (Z <= 12) return [Z - 10, 3]; if (Z <= 18) return [Z, 3];
    if (Z <= 36) return [Z - 18, 4]; if (Z <= 54) return [Z - 36, 5];
    if (Z <= 56) return [Z - 54, 6]; if (Z <= 71) return [Z - 54, 8.4]; if (Z <= 86) return [Z - 68, 6];
    if (Z <= 88) return [Z - 86, 7]; if (Z <= 103) return [Z - 86, 9.4]; return [Z - 100, 7];
  }
  /* When each element is first made (frame). */
  const LIGHT_ORDER = [3, 4, 5, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30];
  function appear(Z) {
    if (Z === 1) return 8; if (Z === 2) return 30;
    if (Z === 6) return 215; if (Z === 8) return 232; if (Z === 7) return 248;
    if (Z <= 30) return 255 + LIGHT_ORDER.indexOf(Z) * 6;
    return 455 + (Z - 31) * 2;
  }
  const decayYears = frame => Math.pow(10, 10 * (Math.min(frame, DECAY1) - DECAY0) / (DECAY1 - DECAY0));

  class AlphaRun {
    constructor(v) { this.v = v; this.f = Math.pow(10, v); this.a = em.analyze(this.f); this.frame = 0; }
    step() { if (this.frame < FRAMES) this.frame++; }
    finished() { return this.frame >= FRAMES; }
    stage() { return STAGES.findIndex(s => this.frame >= s.s && this.frame < s.e); }
    /* Displayed abundance (log ε) of an element at the current frame, plus a 0–1 fade-in. */
    shown(e) {
      const fr = this.frame, a = this.a;
      if (e.produced == null || e.Z > 100) return null;
      const t0 = appear(e.Z); if (fr < t0) return null;
      let v = e.produced, alpha = Math.min(1, (fr - t0) / 22);
      const T = e.halfLifeYr;
      if (e.Z === 1 && !a.hydrogenStable) {           // protons swallow their electrons once atoms form
        if (fr >= 185) return null;
        if (fr >= 140) alpha *= 1 - (fr - 140) / 45;
      } else if (T !== Infinity && T < 1) {            // falls apart almost as soon as it is made
        const k = (fr - t0 - 22) / 26; if (k >= 1) return null; if (k > 0) alpha *= 1 - k;
      } else if (T !== Infinity && fr >= DECAY0) {
        const surv = Math.exp(-Math.LN2 * decayYears(fr) / T);
        if (surv < 1e-5) return null;
        v += Math.log10(surv);
      }
      return { v, alpha };
    }
  }

  const bright = v => Math.max(0, Math.min(1, (v + 1.5) / 11));

  function drawTable(ctx, run, x0, y0, c) {
    const a = run.a, fr = run.frame;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `${Math.max(7, Math.floor(c * 0.4))}px ${MONO}`;
    for (const e of a.elements) {
      const [col, row] = cell(e.Z);
      const x = x0 + (col - 1) * c, y = y0 + (row - 1) * c, s = c - 2;
      const sh = run.shown(e);
      const unknown = a.hoyle.unknown && (e.Z === 6 || e.Z === 8) && fr >= appear(e.Z);
      const lostNow = e.inOurs && fr >= appear(e.Z) + 22 && !sh && (e.Z !== 1 || fr >= 185);
      ctx.fillStyle = 'rgba(255,255,255,0.025)'; ctx.fillRect(x + 1, y + 1, s, s);
      let txt = 'rgba(232,229,243,0.22)';
      if (sh) {
        const b = bright(sh.v);
        ctx.fillStyle = `rgba(241,181,77,${(0.12 + 0.68 * b) * sh.alpha})`;
        ctx.fillRect(x + 1, y + 1, s, s);
        txt = b > 0.62 ? `rgba(26,20,5,${0.55 + 0.45 * sh.alpha})` : `rgba(232,229,243,${0.45 + 0.55 * sh.alpha})`;
        if (!e.inOurs && e.final != null) { ctx.strokeStyle = C.teal; ctx.lineWidth = 1.5; ctx.strokeRect(x + 1.75, y + 1.75, s - 1.5, s - 1.5); }
      }
      if (lostNow) { ctx.strokeStyle = C.ember; ctx.lineWidth = 1.5; ctx.strokeRect(x + 1.75, y + 1.75, s - 1.5, s - 1.5); txt = 'rgba(232,104,79,0.85)'; }
      if (unknown) { ctx.strokeStyle = C.slate; ctx.lineWidth = 1.2; ctx.setLineDash([2, 2]); ctx.strokeRect(x + 1.5, y + 1.5, s - 1, s - 1); ctx.setLineDash([]); }
      if (e.Z > 100) txt = 'rgba(232,229,243,0.12)';
      ctx.fillStyle = txt; ctx.fillText(e.sym + (unknown ? '?' : ''), x + 1 + s / 2, y + 1 + s / 2 + 0.5);
    }
  }

  function drawStageCaption(ctx, run, x0, y0, wd) {
    const si = Math.max(0, run.stage()), st = STAGES[si], fr = run.frame;
    let sub = st.sub;
    if (si === 4) {
      const yr = decayYears(fr);
      sub = 'after ' + (yr < 1e3 ? Math.round(yr) + ' years' : yr < 1e6 ? Math.round(yr / 1e3) + ' thousand years' : yr < 1e9 ? Math.round(yr / 1e6) + ' million years' : (yr / 1e9).toFixed(1) + ' billion years');
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = C.fg; ctx.font = `700 ${Math.max(13, Math.round(wd / 36))}px ${SERIF}`;
    ctx.fillText(st.title, x0, y0 + 14);
    const tw = ctx.measureText(st.title).width;
    ctx.fillStyle = C.muted; ctx.font = `11px ${MONO}`;
    if (tw + 12 + ctx.measureText(sub).width < wd) ctx.fillText(sub, x0 + tw + 12, y0 + 14);
    const by = y0 + 24;   // progress bar with one tick per stage
    ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(x0, by, wd, 3);
    ctx.fillStyle = C.gold; ctx.fillRect(x0, by, wd * Math.min(1, fr / FRAMES), 3);
    STAGES.forEach(s => { ctx.fillStyle = 'rgba(232,229,243,0.35)'; ctx.fillRect(x0 + wd * s.s / FRAMES, by - 2, 1, 7); });
  }

  function miniBox(ctx, x, y, w, h, title) {
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1; ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
    ctx.fillStyle = C.faint; ctx.font = `10.5px ${MONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(title.toUpperCase(), x + 8, y + 7);
  }
  function caption(ctx, x, y, w, h, text, col) {
    ctx.fillStyle = col || C.muted; ctx.font = `11.5px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    let t = text; while (ctx.measureText(t).width > w - 10 && t.length > 4) t = t.slice(0, -2);
    ctx.fillText(t === text ? t : t + '…', x + w / 2, y + h - 7);
  }
  const ball = (ctx, x, y, r, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); };
  const ring = (ctx, x, y, r, col, lw, dash) => { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.setLineDash(dash || []); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke(); ctx.setLineDash([]); };

  function drawHydrogen(ctx, run, x, y, w, h) {
    miniBox(ctx, x, y, w, h, 'Hydrogen atom');
    const a = run.a, fr = run.frame, cx = x + w / 2, cy = y + h / 2 + 2, R = Math.min(w, h) * 0.3;
    const ro = R * Math.max(0.45, Math.min(1.6, 1 / a.f));
    const nr = Math.max(3, R * 0.14);
    if (fr < 95) {   // hot plasma: electrons fly past
      ball(ctx, cx, cy, nr, C.ember);
      for (let k = 0; k < 3; k++) {
        const ph = fr * 0.07 + k * 2.1, ex = cx + Math.cos(ph * 1.3 + k) * R * 1.3, ey = cy + Math.sin(ph * 0.9 + k * 2) * R * 0.9;
        ball(ctx, ex, ey, 2.4, C.teal);
      }
      caption(ctx, x, y, w, h, 'proton, free electrons'); return;
    }
    const capture = Math.min(1, (fr - 95) / 40), ang = fr * 0.12;
    let orbit = ro * (1 + 1.4 * (1 - capture));
    if (!a.hydrogenStable && fr >= 140) orbit = ro * Math.max(0, 1 - (fr - 140) / 25);
    const neutron = !a.hydrogenStable && fr >= 165;
    if (!neutron) {
      ring(ctx, cx, cy, Math.max(1, orbit), 'rgba(113,201,217,0.25)', 1);
      ball(ctx, cx, cy, nr, C.ember);
      ball(ctx, cx + Math.cos(ang) * orbit, cy + Math.sin(ang) * orbit, 2.6, C.teal);
      caption(ctx, x, y, w, h, a.f === 1 ? 'proton + electron' : `atom ${(1 / a.f).toFixed(2)}× our size`);
    } else {
      const k = Math.min(1, (fr - 165) / 30);
      if (k < 1) ring(ctx, cx, cy, nr * (1.5 + 6 * k), `rgba(232,104,79,${1 - k})`, 2);
      ball(ctx, cx, cy, nr, C.slate);
      const nx = cx + (R * 1.6) * Math.min(1, (fr - 165) / 40);   // the escaping neutrino
      if (fr < 215) { ctx.strokeStyle = 'rgba(232,229,243,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(nx - 8, cy - 4); ctx.lineTo(nx, cy - 4); ctx.stroke(); }
      caption(ctx, x, y, w, h, 'p + e⁻ → n + ν: no hydrogen', C.ember);
    }
  }

  function drawCarbon(ctx, run, x, y, w, h) {
    miniBox(ctx, x, y, w, h, 'Carbon-12 in stars');
    const a = run.a, hy = a.hoyle, fr = run.frame, cx = x + w / 2, cy = y + h / 2 + 2, R = Math.min(w, h) * 0.3;
    const nr = Math.max(3, R * 0.13);
    if (fr < 205) { caption(ctx, x, y, w, h, 'waiting for stars'); return; }
    const he = (px, py) => ball(ctx, px, py, nr, C.gold);
    if (hy.unknown) {
      const k = Math.min(1, (fr - 205) / 25);
      he(cx - nr * (1 + 3 * (1 - k)), cy); he(cx + nr * (1 + 3 * (1 - k)), cy);
      if (k >= 1) ring(ctx, cx, cy, nr * 2.4, C.slate, 1.5, [3, 2]);
      caption(ctx, x, y, w, h, 'beryllium-8 is stable here: model stops', C.slate); return;
    }
    const tri = [0, 1, 2].map(i => [Math.cos(i * 2.094 - 1.571), Math.sin(i * 2.094 - 1.571)]);
    const noBurn = !hy.valid;   // Hoyle state far out of reach
    const k = Math.min(1, (fr - 205) / 30);
    let spread = 1 + 3 * (1 - k);
    const burnedToO = hy.valid && hy.mC < BAD, unstable = !a.carbonStable;
    if (noBurn) {
      const wob = 1 + 0.35 * Math.abs(Math.sin(fr * 0.08));
      tri.forEach(([u, v]) => he(cx + u * nr * 2.6 * wob, cy + v * nr * 2.6 * wob));
      caption(ctx, x, y, w, h, 'Hoyle state out of reach: no carbon', C.ember); return;
    }
    if (unstable && fr > 262) spread = 1 + 4 * Math.min(1, (fr - 262) / 30);
    tri.forEach(([u, v]) => he(cx + u * nr * 1.15 * spread, cy + v * nr * 1.15 * spread));
    if (fr >= 222 && fr < 236) { ctx.strokeStyle = C.gold; ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.moveTo(cx + tri[1][0] * nr * 1.15 * spread, cy + tri[1][1] * nr * 1.15 * spread); ctx.lineTo(cx + tri[2][0] * nr * 1.15 * spread, cy + tri[2][1] * nr * 1.15 * spread); ctx.stroke(); ctx.setLineDash([]); }
    const formed = fr >= 235 && !(unstable && fr > 262);
    const toNeon = burnedToO && hy.mO < BAD;   // so hot that the oxygen burns on to neon too
    if (formed) ring(ctx, cx, cy, nr * 2.7, burnedToO && fr >= 276 ? (toNeon ? C.ember : C.violet) : C.teal, 2);
    if (burnedToO && fr >= 250) {
      const k4 = Math.min(1, (fr - 250) / 26);
      he(cx + nr * (1.2 + 5 * (1 - k4)), cy + nr * 1.6);
    }
    if (fr < 236) caption(ctx, x, y, w, h, 'three helium nuclei meet');
    else if (unstable) caption(ctx, x, y, w, h, fr > 262 ? '¹²C → 3 ⁴He: carbon falls apart' : 'carbon forms…', fr > 262 ? C.ember : undefined);
    else if (burnedToO) caption(ctx, x, y, w, h, fr >= 276 ? (toNeon ? 'carbon → oxygen → neon' : 'almost all carbon → oxygen') : 'carbon forms…', fr >= 276 ? C.ember : undefined);
    else if (hy.mO < BAD) caption(ctx, x, y, w, h, 'carbon, but almost no oxygen', C.ember);
    else caption(ctx, x, y, w, h, 'carbon, and some becomes oxygen');
  }

  function drawView(view, run) {
    const { ctx, w, h } = view;
    ctx.fillStyle = '#070914'; ctx.fillRect(0, 0, w, h);
    const pad = Math.max(10, w * 0.03), c = (w - 2 * pad) / 18;
    const y0 = 24;
    drawTable(ctx, run, pad, y0, c);
    const yCap = y0 + 9.4 * c + 10;
    drawStageCaption(ctx, run, pad, yCap, w - 2 * pad);
    const yBox = yCap + 40, bh = h - yBox - pad, bw = (w - 2 * pad - 10) / 2;
    if (bh > 60) { drawHydrogen(ctx, run, pad, yBox, bw, bh); drawCarbon(ctx, run, pad + bw + 10, yBox, bw, bh); }
  }

  function drawChart(view, run, ghost) {
    const { ctx, w, h } = view; ctx.clearRect(0, 0, w, h);
    const L = 40, R = 12, T = 10, B = 24, YMIN = -2, YMAX = 12.5;
    const X = z => L + (z - 0.5) / 100 * (w - L - R), Y = v => T + (1 - (v - YMIN) / (YMAX - YMIN)) * (h - T - B);
    ctx.font = '11px ' + MONO; ctx.strokeStyle = GRID; ctx.fillStyle = C.faint; ctx.lineWidth = 1;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    [0, 4, 8, 12].forEach(v => { ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(w - R, Y(v)); ctx.stroke(); ctx.fillText(v === 12 ? '10¹²' : v === 0 ? '1' : '10' + (v === 4 ? '⁴' : '⁸'), L - 6, Y(v)); });
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    [[1, 'H'], [6, 'C'], [8, 'O'], [26, 'Fe'], [50, 'Sn'], [82, 'Pb'], [92, 'U']].forEach(([z, s]) => ctx.fillText(s, X(z), h - B + 6));
    const bw = Math.max(1.5, (w - L - R) / 100 * 0.72);
    for (const e of run.a.elements) {
      if (e.Z > 100) continue;
      const sh = run.shown(e);
      if (sh && sh.v > YMIN) {
        ctx.fillStyle = !e.inOurs && e.final != null ? C.teal : `rgba(241,181,77,${0.35 + 0.65 * sh.alpha})`;
        ctx.fillRect(X(e.Z) - bw / 2, Y(sh.v), bw, Y(YMIN) - Y(sh.v));
      }
    }
    ctx.strokeStyle = GHOST; ctx.lineWidth = 1.3; ctx.setLineDash([4, 3]);
    ctx.beginPath(); let pen = false;
    for (const g of ghost) { if (g.v == null) { pen = false; continue; } const x = X(g.Z), y = Y(g.v); if (pen) ctx.lineTo(x, y); else ctx.moveTo(x, y); pen = true; }
    ctx.stroke(); ctx.setLineDash([]);
    if (run.finished()) for (const z of run.a.lost) { ctx.fillStyle = C.ember; ctx.fillRect(X(z) - bw / 2, Y(YMIN) - 4, bw, 4); }
  }

  function milestonesFor(run) {
    const a = run.a, hy = a.hoyle, fr = run.frame;
    const after = (t, ok, unk) => fr < t ? '' : unk ? 'unk' : ok ? 'yes' : 'no';
    return [
      ['Hydrogen atoms are stable', after(190, a.hydrogenStable)],
      ['Stars make carbon', after(280, hy.valid && hy.mC >= BAD, hy.unknown)],
      ['Stars make oxygen', after(280, hy.valid && hy.mO >= BAD, hy.unknown)],
      ['Carbon and oxygen nuclei hold together', after(300, a.carbonStable && a.oxygenStable)],
      ['Iron is stable', after(420, a.ironStable)],
    ];
  }
  function heavyNote(a) {
    const hs = a.elements[a.heaviestStable - 1];
    if (a.f < 1 && a.gained.length) return ` The periodic table grows: elements up to ${hs.name.toLowerCase()} (${hs.Z}) last for billions of years here.`;
    if (a.f > 1 && a.lost.length) {
      const names = a.lost.filter(z => z > 30).slice(-3).map(z => a.elements[z - 1].name.toLowerCase());
      if (a.lost.some(z => z <= 30)) return ` In all, ${a.lost.length} of our elements fall apart, including iron.`;
      if (names.length) return ` The heaviest elements decay away (${names.join(', ')}${a.lost.filter(z => z > 30).length > 3 ? ' and others' : ''}); the longest-lasting is now ${hs.name.toLowerCase()}.`;
    }
    return '';
  }
  function verdictFor(run) {
    const a = run.a, hy = a.hoyle;
    if (!a.hydrogenStable) {
      const extra = !a.carbonStable ? ' Carbon-12 itself falls apart into three helium nuclei.' : '';
      return ['bad', 'NO HYDROGEN', `The neutron–proton mass gap shrinks to ${a.dnp.toFixed(2)} MeV, less than the electron's mass, so every hydrogen atom's proton swallows its electron and becomes a neutron. No hydrogen means no water and no long-lived Sun-like stars.${extra}${heavyNote(a)}`];
    }
    if (!a.carbonStable || !a.oxygenStable) return ['bad', 'CARBON FALLS APART', `Electric repulsion inside nuclei is now strong enough to break carbon or oxygen apart.${heavyNote(a)}`];
    if (hy.unknown) {
      const pp = a.qpp < 0.15 ? ` The first step of hydrogen fusion (p + p → deuterium) also releases only ${a.qpp.toFixed(2)} MeV here; uncertain inputs could close it entirely.` : '';
      return ['warn', '', `Beryllium-8 becomes stable once α is about 3.3% weaker (it misses being bound by just 92 keV in our universe). Helium burning would then work very differently, and this toy model can't say how much carbon and oxygen stars would make. Hydrogen and nuclei are fine.${pp}${heavyNote(a)}`];
    }
    const sh = `${hy.shiftKeV > 0 ? '+' : '−'}${Math.abs(Math.round(hy.shiftKeV))} keV`;
    if (hy.mC < BAD) return ['bad', 'NO CARBON', `The Hoyle state moves ${sh}, so stars must burn helium hotter, and nearly all their carbon becomes oxygen (carbon ${fmtFactor(hy.mC)} of ours).${heavyNote(a)}`];
    if (hy.mO < BAD) return ['bad', 'NO OXYGEN', `The Hoyle state moves ${sh}, so stars burn helium cooler and make almost no oxygen (${fmtFactor(hy.mO)} of ours): little water, little rock.${heavyNote(a)}`];
    if (hy.mC < WARN || hy.mO < WARN) return ['warn', '', `Hydrogen, carbon and oxygen all exist, but stars make a lopsided mix (carbon ${fmtFactor(hy.mC)}, oxygen ${fmtFactor(hy.mO)} of ours).${heavyNote(a)}`];
    if (Math.abs(a.f - 1) < 1e-6) return ['good', '', 'Hydrogen is stable, stars make both carbon and oxygen, and about 80 elements last for billions of years, with thorium and uranium still slowly decaying.'];
    return ['good', '', `Hydrogen, carbon and oxygen all survive in healthy amounts (carbon ${fmtFactor(hy.mC)}, oxygen ${fmtFactor(hy.mO)} of ours).${heavyNote(a)}`];
  }

  let ghost = null;
  const fmtF = v => {
    const f = Math.pow(10, v);
    if (Math.abs(v) < 1e-9) return 'ours (1/137.0)';
    const rel = Math.abs(f - 1) < 0.1 ? `${f > 1 ? '+' : '−'}${(Math.abs(f - 1) * 100).toFixed(1)}%` : `×${f.toFixed(2)}`;
    return `${rel} (1/${(137.036 / f).toFixed(1)})`;
  };
  FTL.makeBench('alpha', {
    initial: 0,
    presets: [
      { v: Math.log10(0.5), label: 'Much weaker (×½)' }, { v: Math.log10(0.975), label: 'Slightly weaker (−2.5%)' }, { v: 0, label: 'Ours' },
      { v: Math.log10(1.025), label: 'Slightly stronger (+2.5%)' }, { v: Math.log10(2), label: 'Much stronger (×2)' }],
    fmt: fmtF,
    create(v) {
      if (!ghost) ghost = em.analyze(1).elements.filter(e => e.Z <= 100).map(e => ({ Z: e.Z, v: e.final }));
      return new AlphaRun(v);
    },
    draw(b) {
      const run = b.sim, a = run.a, hy = a.hoyle;
      drawView(b.canvases.view, run);
      drawChart(b.canvases.chart, run, ghost);
      const hs = a.elements[a.heaviestStable - 1];
      setReadouts(b, [
        ['Strength <span class="nocase">α</span>', '1/' + a.alphaInv.toFixed(1)],
        ['Hoyle state', hy.unknown ? '⁸Be bound' : Math.abs(hy.shiftKeV) < 0.5 ? '379 keV' : `${hy.shiftKeV > 0 ? '+' : '−'}${Math.round(Math.abs(hy.shiftKeV))} keV`],
        ['Neutron − proton', a.dnp.toFixed(2) + ' MeV'],
        ['Heaviest stable', `${hs.sym} (${hs.Z})`],
      ]);
      setMilestones(b, milestonesFor(run));
      b.el.big.textContent = '';
      if (!run.finished()) {
        const si = run.stage();
        const msg = ['Protons, neutrons and electrons in a hot plasma; protons and neutrons pair into helium.',
          a.hydrogenStable ? 'Electrons settle around nuclei to make atoms.' : 'Electrons settle around protons… and get swallowed.',
          'Stars fuse hydrogen to helium, then helium to carbon and oxygen, then on up to iron.',
          'Supernovae and merging neutron stars build the elements beyond iron.',
          'Unstable nuclei decay. Watch which squares fade.', ''][Math.max(0, si)];
        setVerdict(b, '', msg); return;
      }
      const [kind, big, text] = verdictFor(run);
      b.el.big.textContent = big; setVerdict(b, kind, text);
    },
  });
})();
