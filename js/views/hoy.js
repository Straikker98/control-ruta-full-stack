// Vista Hoy: lo que toca ahora, en una pantalla.
import { h } from '../util.js';
import { icon } from '../icons.js';
import { getRoute, getChecklist, getTopic, topicReady } from '../content.js';
import { state, topicOf } from '../store.js';
import * as L from '../logic.js';
import { heading, note, ring, statusChip } from './ui.js';
import { startAndGo } from './tema.js';

function greeting() {
  const hr = new Date().getHours();
  return hr < 12 ? 'Buenos días' : hr < 19 ? 'Buenas tardes' : 'Buenas noches';
}

export async function hoy() {
  const S = state();
  const route = await getRoute();
  const chk = await getChecklist();
  const cur = S.current;
  const weekRow = cur ? route.weeks.find(w => w.week === cur) : route.weeks.find(w => !L.isDone(w.week));
  const view = h('div', { class: 'view' });

  const min = L.minutesOn(), goal = S.profile.goalMin;
  const lv = L.level();
  const due = L.dueReviews().length;
  const doneCount = Object.values(S.topics).filter(t => t.done).length;

  view.append(heading(`${greeting()}, ${S.profile.name}`, S.profile.gamification
    ? `Llevas ${doneCount} de ${route.weeks.length} temas. Hoy sumas a tu ruta hacia desarrollador Full Stack.`
    : `Llevas ${doneCount} de ${route.weeks.length} temas.`));

  // ---- Tarjeta principal
  const main = h('section', { class: 'card tint', 'aria-labelledby': 'hoy-main' });
  if (!weekRow) {
    main.append(h('h2', { id: 'hoy-main' }, 'Ruta completada'), h('p', null, 'Terminaste todos los temas. Revisa tu portafolio y prepárate para las entrevistas.'));
  } else if (cur) {
    const topic = await getTopic(cur).catch(() => null);
    const pct = L.progress(cur, topic?.exercises?.length || 0);
    const next = L.nextStep(cur);
    main.append(h('div', { class: 'row hero', style: { alignItems: 'center', gap: '20px' } },
      ring(pct, 92),
      h('div', { style: { flex: 1, minWidth: 0 } },
        h('div', { class: 'eyebrow' }, `Tema ${cur} · Fase ${weekRow.phase}`),
        h('h2', { id: 'hoy-main', style: { marginBottom: '6px' } }, weekRow.title),
        h('p', { class: 'muted', style: { marginBottom: '14px' } }, weekRow.mastery),
        h('div', { class: 'row wrap' },
          h('a', { class: 'btn primary', href: next.href }, next.label, icon('right')),
          h('a', { class: 'btn', href: `#/tema/${cur}` }, 'Ver el tema')))));
  } else {
    const ready = await topicReady(weekRow.week);
    const canStart = L.isUnlocked(weekRow.week);
    main.append(h('div', { class: 'eyebrow' }, `Siguiente · Tema ${weekRow.week} · Fase ${weekRow.phase}`),
      h('h2', { id: 'hoy-main' }, weekRow.title), h('p', { class: 'muted' }, weekRow.mastery));
    if (!ready) main.append(note('warn', 'El contenido de este tema se está preparando. Aparecerá automáticamente; vuelve a abrir la app mañana.', 'clock'));
    main.append(h('div', { class: 'row wrap', style: { marginTop: '14px' } },
      h('button', { class: 'btn primary', disabled: !ready || !canStart, onclick: () => startAndGo(weekRow.week) }, icon('play'), `Iniciar tema ${weekRow.week}`),
      h('a', { class: 'btn', href: `#/tema/${weekRow.week}` }, 'Ver detalles')));
  }
  view.append(main);

  // ---- Indicadores
  const goalPct = Math.min(100, Math.round(min / goal * 100));
  const stats = h('div', { class: 'grid', style: { gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginTop: '16px' } },
    h('a', { class: 'stat', href: '#/registro', style: { textDecoration: 'none', color: 'inherit' } }, h('b', { class: 'tnum' }, `${min}`, h('small', { class: 'faint', style: { fontSize: '.9rem' } }, ` / ${goal} min`)),
      h('span', null, 'Meta de hoy'), h('div', { class: 'bar' + (goalPct >= 100 ? ' ok' : ''), style: { marginTop: '10px' } }, h('i', { style: { width: goalPct + '%' } }))),
    S.profile.gamification ? h('div', { class: 'stat' }, h('b', { class: 'tnum' }, icon('flame'), ' ', S.streak.count), h('span', null, S.streak.count === 1 ? 'día de racha' : 'días de racha')) : null,
    S.profile.gamification ? h('div', { class: 'stat' }, h('b', { class: 'tnum' }, S.xp, h('small', { class: 'faint', style: { fontSize: '.9rem' } }, ' XP')), h('span', null, `Nivel ${lv.n}`),
      h('div', { class: 'bar', style: { marginTop: '10px' } }, h('i', { style: { width: (lv.into / lv.size * 100) + '%' } }))) : null,
    h('a', { class: 'stat', href: '#/repaso', style: { textDecoration: 'none', color: 'inherit' } }, h('b', { class: 'tnum' }, due), h('span', null, due === 1 ? 'pregunta para repasar' : 'preguntas para repasar')));
  view.append(stats);

  // ---- Checklist de la semana en curso
  if (cur && chk[cur]) {
    const items = chk[cur];
    const t = topicOf(cur);
    const doneN = items.filter((_, i) => t.checklist?.[i]).length;
    const box = h('section', { class: 'card', style: { marginTop: '16px' }, 'aria-labelledby': 'chk-t' },
      h('div', { class: 'row between' }, h('h2', { id: 'chk-t', style: { margin: 0 } }, 'Checklist de la semana'), h('span', { class: 'chip' }, `${doneN} de ${items.length}`)),
      h('div', { style: { marginTop: '8px' } }, items.map((txt, i) => {
        const input = h('input', { type: 'checkbox', checked: !!t.checklist?.[i], onchange: e => L.toggleCheck(cur, i, e.target.checked) });
        return h('label', { class: 'check' }, input, h('span', null, txt));
      })));
    view.append(box);
  }
  return view;
}
