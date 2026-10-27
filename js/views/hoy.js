// Vista Hoy: lo que toca ahora, en una pantalla.
import { h, dayKey, addDays } from '../util.js';
import { icon } from '../icons.js';
import { countUp } from '../fx.js';
import { getRoute, getChecklist, getTopic, topicReady } from '../content.js';
import { state, topicOf } from '../store.js';
import * as L from '../logic.js';
import { note, ring } from './ui.js';
import { startAndGo } from './tema.js';

function greeting() {
  const hr = new Date().getHours();
  return hr < 12 ? 'Buenos días' : hr < 19 ? 'Buenas tardes' : 'Buenas noches';
}
/** Número que cuenta hasta su valor al aparecer. */
const num = (n, opts) => countUp(h('span', { class: 'tnum' }, '0'), n, opts);
const stat = (ico, value, label, extra, href) => h(href ? 'a' : 'div', { class: 'stat', href }, h('span', { class: 'ico' }, icon(ico)), h('b', null, value), h('span', null, label), extra);

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
  const total = route.weeks.length;

  // ---- Tarjeta principal (héroe)
  const main = h('section', { class: 'card tint', style: { padding: 'clamp(22px, 4vw, 40px)' }, 'aria-labelledby': 'hoy-main' });
  if (!weekRow) {
    main.append(h('h2', { id: 'hoy-main', class: 'hero-title' }, 'Ruta completada'), h('p', null, 'Terminaste todos los temas. Revisa tu portafolio y prepárate para las entrevistas.'));
  } else if (cur) {
    const topic = await getTopic(cur).catch(() => null);
    const pct = L.progress(cur, topic?.exercises?.length || 0);
    const next = L.nextStep(cur);
    main.append(h('div', { class: 'row hero' },
      ring(pct, 116),
      h('div', { style: { flex: 1, minWidth: 0 } },
        h('div', { class: 'eyebrow' }, `${greeting()}, ${S.profile.name} · Tema ${cur} · Fase ${weekRow.phase}`),
        h('h1', { id: 'hoy-main', class: 'hero-title', style: { marginBottom: '8px' } }, weekRow.title),
        h('p', { class: 'muted', style: { marginBottom: '18px', maxWidth: '56ch' } }, weekRow.mastery),
        h('div', { class: 'row wrap' },
          h('a', { class: 'btn primary', href: next.href }, next.label, icon('right')),
          h('a', { class: 'btn', href: `#/tema/${cur}` }, 'Ver el tema')))));
  } else {
    const ready = await topicReady(weekRow.week);
    const canStart = L.isUnlocked(weekRow.week);
    main.append(h('div', { class: 'eyebrow' }, `${greeting()}, ${S.profile.name} · Siguiente · Tema ${weekRow.week} · Fase ${weekRow.phase}`),
      h('h1', { id: 'hoy-main', class: 'hero-title', style: { marginBottom: '8px' } }, weekRow.title), h('p', { class: 'muted', style: { maxWidth: '56ch' } }, weekRow.mastery));
    if (!ready) main.append(note('warn', 'El contenido de este tema se está preparando. Aparecerá automáticamente; vuelve a abrir la app mañana.', 'clock'));
    main.append(h('div', { class: 'row wrap', style: { marginTop: '18px' } },
      h('button', { class: 'btn primary', disabled: !ready || !canStart, onclick: () => startAndGo(weekRow.week) }, icon('play'), `Iniciar tema ${weekRow.week}`),
      h('a', { class: 'btn', href: `#/tema/${weekRow.week}` }, 'Ver detalles')));
  }
  view.append(main);

  // ---- Indicadores
  const goalPct = Math.min(100, Math.round(min / goal * 100));
  const gam = S.profile.gamification;
  view.append(h('div', { class: 'grid', style: { gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', marginTop: '16px' } },
    stat('clock', [num(min), h('small', { class: 'faint', style: { fontSize: '.9rem', fontWeight: 600 } }, ` / ${goal} min`)], 'Meta de hoy',
      h('div', { class: 'bar' + (goalPct >= 100 ? ' ok' : ''), style: { marginTop: '10px' } }, h('i', { style: { width: goalPct + '%' } })), '#/registro'),
    gam ? stat('flame', num(S.streak.count), S.streak.count === 1 ? 'día de racha' : 'días de racha') : null,
    gam ? stat('zap', [num(S.xp), h('small', { class: 'faint', style: { fontSize: '.9rem', fontWeight: 600 } }, ' XP')], `Nivel ${lv.n}`,
      h('div', { class: 'bar', style: { marginTop: '10px' } }, h('i', { style: { width: (lv.into / lv.size * 100) + '%' } }))) : null,
    stat('repeat', num(due), due === 1 ? 'pregunta para repasar' : 'preguntas para repasar', null, '#/repaso'),
    stat('target', [num(doneCount), h('small', { class: 'faint', style: { fontSize: '.9rem', fontWeight: 600 } }, ` / ${total}`)], 'temas completados',
      h('div', { class: 'bar', style: { marginTop: '10px' } }, h('i', { style: { width: (doneCount / total * 100) + '%' } })), '#/ruta')));

  const colL = h('div'), colR = h('div');
  const split = h('div', { class: 'split' }, colL, colR);
  view.append(split);

  // ---- Semana: últimos 7 días
  const days = Array.from({ length: 7 }, (_, i) => { const d = addDays(new Date(), i - 6); return { d, m: L.minutesOn(dayKey(d)) }; });
  colL.append(h('section', { class: 'card', 'aria-labelledby': 'sem-t' },
    h('div', { class: 'row between wrap', style: { marginBottom: '14px' } }, h('h2', { id: 'sem-t', style: { margin: 0, fontSize: '1.1rem' } }, 'Tu semana'), h('span', { class: 'hint' }, 'Un cuadro encendido = estudiaste ese día')),
    h('div', { class: 'weekstrip' }, days.map(({ d, m }, i) => h('div', { class: 'wk' + (m ? ' on' : '') + (m >= goal ? ' goal' : '') + (i === 6 ? ' today' : ''), title: `${m} min` },
      h('i', null, m ? (m >= goal ? icon('check') : m) : ''), d.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', ''))))));

  // ---- Checklist de la semana en curso
  if (cur && chk[cur]) {
    const items = chk[cur];
    const t = topicOf(cur);
    const doneN = items.filter((_, i) => t.checklist?.[i]).length;
    colL.append(h('section', { class: 'card', 'aria-labelledby': 'chk-t' },
      h('div', { class: 'row between' }, h('h2', { id: 'chk-t', style: { margin: 0, fontSize: '1.1rem' } }, 'Checklist de la semana'), h('span', { class: 'chip' }, `${doneN} de ${items.length}`)),
      h('div', { style: { marginTop: '8px' } }, items.map((txt, i) => h('label', { class: 'check' },
        h('input', { type: 'checkbox', checked: !!t.checklist?.[i], onchange: e => L.toggleCheck(cur, i, e.target.checked) }), h('span', null, txt))))));
  }

  // ---- Lo que viene
  const after = route.weeks.filter(w => w.week > (weekRow?.week || 0) && !L.isDone(w.week)).slice(0, 3);
  if (after.length) {
    colR.append(h('h2', { style: { margin: '0', fontSize: '1.1rem' } }, 'Lo que viene'),
      h('div', { class: 'upnext' }, after.map(w => h('a', { href: `#/tema/${w.week}`, style: { '--ph': `var(--ph-${w.phase})` } },
        h('span', { class: 'chip', style: { color: 'var(--ph)', borderColor: 'var(--ph)' } }, w.week),
        h('div', null, h('b', null, w.title), h('small', null, `Fase ${w.phase}`))))));
  }
  if (!colR.children.length) split.style.gridTemplateColumns = 'minmax(0, 1fr)';
  return view;
}
