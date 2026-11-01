/* Fine-Tuning Lab — start-up: size canvases, start each bench when it scrolls into view, run the loop. */
(function () {
  'use strict';
  const { benches, ui } = FTL;
  function resizeAll() { benches.forEach(b => b.resize()); }
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    const b = benches.find(x => x.root === e.target); if (!b) return;
    b.visible = e.isIntersecting;
    if (e.isIntersecting && !b.seen) { b.seen = true; if (!ui.REDUCE) b.setRunning(true); }
  }), { threshold: 0.35 });
  benches.forEach(b => { b.reset(); io.observe(b.root); });
  resizeAll();
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resizeAll, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(resizeAll);
  function loop() { benches.forEach(b => { if (b.visible) b.tick(); }); requestAnimationFrame(loop); }
  requestAnimationFrame(loop);
})();
