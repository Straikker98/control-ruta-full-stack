// Efectos de celebración: confeti, "+XP" flotante y contadores animados. Sin dependencias.
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Lluvia de confeti en un canvas efímero. `big` para hitos (tema completado, examen aprobado). */
export function confetti({ big = false, x = 0.5, y = 0.35 } = {}) {
  if (reduced()) return;
  const cv = document.createElement('canvas'); cv.className = 'confetti';
  const dpr = Math.min(devicePixelRatio || 1, 2);
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  document.body.append(cv);
  const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
  const cs = getComputedStyle(document.documentElement);
  const colors = [cs.getPropertyValue('--accent'), cs.getPropertyValue('--accent-2'), '#facc15', '#34d399', '#f472b6', '#38bdf8'].map(c => c.trim() || '#8b5cf6');
  const n = big ? 160 : 55;
  const ps = Array.from({ length: n }, () => {
    const a = Math.random() * Math.PI * 2, v = (big ? 9 : 6) + Math.random() * (big ? 9 : 5);
    return { x: innerWidth * x, y: innerHeight * y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 5, w: 6 + Math.random() * 6, h: 4 + Math.random() * 5, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: colors[(Math.random() * colors.length) | 0] };
  });
  let t0 = performance.now();
  (function frame(t) {
    const dt = Math.min(2, (t - t0) / 16.67); t0 = t;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    let alive = 0;
    for (const p of ps) {
      p.vy += .32 * dt; p.vx *= .992; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
      if (p.y < innerHeight + 20) alive++;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
      ctx.globalAlpha = Math.max(0, Math.min(1, (innerHeight - p.y + 80) / 200));
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
    }
    if (alive) requestAnimationFrame(frame); else cv.remove();
  })(t0);
}

/** "+120 XP" que sube y se desvanece desde un punto (por defecto, centro-alto). */
export function xpPop(text, x = innerWidth / 2, y = innerHeight * 0.4) {
  if (reduced()) return;
  const el = document.createElement('div'); el.className = 'xp-pop'; el.textContent = text;
  el.style.left = x + 'px'; el.style.top = y + 'px';
  document.body.append(el); setTimeout(() => el.remove(), 1500);
}

/** Cuenta de 0 al valor final al aparecer; deja el texto final si hay movimiento reducido. */
export function countUp(el, to, { ms = 900, dec = 0, suffix = '' } = {}) {
  const fmt = v => v.toFixed(dec).replace('.', ',') + suffix;
  if (reduced() || !to) { el.textContent = fmt(to); return el; }
  const t0 = performance.now();
  (function step(t) {
    const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 4);
    el.textContent = fmt(to * e);
    if (k < 1) requestAnimationFrame(step);
  })(t0);
  return el;
}
