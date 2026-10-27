// Insignias: certifican habilidades solo con evidencia entregada y aprobada por el tutor.
import { h, toast } from '../util.js';
import { icon } from '../icons.js';
import { getBadges, getRoute } from '../content.js';
import * as L from '../logic.js';
import { state } from '../store.js';
import { heading, note, fmtScore } from './ui.js';

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

export async function insigniasView() {
  const badges = await getBadges();
  const view = h('div', { class: 'view' });
  const earned = badges.reduce((n, b) => n + LV.filter(([lv]) => levelState(b, lv).s === 'done').length, 0);
  view.append(heading('Insignias', 'Cada insignia debe poder defenderse en una entrevista: solo salen de trabajos y entregas concretas.'),
    h('div', { class: 'row between wrap', style: { marginBottom: '20px' } },
      h('span', { class: 'chip accent' }, `${earned} de ${badges.length * 3} niveles`),
      h('button', { class: 'btn sm', onclick: async e => { e.currentTarget.disabled = true; try { const n = await L.refreshGrades(); toast(n ? `${n} calificación(es) nueva(s)` : 'Sin novedades', n ? 'ok' : ''); } catch (x) { toast(x.message, 'bad'); } location.hash = `#/insignias?r=${Date.now()}`; } }, icon('refresh'), 'Consultar calificaciones')));
  const grid = h('div', { class: 'grid auto' });
  for (const b of badges) {
    const states = LV.map(([lv, label, desc]) => ({ lv, label, desc, ...levelState(b, lv) }));
    const has = states.some(x => x.s === 'done');
    grid.append(h('article', { class: 'card badge-card' + (has ? ' has' : '') },
      h('div', { class: 'row' }, h('div', { class: 'badge-ico' }, icon('award')), h('div', null, h('h3', { style: { margin: 0 } }, b.title), h('div', { class: 'muted', style: { fontSize: '.84rem' } }, `Tema base ${b.week}`))),
      ...states.map(x => h('div', { class: 'row between', style: { gap: '8px' } },
        h('span', { title: x.desc, style: { fontWeight: 600, fontSize: '.92rem' } }, x.label),
        x.s === 'done' ? h('span', { class: 'chip ok' }, icon('check'), 'Obtenida')
          : x.s === 'pending' ? h('span', { class: 'chip warn' }, 'En revisión')
          : x.s === 'locked' ? h('span', { class: 'chip', title: x.why }, icon('lock'), x.why || 'Bloqueada')
          : h('button', { class: 'btn sm', onclick: () => evidenceDialog(b, x.lv, x.label) }, x.s === 'retry' ? `Reenviar (${fmtScore(x.rec.nota)})` : 'Enviar evidencia')))));
  }
  view.append(grid);
  view.append(h('p', { class: 'hint', style: { marginTop: '16px' } }, 'Fundamentos se otorga solo al completar el tema. Aplicado y Avanzado requieren que envíes evidencia y que tu tutor la apruebe.'));
  return view;
}
