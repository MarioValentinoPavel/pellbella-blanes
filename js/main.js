/* Pellbella — pelar la web vieja y bajar por las capas de la piel */
gsap.registerPlugin(ScrollTrigger);
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

/* ---------- hero ---------- */
gsap.set('.hero__title span', { yPercent: 100, opacity: 0 });
function heroIn() {
  gsap.to('.hero__title span', { yPercent: 0, opacity: 1, duration: 1.4, ease: 'expo.out', stagger: .15 });
  gsap.from(['.hero__kicker', '.hero__lead', '.hero__row'], { y: 30, opacity: 0, duration: 1.2, ease: 'power3.out', stagger: .1, delay: .3 });
  // destello de luz pulsada
  gsap.timeline({ repeat: -1, repeatDelay: 2.6, delay: 1.5 })
    .to('.hero__pulse', { opacity: 1, scale: 1.2, duration: .12, ease: 'power2.out' })
    .to('.hero__pulse', { opacity: 0, scale: 1.6, duration: 1.1, ease: 'power2.out' });
}

/* ---------- la piel vieja: pliegue de página arrastrable ---------- */
(function peel() {
  const old = $('#old'), page = $('#oldPage'), flap = $('#oldFlap'), grip = $('#grip');
  let W = innerWidth, H = innerHeight;
  const P = { x: W, y: H };
  let dragging = false, done = false, idle = true, t = 0;

  function clipHalf(poly, M, d, keepPositive) {
    const f = p => (p[0] - M.x) * d.x + (p[1] - M.y) * d.y;
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const fa = f(a), fb = f(b);
      const ina = keepPositive ? fa >= 0 : fa < 0, inb = keepPositive ? fb >= 0 : fb < 0;
      if (ina) out.push(a);
      if (ina !== inb) { const k = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]); }
    }
    return out;
  }
  const poly = pts => 'polygon(' + (pts.length ? pts.map(p => `${p[0].toFixed(1)}px ${p[1].toFixed(1)}px`).join(',') : '0 0,0 0,0 0') + ')';
  function render() {
    const d = { x: P.x - W, y: P.y - H };
    const len2 = d.x * d.x + d.y * d.y;
    if (len2 < 4) { page.style.clipPath = 'none'; flap.style.clipPath = 'polygon(0 0,0 0,0 0)'; return; }
    const M = { x: (W + P.x) / 2, y: (H + P.y) / 2 };
    const rect = [[0, 0], [W, 0], [W, H], [0, H]];
    const keep = clipHalf(rect, M, d, true);
    const gone = clipHalf(rect, M, d, false);
    const refl = gone.map(([x, y]) => { const k = 2 * ((x - M.x) * d.x + (y - M.y) * d.y) / len2; return [x - k * d.x, y - k * d.y]; });
    page.style.clipPath = poly(keep);
    flap.style.clipPath = poly(refl);
    flap.style.setProperty('--ang', `${Math.atan2(d.y, d.x) * 180 / Math.PI + 90}deg`);
  }
  function finish() {
    done = true;
    gsap.to(P, {
      x: W - 2.3 * W, y: H - 2.3 * H, duration: 1.1, ease: 'power2.in', onUpdate: render,
      onComplete: () => { old.remove(); document.body.classList.remove('is-locked'); heroIn(); ScrollTrigger.refresh(); }
    });
    gsap.to('.old__label', { opacity: 0, duration: .3 });
  }
  const tickIdle = () => {
    if (!idle || done) return;
    t += .045;
    const a = 38 + Math.sin(t) * 26;
    P.x = W - a; P.y = H - a * .9;
    render();
  };
  gsap.ticker.add(tickIdle);
  const start = e => { if (done) return; dragging = true; idle = false; grip.setPointerCapture?.(e.pointerId); move(e); };
  const move = e => {
    if (!dragging) return;
    P.x = Math.min(W, e.clientX); P.y = Math.min(H, e.clientY);
    render();
  };
  const end = () => {
    if (!dragging) return; dragging = false;
    const dist = Math.hypot(W - P.x, H - P.y);
    if (dist > Math.min(W, H) * .38) finish();
    else gsap.to(P, { x: W - 20, y: H - 18, duration: .6, ease: 'back.out(2)', onUpdate: render, onComplete: () => { idle = true; } });
  };
  grip.addEventListener('pointerdown', start);
  addEventListener('pointermove', move);
  addEventListener('pointerup', end);
  $('#peelBtn').addEventListener('click', () => {
    idle = false;
    gsap.to(P, { x: W * .45, y: H * .4, duration: .9, ease: 'power2.inOut', onUpdate: render, onComplete: finish });
  });
  addEventListener('resize', () => { W = innerWidth; H = innerHeight; if (!done) { P.x = W; P.y = H; render(); } });
})();

/* ---------- nav ---------- */
ScrollTrigger.create({ start: 40, onUpdate: s => $('.nav').classList.toggle('is-solid', s.scroll() > 40) });

/* ---------- descenso por las capas ---------- */
(function layers() {
  const svg = $('.skin'), beam = $('.beam'), depth = $('#depthVal');
  const beamY = [40, 250, 336, 540, 752];
  const litL = [['L0'], ['L0', 'L1'], ['L1'], ['L3'], ['L4']];
  const proxy = { y: 40, d: 0 };
  const setBeam = () => beam.setAttribute('points', `170,-20 300,-20 ${262 + proxy.y * .02},${proxy.y} ${208 - proxy.y * .02},${proxy.y}`);
  setBeam();
  function activate(i, el) {
    $$('.step').forEach(s => s.classList.toggle('on', s === el));
    $$('.legend li').forEach(li => li.classList.toggle('on', +li.dataset.l === i));
    svg.classList.add('dim');
    $$('.L', svg).forEach(p => p.classList.toggle('on', litL[i].some(c => p.classList.contains(c))));
    const target = parseFloat(el.dataset.depth.replace(',', '.'));
    gsap.to(proxy, { y: beamY[i], d: target, duration: 1.1, ease: 'power3.inOut', onUpdate: () => { setBeam(); depth.textContent = proxy.d.toFixed(1).replace('.', ','); } });
    gsap.fromTo('.follicle', { opacity: i === 2 ? .6 : 1 }, { opacity: 1, duration: .6 });
    if (i === 4) gsap.fromTo('.lymph', { strokeWidth: 16 }, { strokeWidth: 22, yoyo: true, repeat: 3, duration: .5 });
  }
  $$('.step').forEach((el, i) => {
    ScrollTrigger.create({ trigger: el, start: 'top 60%', end: 'bottom 60%', onToggle: s => s.isActive && activate(i, el) });
  });
})();

/* ---------- bueno · bonito · barato ---------- */
$$('.bbb__word').forEach((w, i) => {
  gsap.fromTo(w, { xPercent: i % 2 ? -18 : 18 }, { xPercent: 0, ease: 'none', scrollTrigger: { trigger: w, start: 'top bottom', end: 'center 45%', scrub: true } });
});

/* ---------- reveals ---------- */
$$('.reviews blockquote, .visit__in, .reviews__big').forEach(el => {
  gsap.from(el, { y: 50, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
});
