// Tarjetas propias: preguntas escritas por ti, con el mismo repaso espaciado de las preguntas falladas.
import { h, toast } from '../util.js';
import { icon } from '../icons.js';
import { state } from '../store.js';
import * as L from '../logic.js';
import { heading } from './ui.js';

export async function tarjetasView() {
  const view = h('div', { class: 'view wide cols2' });
  view.append(heading('Mis tarjetas', 'Escribe tus propias preguntas y se repasan con intervalos crecientes: 10 min, 1, 3, 7, 14 y 30 días.', 'Repaso'));

  const q = h('textarea', { class: 'textarea', rows: 3, maxlength: 300, id: 'tq', placeholder: 'Pregunta o concepto (frente)' });
  const a = h('textarea', { class: 'textarea', rows: 3, maxlength: 600, id: 'ta', placeholder: 'Respuesta (reverso)' });
  const study = h('section', { class: 'card' }), list = h('div');
  const paintAll = () => { paintStudy(); paintList(); };

  const form = h('section', { class: 'card' }, h('h2', { style: { fontSize: '1.1rem' } }, 'Nueva tarjeta'),
    h('div', { class: 'field' }, h('label', { for: 'tq' }, 'Frente'), q), h('div', { class: 'field' }, h('label', { for: 'ta' }, 'Reverso'), a),
    h('button', { class: 'btn primary', onclick: () => {
      if (!q.value.trim() || !a.value.trim()) { toast('Escribe el frente y el reverso.', 'bad'); return; }
      L.addCard(q.value.trim(), a.value.trim()); q.value = ''; a.value = ''; toast('Tarjeta creada', 'ok'); paintAll(); q.focus();
    } }, icon('plus'), 'Crear tarjeta'));

  function paintStudy() {
    const due = L.dueCards(), total = Object.keys(state().cards || {}).length;
    const title = h('h2', { style: { fontSize: '1.1rem', margin: 0 } }, 'Repaso de tarjetas');
    if (!total) { study.replaceChildren(title, h('p', { class: 'muted', style: { marginTop: '8px' } }, 'Aún no tienes tarjetas. Crea la primera con el formulario.')); return; }
    if (!due.length) { study.replaceChildren(title, h('p', { class: 'muted', style: { marginTop: '8px' } }, `Nada por repasar ahora. Tienes ${total} tarjeta(s) en espera.`)); return; }
    const c = due[0];
    const face = h('div', { class: 'flash', 'aria-live': 'polite' }, c.q);
    const actions = h('div', { class: 'row wrap', style: { justifyContent: 'center', marginTop: '16px' } });
    const grade = ok => h('button', { class: 'btn' + (ok ? ' primary' : ''), onclick: () => { L.gradeCard(c.id, ok); paintAll(); } }, ok ? 'La sabía' : 'No la sabía');
    actions.append(h('button', { class: 'btn primary', onclick: () => {
      face.classList.add('back'); face.replaceChildren(h('div', null, h('div', { class: 'hint' }, 'Respuesta'), c.a)); actions.replaceChildren(grade(false), grade(true));
    } }, 'Mostrar respuesta'));
    study.replaceChildren(h('div', { class: 'row between' }, title, h('span', { class: 'chip accent' }, `${due.length} por repasar`)), face, actions);
  }

  function paintList() {
    const cards = Object.entries(state().cards || {});
    list.replaceChildren(...(cards.length ? cards.map(([id, c]) => h('div', { class: 'check', style: { cursor: 'default' } },
      h('span', null, h('strong', null, c.q), h('div', { class: 'muted', style: { fontSize: '.88rem' } }, c.a)),
      h('button', { class: 'btn ghost sm iconbtn', 'aria-label': 'Borrar tarjeta', onclick: () => { L.deleteCard(id); paintAll(); } }, icon('trash')))) : [h('p', { class: 'muted' }, 'Sin tarjetas todavía.')]));
  }

  view.append(form, study, h('section', { class: 'card full' }, h('h2', { style: { fontSize: '1.1rem' } }, 'Todas mis tarjetas'), list));
  paintAll();
  return view;
}
