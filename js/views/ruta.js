// Vista Ruta: mapa del camino. Cada fase es un sendero con sus temas como estaciones.
import { h } from '../util.js';
import { icon } from '../icons.js';
import { getRoute } from '../content.js';
import * as L from '../logic.js';
import { state } from '../store.js';
import { heading, ring } from './ui.js';

const ROW = 124, XS = [30, 66, 40, 70, 32, 62];     // altura por estación y zigzag (% del ancho)
const SVG = 'http://www.w3.org/2000/svg';
const TAG = { done: 'Completado', active: 'En curso', available: 'Disponible', locked: 'Bloqueado' };

function trail(ws) {
  const H = ws.length * ROW, pts = ws.map((_, i) => [XS[i % XS.length], ROW * i + ROW / 2]);
  const d = pts.map(([x, y], i) => {
    if (!i) return `M${x} ${y}`;
    const [px, py] = pts[i - 1], m = (py + y) / 2;
    return `C${px} ${m} ${x} ${m} ${x} ${y}`;
  }).join(' ');
  const lastLit = ws.reduce((k, w, i) => (['done', 'active'].includes(L.statusOf(w.week)) ? i : k), -1);
  const mk = path => { const p = document.createElementNS(SVG, 'path'); p.setAttribute('d', path); return p; };
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'path'); svg.setAttribute('viewBox', `0 0 100 ${H}`); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('aria-hidden', 'true');
  const base = mk(d); base.setAttribute('class', 'base'); svg.append(base);
  if (lastLit > 0) { const lit = mk(d.split('C').slice(0, lastLit + 1).join('C')); lit.setAttribute('class', 'lit'); svg.append(lit); }

  const box = h('div', { class: 'trail', style: { height: H + 'px' } }, svg);
  ws.forEach((w, i) => {
    const st = L.statusOf(w.week), [x, y] = pts[i];
    box.append(h('div', { class: `node ${st} ${x < 50 ? 'r' : 'l'}`, style: { left: x + '%', top: y + 'px' } },
      h('a', { class: 'orb', href: `#/tema/${w.week}`, 'aria-label': `Tema ${w.week}: ${w.title}. ${TAG[st]}` }, st === 'done' ? icon('check') : st === 'locked' ? icon('lock') : w.week),
      h('div', { class: 'lbl' }, h('span', { class: 'tag' }, st === 'active' ? 'Sigues aquí' : TAG[st]), h('b', null, w.title), h('small', null, w.mastery))));
  });
  return box;
}

export async function ruta() {
  const route = await getRoute();
  const view = h('div', { class: 'view' });
  const done = route.weeks.filter(w => L.isDone(w.week)).length, pct = Math.round(done / route.weeks.length * 100);
  view.append(
    h('div', { class: 'row between wrap', style: { gap: '20px', marginBottom: '8px' } },
      heading('Tu ruta Full Stack', `${route.weeks.length} temas en ${route.phases.length} fases, de cero a un perfil profesional. El orden es acumulativo: no se salta ningún tema.`, 'Mapa del camino'),
      h('div', { class: 'row', style: { gap: '14px' } }, ring(pct, 84), h('div', null, h('b', { class: 'tnum', style: { fontSize: '1.5rem' } }, `${done}`), h('span', { class: 'muted' }, ` / ${route.weeks.length}`), h('div', { class: 'hint' }, 'temas completados')))));

  const cur = state().current || route.weeks.find(x => !L.isDone(x.week))?.week;
  for (const ph of route.phases) {
    const ws = route.weeks.filter(w => w.phase === ph.id);
    const n = ws.filter(w => L.isDone(w.week)).length;
    const block = h('section', { class: 'phase-block', style: { '--ph': `var(--ph-${ph.id})` }, 'aria-labelledby': `ph${ph.id}` },
      h('div', { class: 'phase-head' },
        h('span', { class: 'pn' }, ph.id),
        h('div', { style: { flex: 1, minWidth: 0 } }, h('h2', { id: `ph${ph.id}` }, ph.title), h('p', null, ph.summary),
          h('div', { class: 'bar', role: 'progressbar', 'aria-valuenow': n, 'aria-valuemax': ws.length }, h('i', { style: { width: (n / ws.length * 100) + '%' } }))),
        h('span', { class: 'chip ' + (n === ws.length ? 'ok' : '') }, `${n}/${ws.length}`)),
      trail(ws));
    view.append(block);
    if (ws.some(w => w.week === cur)) requestAnimationFrame(() => block.querySelector('.node.active, .node.available')?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
  }
  return view;
}
