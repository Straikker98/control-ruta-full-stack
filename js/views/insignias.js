// Insignias: certifican habilidades solo con evidencia entregada y aprobada por el tutor.
import { h, toast } from '../util.js';
import { icon } from '../icons.js';
import { getBadges, getRoute } from '../content.js';
import * as L from '../logic.js';
import { state } from '../store.js';
import { heading, note, fmtScore } from './ui.js';
import { medal } from '../badge.js';

const LV = [
  ['fundamentos', 'Fundamentos', 'Se obtiene al completar el tema base: fundamentación, trabajo y los tres exámenes con 9,0 o más.'],
  ['aplicado', 'Aplicado', 'Evidencia de un proyecto o trabajo real, aprobada por el tutor con 9,0 o más.'],
  ['avanzado', 'Avanzado', 'Evidencia de un proyecto completo, con Aplicado y Fundamentos ya obtenidos.'],
];

function levelState(b, lv) {
  const S = state();
  if (lv === 'fundamentos') return L.badgeFundamentos(b.week) ? { s: 'done' } : { s: 'locked', why: `Completa el tema ${b.week}.` };
  const rec = (S.badges[b.id] || {})[lv] || {};
  if (rec.approved) return { s: 'done', rec };
  if (lv === 'aplicado' && !L.badgeFundamentos(b.week)) return { s: 'locked', why: 'Requiere Fundamentos.' };
  if (lv === 'avanzado' && !((S.badges[b.id] || {}).aplicado || {}).approved) return { s: 'locked', why: 'Requiere Aplicado.' };
  if (rec.status === 'pending') return { s: 'pending', rec };
  if (rec.status === 'graded') return { s: 'retry', rec };
  return { s: 'open', rec };
}

function evidenceDialog(b, lv, label) {
  const ta = h('textarea', { class: 'textarea', rows: 6, placeholder: 'Enlace al proyecto (repositorio o sitio publicado) y explicación de qué demuestra esta habilidad.' });
  const dlg = h('dialog', null, h('h3', null, `${b.title} · ${label}`), h('p', { class: 'muted' }, 'Tu tutor revisa la evidencia y la aprueba con 9,0 o más.'),
    h('div', { class: 'field' }, h('label', null, 'Evidencia'), ta),
    h('div', { class: 'row', style: { justifyContent: 'flex-end' } }, h('button', { class: 'btn ghost', onclick: () => dlg.close() }, 'Cancelar'),
      h('button', { class: 'btn primary', onclick: async e => {
        if (ta.value.trim().length < 40) { toast('Escribe al menos 40 caracteres: enlace y explicación.', 'bad'); return; }
        e.currentTarget.disabled = true;
        try { await L.submitEntrega({ kind: 'badge', week: b.week, title: `Insignia ${b.title} · ${label}`, text: ta.value.trim(), badge: b.id, level: lv }); toast('Evidencia enviada al tutor', 'ok'); dlg.close(); location.hash = `#/insignias?r=${Date.now()}`; }
        catch (x) { toast(x.message, 'bad'); e.currentTarget.disabled = false; }
      } }, icon('send'), 'Enviar evidencia')));
  dlg.addEventListener('close', () => dlg.remove());
  document.body.append(dlg); dlg.showModal(); ta.focus();
}

const STATE_TXT = { done: 'Obtenida', pending: 'En revisión', open: 'Disponible', retry: 'Por corregir', locked: 'Bloqueada' };

export async function insigniasView() {
  const badges = await getBadges();
  const view = h('div', { class: 'view' });
  const all = badges.map(b => ({ b, states: LV.map(([lv, label, desc]) => ({ lv, label, desc, ...levelState(b, lv) })) }));
  const earnedList = all.flatMap(({ b, states }) => states.filter(x => x.s === 'done').map(x => ({ b, x })));
  const total = badges.length * 3, pct = Math.round(earnedList.length / total * 100);

  view.append(h('div', { class: 'row between wrap', style: { gap: '16px' } },
    heading('Insignias', 'Cada insignia debe poder defenderse en una entrevista: solo salen de trabajos y entregas concretas.', 'Colección'),
    h('button', { class: 'btn sm', onclick: async e => { e.currentTarget.disabled = true; try { const n = await L.refreshGrades(); toast(n ? `${n} calificación(es) nueva(s)` : 'Sin novedades', n ? 'ok' : ''); } catch (x) { toast(x.message, 'bad'); } location.hash = `#/insignias?r=${Date.now()}`; } }, icon('refresh'), 'Consultar calificaciones')));

  // ---- Vitrina: lo ganado hasta ahora
  view.append(h('section', { class: 'card shelf', 'aria-labelledby': 'vit' },
    h('div', { class: 'row between wrap', style: { marginBottom: '16px' } },
      h('div', null, h('h2', { id: 'vit', style: { margin: 0, fontSize: '1.15rem' } }, 'Tu vitrina'), h('div', { class: 'hint' }, `${earnedList.length} de ${total} niveles · Bronce = Fundamentos, Plata = Aplicado, Oro = Avanzado`)),
      h('div', { class: 'row', style: { gap: '12px', minWidth: '220px' } }, h('div', { class: 'bar', style: { flex: 1 } }, h('i', { style: { width: pct + '%' } })), h('b', { class: 'tnum' }, pct + '%'))),
    earnedList.length ? h('div', { class: 'shelf-row' }, earnedList.map(({ b, x }) => h('div', { class: 'trophy', title: `${b.title} · ${x.label}` }, medal(b.id, x.lv, 'done', 76), h('small', null, b.title))))
      : h('p', { class: 'muted', style: { margin: 0 } }, 'Aún no hay medallas. Completa el tema base de una habilidad para ganar la de bronce.')));

  // ---- Una tarjeta por habilidad, con sus tres medallas
  const grid = h('div', { class: 'grid mgrid' });
  for (const { b, states } of all) {
    const n = states.filter(x => x.s === 'done').length;
    const next = states.find(x => x.s === 'open' || x.s === 'retry');
    grid.append(h('article', { class: 'card mcard' + (n ? ' has' : '') },
      h('div', { class: 'row between' }, h('div', null, h('h3', { style: { margin: 0 } }, b.title), h('div', { class: 'hint' }, `Tema base ${b.week}`)), h('span', { class: 'chip ' + (n === 3 ? 'ok' : n ? 'accent' : '') }, `${n}/3`)),
      h('div', { class: 'medals' }, states.map(x => h('div', { class: 'mslot ' + x.s, title: x.s === 'locked' ? (x.why || x.desc) : x.desc },
        medal(b.id, x.lv, x.s, 84), h('b', null, x.label), h('small', null, x.s === 'locked' ? 'Bloqueada' : STATE_TXT[x.s])))),
      next ? h('button', { class: 'btn sm block', onclick: () => evidenceDialog(b, next.lv, next.label) }, icon('send'), next.s === 'retry' ? `Reenviar ${next.label} (${fmtScore(next.rec.nota)})` : `Enviar evidencia · ${next.label}`)
        : n === 3 ? h('div', { class: 'hint', style: { textAlign: 'center' } }, 'Habilidad completa') : h('div', { class: 'hint', style: { textAlign: 'center' } }, states.find(x => x.s === 'locked')?.why || '')));
  }
  view.append(grid);
  view.append(h('p', { class: 'hint', style: { marginTop: '16px' } }, 'Fundamentos se otorga solo al completar el tema. Aplicado y Avanzado requieren que envíes evidencia y que tu tutor la apruebe.'));
  return view;
}
