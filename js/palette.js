// Paleta de comandos (Ctrl/⌘ + K): saltar a cualquier vista o tema escribiendo unas letras.
import { h } from './util.js';
import { icon } from './icons.js';
import { getRoute } from './content.js';

const VIEWS = [['Hoy', '#/hoy', 'home'], ['Ruta', '#/ruta', 'map'], ['Laboratorio', '#/lab', 'play'], ['Repaso', '#/repaso', 'repeat'], ['Insignias', '#/insignias', 'award'], ['Perfil', '#/perfil', 'user'], ['Registro de sesiones', '#/registro', 'clock'], ['Mis tarjetas', '#/tarjetas', 'sparkle'], ['Portafolio', '#/portafolio', 'print']];
const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export async function openPalette() {
  if (document.querySelector('dialog.palette')) return;
  const items = [...VIEWS.map(([t, href, ic]) => ({ t, href, ic, s: 'Ir a' })),
    ...(await getRoute()).weeks.map(w => ({ t: `${w.week}. ${w.title}`, href: `#/tema/${w.week}`, ic: 'book', s: `Fase ${w.phase}` }))];
  const input = h('input', { type: 'text', placeholder: 'Buscar un tema o una sección…', 'aria-label': 'Buscar', autocomplete: 'off' });
  const list = h('ul', { role: 'listbox' });
  const dlg = h('dialog', { class: 'palette', 'aria-label': 'Buscar' }, input, list);
  let shown = [], sel = 0;
  const paint = () => {
    const q = norm(input.value.trim());
    shown = items.filter(i => !q || norm(i.t).includes(q) || norm(i.s).includes(q)).slice(0, 30); sel = 0;
    list.replaceChildren(...(shown.length ? shown.map((i, k) => h('li', null, h('a', { href: i.href, class: k === sel ? 'sel' : '', role: 'option', onclick: () => dlg.close() }, icon(i.ic), i.t, h('small', null, i.s)))) : [h('li', { class: 'empty' }, 'Sin resultados')]));
  };
  const mark = () => { [...list.querySelectorAll('a')].forEach((a, k) => { a.classList.toggle('sel', k === sel); if (k === sel) a.scrollIntoView({ block: 'nearest' }); }); };
  input.addEventListener('input', paint);
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { sel = Math.min(shown.length - 1, sel + 1); mark(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); mark(); e.preventDefault(); }
    else if (e.key === 'Enter' && shown[sel]) { location.hash = shown[sel].href; dlg.close(); }
  });
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', () => dlg.remove());
  document.body.append(dlg); paint(); dlg.showModal(); input.focus();
}

document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); }
});

// Ayuda de atajos (tecla ?)
const KEYS = [['Ctrl/⌘ + K', 'Buscar un tema o una sección'], ['?', 'Ver esta ayuda'], ['← →', 'Hoja anterior / siguiente del Cuaderno'], ['1–4 o A–D', 'Responder una pregunta del examen'], ['Enter', 'Continuar en el examen'], ['Ctrl + Enter', 'Ejecutar el código en el Laboratorio'], ['Tab', 'Sangría en el editor del Laboratorio']];
document.addEventListener('keydown', e => {
  if (e.key !== '?' || e.ctrlKey || e.metaKey || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || document.querySelector('dialog[open]')) return;
  const dlg = h('dialog', { 'aria-label': 'Atajos de teclado' }, h('h3', null, 'Atajos de teclado'),
    h('div', { style: { display: 'grid', gap: '10px', margin: '14px 0 20px' } }, KEYS.map(([k, t]) => h('div', { class: 'row between' }, h('span', { class: 'muted' }, t), h('kbd', null, k)))),
    h('div', { class: 'row', style: { justifyContent: 'flex-end' } }, h('button', { class: 'btn primary', onclick: () => dlg.close() }, 'Cerrar')));
  dlg.addEventListener('close', () => dlg.remove());
  document.body.append(dlg); dlg.showModal();
});
