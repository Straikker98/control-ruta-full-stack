// El Cuaderno: libreta rayada con código de 5 colores. Solo lectura.
import { h, inline, frag } from '../util.js';
import { icon } from '../icons.js';
import { getTopic, weekInfo } from '../content.js';
import * as L from '../logic.js';
import { state } from '../store.js';
import { back, note } from './ui.js';

const ARROWS = /([─│┌┐└┘├┤┬┴┼►◄▲▼→←↑↓⇒]+)/g;

function parseBlocks(body) {
  const lines = String(body).replace(/\r/g, '').split('\n');
  const out = []; let buf = [];
  const flush = () => { if (buf.length) { out.push({ t: 'text', lines: buf }); buf = []; } };
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('```')) {
      flush(); const code = []; i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) code.push(lines[i++]);
      out.push({ t: 'code', text: code.join('\n') });
    } else buf.push(lines[i]);
  }
  flush();
  return out;
}
const TERM = /^((?:Definición|Concepto|Regla|Ejemplo|Nota|Idea|Importante|Resultado|Error|Causa|Solución)[^:]{0,32}:)/;
function para(text) {
  const m = text.match(TERM);
  if (m) return h('p', null, h('span', { class: 'term' }, m[1]), inline(text.slice(m[1].length)));
  return h('p', null, inline(text));
}
/** Texto del Cuaderno → viñetas y párrafos. Una línea con sangría continúa la anterior. */
function renderText(lines, asList = false) {
  const items = [];
  for (const raw of lines) {
    if (!raw.trim()) { items.push({ k: 'gap' }); continue; }
    const bullet = raw.trim().startsWith('•');
    if (/^\s+\S/.test(raw) && items.length && items[items.length - 1].k !== 'gap' && !bullet) { items[items.length - 1].text += ' ' + raw.trim(); continue; }
    items.push({ k: bullet || asList ? 'li' : 'p', text: raw.trim().replace(/^•\s*/, '') });
  }
  const out = []; let ul = null;
  for (const it of items) {
    if (it.k === 'li') { if (!ul) { ul = h('ul'); out.push(ul); } ul.append(h('li', null, inline(it.text))); }
    else { ul = null; if (it.k === 'p') out.push(para(it.text)); }
  }
  return out;
}
function renderTable(lines) {
  const rows = lines.filter(l => l.includes(' | ')).map(l => l.split(' | ').map(c => c.trim()));
  const extra = lines.filter(l => l.trim() && !l.includes(' | '));
  const out = [];
  if (rows.length) {
    const [head, ...body] = rows;
    out.push(h('div', { class: 'tablewrap' }, h('table', null,
      h('thead', null, h('tr', null, head.map(c => h('th', { scope: 'col' }, inline(c))))),
      h('tbody', null, body.map(r => h('tr', null, r.map(c => h('td', null, inline(c)))))))));
  }
  extra.forEach(l => out.push(h('p', { class: 'note-g' }, inline(l.trim()))));
  return out;
}
function diagram(text) {
  const parts = text.split(ARROWS);
  return h('pre', { class: 'diagram' }, parts.map((p, i) => i % 2 ? h('span', { class: 'arrow' }, p) : p));
}

function renderSection(sec) {
  const blocks = parseBlocks(sec.body);
  switch (sec.kind) {
    case 'warning':
      return h('div', { class: 'warn', role: 'note' }, h('strong', { class: 'lbl' }, sec.title), ...blocks.flatMap(b => b.t === 'text' ? renderText(b.lines) : [h('pre', { class: 'code' }, b.text)]));
    case 'code':
      return frag(h('div', { class: 'cap' }, sec.title), ...blocks.flatMap(b => b.t === 'code' ? [h('pre', { class: 'code', tabindex: '0' }, b.text)] : renderText(b.lines)));
    case 'diagram':
      return frag(h('div', { class: 'cap' }, sec.title), ...blocks.flatMap(b => b.t === 'code' ? [diagram(b.text)] : [diagram(b.lines.join('\n').replace(/^\n+|\n+$/g, ''))]));
    case 'table':
      return frag(h('div', { class: 'cap' }, sec.title), ...blocks.flatMap(b => b.t === 'code' ? [h('pre', { class: 'code' }, b.text)] : renderTable(b.lines)));
    default: { // heading, definition, theory, list
      return frag(h('h2', null, sec.title), ...blocks.flatMap(b => b.t === 'code' ? [h('pre', { class: 'code', tabindex: '0' }, b.text)] : renderText(b.lines, sec.kind === 'list')));
    }
  }
}

export async function cuadernoView({ w, p }) {
  w = Number(w);
  const info = await weekInfo(w), topic = await getTopic(w).catch(() => null);
  const st = L.statusOf(w);
  const view = h('div', { class: 'view' });
  if (!topic || topic.estado !== 'completo') { view.append(back(`#/tema/${w}`, `Tema ${w}`), note('warn', 'La fundamentación de este tema se está preparando.', 'clock')); return view; }
  if (st === 'locked' || st === 'available') { view.append(back(`#/tema/${w}`, `Tema ${w}`), note('warn', 'Inicia el tema para estudiar su Cuaderno.', 'lock')); return view; }

  const pages = [...new Set(topic.sections.map(s => s.page))].sort((a, b) => a - b);
  const total = pages.length;
  const idx = Math.min(Math.max(1, Number(p) || 1), total) - 1;
  const secs = topic.sections.filter(s => s.page === pages[idx]);
  if (st === 'active') L.readPage(w, idx + 1, total);
  const done = L.cuaderno(w).done || st === 'done';

  const go = n => { location.hash = `#/cuaderno/${w}/${n}`; };
  const sheet = h('article', { class: 'sheet turn', 'aria-label': `Hoja ${idx + 1} de ${total}` });
  if (idx === 0) sheet.append(h('h1', { tabindex: '-1', id: 'view-title' }, info.title));
  else sheet.append(h('span', { class: 'sr-only', tabindex: '-1', id: 'view-title' }, `Hoja ${idx + 1}`));
  secs.forEach(s => sheet.append(renderSection(s)));

  const prev = h('button', { class: 'btn', disabled: idx === 0, onclick: () => go(idx), 'aria-label': 'Hoja anterior' }, icon('left'), 'Anterior');
  const last = idx === total - 1;
  const next = last
    ? (done ? h('a', { class: 'btn primary', href: `#/tema/${w}` }, 'Volver al tema', icon('right'))
            : h('button', { class: 'btn primary', onclick: () => { L.finishCuaderno(w); location.hash = `#/tema/${w}`; } }, icon('check'), 'Terminar fundamentación'))
    : h('button', { class: 'btn primary', onclick: () => go(idx + 2), 'aria-label': 'Hoja siguiente' }, 'Siguiente', icon('right'));

  view.append(
    h('div', { class: 'nb-top notebook' },
      back(`#/tema/${w}`, `Tema ${w} · ${info.title}`),
      h('div', { class: 'row' }, h('span', { class: 'chip accent' }, `Hoja ${idx + 1} de ${total}`),
        h('div', { class: 'bar', style: { width: '90px' }, role: 'progressbar', 'aria-valuenow': Math.round((idx + 1) / total * 100), 'aria-valuemin': 0, 'aria-valuemax': 100 }, h('i', { style: { width: ((idx + 1) / total * 100) + '%' } })))),
    h('div', { class: 'notebook' }, sheet,
      h('div', { class: 'sheet-foot' }, prev, h('span', { class: 'muted tnum' }, `${idx + 1} / ${total}`), next),
      h('div', { class: 'legend', style: { marginTop: '18px' }, 'aria-label': 'Código de colores' },
        [['var(--rojo)', 'Título y advertencias'], ['var(--azul)', 'Subtítulos y definiciones'], ['var(--ink)', 'Teoría'], ['var(--verde)', 'Flechas, notas y tablas'], ['var(--naranja)', 'Código y comandos']].map(([c, t]) => h('span', null, h('i', { style: { background: c } }), t)))));

  // Teclado: ← → cambian de hoja (no interfiere al escribir)
  const key = e => { if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowLeft' && idx > 0) go(idx); else if (e.key === 'ArrowRight' && !last) go(idx + 2); };
  document.addEventListener('keydown', key);
  view.cleanup = () => document.removeEventListener('keydown', key);
  return view;
}
