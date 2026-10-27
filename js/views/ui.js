// Piezas de interfaz compartidas por las vistas.
import { h, inline } from '../util.js';
import { icon } from '../icons.js';

export function back(href, label) {
  return h('a', { class: 'btn ghost sm', href, style: { marginLeft: '-12px', marginBottom: '8px' } }, icon('left'), label);
}
export function heading(title, sub, eyebrow) {
  return h('header', { style: { marginBottom: '24px' } },
    eyebrow ? h('div', { class: 'eyebrow' }, eyebrow) : null,
    h('h1', { tabindex: '-1', id: 'view-title' }, title),
    sub ? h('p', { class: 'lead' }, sub) : null);
}
export function loading() {
  return h('div', { class: 'view', 'aria-busy': 'true' },
    h('div', { class: 'skel', style: { height: '34px', width: '55%', marginBottom: '16px' } }),
    h('div', { class: 'skel', style: { height: '140px', marginBottom: '12px' } }),
    h('div', { class: 'skel', style: { height: '140px' } }));
}
export function note(kind, text, ic = 'info') {
  return h('div', { class: 'note ' + kind, role: kind === 'bad' ? 'alert' : null }, icon(ic), h('div', null, text));
}
/** Texto largo en bloques legibles: frases agrupadas de 2 en 2 dentro de su caja. */
export function paragraphBoxes(text, cls = '') {
  const paras = String(text || '').split(/\n{2,}|\n/).map(s => s.trim()).filter(Boolean);
  const out = [];
  for (const p of paras) {
    const sentences = p.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡(«“0-9])/);
    if (sentences.length <= 3) { out.push(p); continue; }
    for (let i = 0; i < sentences.length; i += 3) out.push(sentences.slice(i, i + 3).join(' '));
  }
  return out.map(p => h('div', { class: 'prose-box ' + cls }, h('p', null, inline(p))));
}
export const statusLabel = { done: ['Completado', 'ok'], active: ['En curso', 'accent'], available: ['Disponible', ''], locked: ['Bloqueado', ''] };
export function statusChip(s) {
  const [t, k] = statusLabel[s] || ['', ''];
  return h('span', { class: 'chip ' + k }, s === 'locked' ? icon('lock') : s === 'done' ? icon('check') : null, t);
}
export function ring(pct, size = 84) {
  return h('div', { class: 'ring', style: { '--p': pct, '--size': size + 'px' }, role: 'img', 'aria-label': `${pct}% completado` }, h('span', null, pct + '%'));
}
export function fmtScore(n) { return Number(n).toFixed(1).replace('.', ','); }
