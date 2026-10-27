// Vista Ruta: las fases y semanas con su estado.
import { h } from '../util.js';
import { icon } from '../icons.js';
import { getRoute } from '../content.js';
import * as L from '../logic.js';
import { state } from '../store.js';
import { heading, statusChip } from './ui.js';

export async function ruta() {
  const route = await getRoute();
  const S = state();
  const view = h('div', { class: 'view' });
  const done = route.weeks.filter(w => L.isDone(w.week)).length;
  view.append(heading('Ruta Full Stack', `${route.weeks.length} temas en ${route.phases.length} fases, de cero a un perfil profesional. El orden es acumulativo: no se salta ningún tema.`),
    h('div', { class: 'card flat row between wrap', style: { marginBottom: '20px' } },
      h('div', null, h('b', { class: 'tnum', style: { fontSize: '1.4rem' } }, `${done}`), h('span', { class: 'muted' }, ` de ${route.weeks.length} temas completados`)),
      h('div', { class: 'bar', style: { flex: 1, minWidth: '160px' } }, h('i', { style: { width: (done / route.weeks.length * 100) + '%' } }))));

  const currentPhase = route.weeks.find(w => w.week === (S.current || route.weeks.find(x => !L.isDone(x.week))?.week))?.phase;
  for (const ph of route.phases) {
    const ws = route.weeks.filter(w => w.phase === ph.id);
    const n = ws.filter(w => L.isDone(w.week)).length;
    const det = h('details', { class: 'phase', open: ph.id === currentPhase },
      h('summary', null,
        h('span', { class: 'pn' }, ph.id),
        h('div', { style: { flex: 1, minWidth: 0 } }, h('div', { style: { fontWeight: 700 } }, ph.title), h('div', { class: 'muted', style: { fontSize: '.88rem' } }, ph.summary)),
        h('span', { class: 'chip ' + (n === ws.length ? 'ok' : '') }, `${n}/${ws.length}`),
        icon('right', 'chev')),
      h('div', { class: 'weeks' }, ws.map(w => {
        const st = L.statusOf(w.week);
        return h('a', { class: 'step ' + (st === 'done' ? 'done' : st === 'active' ? 'now' : st === 'locked' ? 'locked' : ''), href: `#/tema/${w.week}` },
          h('span', { class: 'dot' }, st === 'done' ? icon('check') : st === 'locked' ? icon('lock') : w.week),
          h('div', { class: 'grow' },
            h('div', { class: 't' }, `${w.week}. ${w.title}`),
            h('div', { class: 's' }, w.mastery),
            w.design ? h('div', { class: 'designnote', style: { marginTop: '4px' } }, w.design) : null),
          statusChip(st));
      })));
    view.append(det);
  }
  return view;
}
