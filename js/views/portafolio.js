// Portafolio: hoja imprimible con el avance real (temas, notas, insignias, horas).
import { h, fmtMin, fmtDate } from '../util.js';
import { icon } from '../icons.js';
import { getRoute, getBadges } from '../content.js';
import { state } from '../store.js';
import * as L from '../logic.js';
import { heading, fmtScore } from './ui.js';

export async function portafolioView() {
  const S = state(), route = await getRoute(), badges = await getBadges();
  const done = route.weeks.filter(w => L.isDone(w.week));
  const lv = L.level();
  const earned = badges.flatMap(b => [
    L.badgeFundamentos(b.week) ? [b.title, 'Fundamentos'] : null,
    (S.badges[b.id] || {}).aplicado?.approved ? [b.title, 'Aplicado'] : null,
    (S.badges[b.id] || {}).avanzado?.approved ? [b.title, 'Avanzado'] : null,
  ]).filter(Boolean);

  const view = h('div', { class: 'view wide' });
  view.append(h('div', { class: 'row between wrap' },
    heading(`Portafolio de ${S.profile.name}`, `Ruta Full Stack · actualizado el ${fmtDate(Date.now())}. Solo cuenta lo que tiene evidencia: trabajos calificados y exámenes aprobados.`, 'Evidencia'),
    h('button', { class: 'btn primary no-print', onclick: () => print() }, icon('print'), 'Imprimir o guardar PDF')));

  const stat = (v, t) => h('div', { class: 'stat' }, h('b', null, v), h('span', null, t));
  view.append(h('div', { class: 'grid', style: { gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' } },
    stat(`${done.length} / ${route.weeks.length}`, 'temas completados'), stat(fmtMin(L.totalMinutes()), 'horas de estudio registradas'),
    stat(`Nivel ${lv.n}`, `${S.xp} XP`), stat(S.streak.count, 'días de racha'), stat(earned.length, 'insignias obtenidas')));

  const rows = done.map(w => {
    const t = S.topics[w.week] || {};
    return h('tr', null, h('td', null, `${w.week}. ${w.title}`), h('td', null, `Fase ${w.phase}`), h('td', null, t.trabajo?.nota != null ? fmtScore(t.trabajo.nota) : '—'),
      ...L.LEVELS.map(l => h('td', null, L.examOf(w.week, l).best ? fmtScore(L.examOf(w.week, l).best) : '—')), h('td', null, t.doneAt ? fmtDate(t.doneAt) : ''));
  });
  view.append(h('section', { class: 'card', style: { marginTop: '16px' }, 'aria-labelledby': 'pf-t' }, h('h2', { id: 'pf-t', style: { fontSize: '1.1rem' } }, 'Temas completados'),
    rows.length ? h('div', { style: { overflowX: 'auto' } }, h('table', { class: 'ptable' },
      h('thead', null, h('tr', null, ['Tema', 'Fase', 'Trabajo', 'Fácil', 'Medio', 'Difícil', 'Terminado'].map(t => h('th', { scope: 'col' }, t)))), h('tbody', null, rows)))
      : h('p', { class: 'muted' }, 'Aún no hay temas completados. Aparecerán aquí con sus notas.')));

  view.append(h('section', { class: 'card', style: { marginTop: '16px' }, 'aria-labelledby': 'pf-b' }, h('h2', { id: 'pf-b', style: { fontSize: '1.1rem' } }, 'Insignias'),
    earned.length ? h('div', { class: 'row wrap' }, earned.map(([t, l]) => h('span', { class: 'chip accent' }, icon('award'), `${t} · ${l}`))) : h('p', { class: 'muted' }, 'Todavía sin insignias.')));
  return view;
}
