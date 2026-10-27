// Tema: panel del tema, ejercicios y trabajo.
import { h, inline, toast, fmtDateTime, confirmDialog } from '../util.js';
import { icon } from '../icons.js';
import { getRoute, getTopic, getChecklist, topicReady, weekInfo } from '../content.js';
import { state, topicOf } from '../store.js';
import * as L from '../logic.js';
import { back, heading, note, paragraphBoxes, statusChip, ring, fmtScore } from './ui.js';

export async function startAndGo(w) {
  if (!(await topicReady(w))) { toast('Este tema aún se está preparando.', 'bad'); return; }
  if (state().current && state().current !== w) { toast(`Termina primero el tema ${state().current}.`, 'bad'); return; }
  if (!L.isUnlocked(w)) { toast('Completa el tema anterior para abrir este.', 'bad'); return; }
  L.startTopic(w);
  location.hash = `#/cuaderno/${w}/1`;
}

// ------------------------------------------------------------------ panel del tema
export async function tema({ w }) {
  w = Number(w);
  const info = await weekInfo(w);
  if (!info) return h('div', { class: 'view' }, heading('Tema no encontrado'), back('#/ruta', 'Volver a la ruta'));
  const topic = await getTopic(w).catch(() => null);
  const ready = await topicReady(w);
  const chk = (await getChecklist())[w] || [];
  const st = L.statusOf(w), t = topicOf(w);
  const nEx = topic?.exercises?.length || 0;
  const view = h('div', { class: 'view wide' });
  view.append(back('#/ruta', 'Ruta'),
    h('header', { class: 'tema-hero', 'data-n': w, style: { '--ph': `var(--ph-${info.phase})` } },
      h('div', { class: 'row between wrap', style: { marginBottom: '8px' } }, h('div', { class: 'eyebrow', style: { margin: 0 } }, `Tema ${w} · Fase ${info.phase}`), statusChip(st)),
      h('h1', { tabindex: '-1', id: 'view-title' }, info.title), h('p', { class: 'lead' }, info.mastery)));
  view.append(h('div', { class: 'card flat', style: { marginBottom: '16px' } },
    h('div', { class: 'eyebrow' }, 'Evidencia esperada'), h('p', { style: { margin: 0 } }, info.evidence),
    info.design ? h('div', { class: 'designnote', style: { marginTop: '10px' } }, info.design) : null));

  if (st === 'locked') { view.append(note('warn', `Completa el tema ${w - 1} para abrir este.`, 'lock')); return view; }
  if (ready) view.append(offlineRow(w));
  if (!ready) view.append(note('warn', 'El contenido de este tema (Cuaderno, ejercicios, trabajo y exámenes) se está preparando y aparecerá automáticamente.', 'clock'));

  if (st === 'available') {
    view.append(h('button', { class: 'btn primary block', disabled: !ready || (state().current && state().current !== w), onclick: () => startAndGo(w) }, icon('play'), `Iniciar tema ${w}`));
    if (state().current && state().current !== w) view.append(h('p', { class: 'hint', style: { marginTop: '8px' } }, `Hay un tema en curso (${state().current}). Solo se estudia uno a la vez.`));
    return view;
  }

  // ---- Pasos del tema
  const c = L.cuaderno(w), tr = L.trabajo(w);
  const exDone = Object.values(t.ex || {}).filter(Boolean).length;
  const steps = [
    { id: 'c', label: 'Fundamentación', sub: c.done ? 'Terminada' : `Hoja ${c.page || 1}${c.total ? ' de ' + c.total : ''}`, state: c.done ? 'done' : 'now', href: `#/cuaderno/${w}/${c.done ? 1 : (c.page || 1)}`, ico: 'book' },
    { id: 'e', label: 'Ejercicios guiados', sub: nEx ? `${exDone} de ${nEx} hechos` : '—', state: nEx && exDone === nEx ? 'done' : 'todo', href: `#/ejercicios/${w}`, ico: 'pen' },
    { id: 't', label: 'Trabajo', sub: tr.approved ? `Aprobado · ${fmtScore(tr.nota)}` : tr.status === 'pending' ? 'Enviado · esperando calificación del tutor' : tr.status === 'graded' ? `Calificado ${fmtScore(tr.nota)} · hay que corregir y reenviar` : (L.trabajoLock(w) || 'Pendiente'), state: tr.approved ? 'done' : L.trabajoLock(w) ? 'locked' : 'todo', href: `#/trabajo/${w}`, ico: 'send' },
    ...L.LEVELS.map(lv => {
      const e = L.examOf(w, lv), lock = L.examLock(w, lv);
      return { id: lv, label: `Examen ${L.LEVEL_LABEL[lv]}`, sub: e.passed ? `Aprobado · mejor ${fmtScore(e.best)}` : lock ? lock : e.attempts.length ? `Mejor ${fmtScore(e.best)} · ${e.attempts.length} intento(s)` : 'Sin presentar', state: e.passed ? 'done' : lock ? 'locked' : 'todo', href: `#/examen/${w}/${lv}`, ico: 'exam' };
    }),
  ];
  const firstOpen = steps.findIndex(s => s.state !== 'done' && s.state !== 'locked');
  const colL = h('div'), colR = h('div');
  view.append(h('div', { class: 'split' }, colL, colR));
  colL.append(h('section', { class: 'card', 'aria-labelledby': 'pasos' },
    h('div', { class: 'row between', style: { marginBottom: '12px' } }, h('h2', { id: 'pasos', style: { margin: 0 } }, 'Camino del tema'), ring(L.progress(w, nEx), 56)),
    h('ol', { class: 'steps' }, steps.map((s, i) => {
      const cls = 'step ' + (s.state === 'done' ? 'done' : s.state === 'locked' ? 'locked' : i === firstOpen ? 'now' : '');
      const body = [h('span', { class: 'dot' }, s.state === 'done' ? icon('check') : s.state === 'locked' ? icon('lock') : i + 1),
        h('div', { class: 'grow' }, h('div', { class: 't' }, s.label), h('div', { class: 's' }, s.sub)), s.state !== 'locked' ? icon('right') : null];
      return h('li', null, s.state === 'locked' ? h('div', { class: cls, 'aria-disabled': 'true' }, body) : h('a', { class: cls, href: s.href }, body));
    }))));

  if (chk.length) {
    const doneN = chk.filter((_, i) => t.checklist?.[i]).length;
    colR.append(h('section', { class: 'card', 'aria-labelledby': 'chk' },
      h('div', { class: 'row between' }, h('h2', { id: 'chk', style: { margin: 0 } }, 'Checklist de la semana'), h('span', { class: 'chip' }, `${doneN} de ${chk.length}`)),
      h('div', { style: { marginTop: '8px' } }, chk.map((txt, i) => h('label', { class: 'check' },
        h('input', { type: 'checkbox', checked: !!t.checklist?.[i], disabled: st === 'done' && false, onchange: e => L.toggleCheck(w, i, e.target.checked) }), h('span', null, txt))))));
  }
  return view;
}

// ------------------------------------------------------------------ ejercicios
export async function ejercicios({ w }) {
  w = Number(w);
  const info = await weekInfo(w), topic = await getTopic(w).catch(() => null);
  const st = L.statusOf(w), t = topicOf(w);
  const view = h('div', { class: 'view narrow' });
  view.append(back(`#/tema/${w}`, `Tema ${w}`), heading('Ejercicios guiados', `${info?.title || ''}. Cada ejercicio trae su objetivo, los pasos, el resultado esperado y cómo verificar que quedó bien.`));
  if (!topic || !topic.exercises.length) { view.append(note('warn', 'Los ejercicios de este tema se están preparando.', 'clock')); return view; }
  if (st === 'locked' || st === 'available') { view.append(note('warn', 'Inicia el tema para registrar tus ejercicios.', 'lock')); }
  view.append(h('a', { class: 'btn sm', href: '#/lab', onclick: () => labMode(info?.phase), style: { marginBottom: '16px' } }, icon('play'), 'Abrir el laboratorio para practicar'));
  for (const ex of topic.exercises) {
    const done = !!t.ex?.[ex.n];
    const card = h('section', { class: 'card', style: { marginBottom: '16px' } },
      h('div', { class: 'row between wrap' }, h('h2', { style: { margin: 0, fontSize: '1.1rem' } }, ex.title), done ? h('span', { class: 'chip ok' }, icon('check'), 'Hecho') : null),
      h('div', { class: 'eyebrow', style: { marginTop: '14px' } }, 'Objetivo'), h('p', null, inline(ex.objective)),
      h('div', { class: 'eyebrow' }, 'Pasos'),
      h('ol', { style: { paddingLeft: '1.2em', margin: '0 0 14px' } }, ex.steps.map(s => h('li', { style: { marginBottom: '10px' } }, h('div', null, inline(s.hacer)),
        s.esperado ? h('div', { class: 'muted', style: { fontSize: '.92rem' } }, h('strong', null, 'Esperado: '), inline(s.esperado)) : null))),
      ex.example ? h('div', { class: 'prose-box', style: { marginBottom: '10px' } }, h('div', { class: 'eyebrow' }, 'Resultado de referencia'), h('p', null, inline(ex.example))) : null,
      ex.verification ? h('div', { class: 'prose-box' }, h('div', { class: 'eyebrow' }, 'Verificación final'), h('p', null, inline(ex.verification))) : null,
      st === 'active' || st === 'done' ? h('div', { style: { marginTop: '16px' } }, h('button', { class: 'btn ' + (done ? '' : 'primary'), onclick: () => { L.toggleEx(w, ex.n, !done); location.hash = `#/ejercicios/${w}?r=${Date.now()}`; } }, done ? 'Marcar como pendiente' : 'Marcar como hecho')) : null);
    view.append(card);
  }
  return view;
}

// ------------------------------------------------------------------ trabajo
export async function trabajoView({ w }) {
  w = Number(w);
  const info = await weekInfo(w), topic = await getTopic(w).catch(() => null);
  const st = L.statusOf(w), tr = L.trabajo(w), lock = L.trabajoLock(w);
  const view = h('div', { class: 'view narrow' });
  view.append(back(`#/tema/${w}`, `Tema ${w}`), heading(topic?.trabajo?.title || `Trabajo del tema ${w}`, 'Una situación nueva, sin guía. Se resuelve aplicando este tema y lo acumulado de los anteriores.', `Tema ${w} · ${info?.title || ''}`));
  if (st === 'locked' || st === 'available') { view.append(note('warn', 'Inicia el tema para ver y entregar el trabajo.', 'lock')); return view; }
  if (!topic?.trabajo?.description) { view.append(note('warn', 'El enunciado de este trabajo se está preparando.', 'clock')); return view; }

  view.append(h('div', { class: 'card flat', style: { marginBottom: '16px' } },
    h('div', { class: 'row wrap', style: { marginBottom: '12px' } }, h('span', { class: 'chip' }, icon('clock'), `~${Math.round((topic.trabajo.estimated_minutes || 240) / 60)} h`), h('span', { class: 'chip' }, `Aprueba con ${L.PASS.toFixed(1).replace('.', ',')} o más`)),
    ...paragraphBoxes(topic.trabajo.description)));

  // ---- estado de la entrega
  if (tr.status === 'pending') {
    view.append(h('section', { class: 'card tint' }, h('h2', null, 'Enviado al tutor'), h('p', { class: 'muted' }, `Entregado el ${fmtDateTime(tr.submittedAt)}. Tu tutor lo revisa y te deja nota y retroalimentación (hasta 24 h).`),
      h('button', { class: 'btn', id: 'chk-grade', onclick: async e => { e.currentTarget.disabled = true; try { const n = await L.refreshGrades(); toast(n ? 'Calificación recibida' : 'Todavía sin calificar', n ? 'ok' : ''); } catch (x) { toast('No se pudo consultar: ' + x.message, 'bad'); } location.hash = `#/trabajo/${w}?r=${Date.now()}`; } }, icon('refresh'), 'Consultar calificación')));
    view.append(h('details', { class: 'card flat', style: { marginTop: '12px' } }, h('summary', { style: { cursor: 'pointer', fontWeight: 650 } }, 'Ver lo que entregaste'), h('pre', { style: { whiteSpace: 'pre-wrap', fontFamily: 'var(--font)', margin: '12px 0 0' } }, tr.text)));
    return view;
  }
  if (tr.status === 'graded') {
    view.append(h('section', { class: 'card', 'aria-labelledby': 'nota' },
      h('div', { class: 'row between wrap' }, h('h2', { id: 'nota', style: { margin: 0 } }, 'Calificación del tutor'), tr.approved ? h('span', { class: 'chip ok' }, icon('check'), 'Aprobado') : h('span', { class: 'chip bad' }, 'Por corregir')),
      h('div', { class: 'score-big', style: { margin: '14px 0', color: tr.approved ? 'var(--ok)' : 'var(--bad)' } }, fmtScore(tr.nota), h('small', { class: 'faint', style: { fontSize: '1.1rem' } }, ' / 10')),
      h('div', { class: 'eyebrow' }, 'Retroalimentación'), ...paragraphBoxes(tr.feedback || 'Sin comentarios.', 'feedback')));
    if (tr.approved) return view;
  }

  // ---- formulario de entrega
  if (lock) { view.append(note('warn', lock, 'lock')); return view; }
  const ta = h('textarea', { class: 'textarea', id: 'entrega', placeholder: 'Pega el enlace de tu repositorio o página publicada, y escribe una explicación breve de qué hiciste, qué decisiones tomaste y qué te costó.', rows: 8 });
  const btn = h('button', { class: 'btn primary', onclick: async () => {
    const text = ta.value.trim();
    if (text.length < 40) { toast('Escribe al menos 40 caracteres: enlace y explicación.', 'bad'); ta.focus(); return; }
    btn.disabled = true;
    try {
      await L.submitEntrega({ kind: 'trabajo', week: w, title: `Tema ${w} · ${topic.trabajo.title}`, text });
      toast('Trabajo enviado a tu tutor', 'ok');
    } catch (e) { toast('No se pudo enviar: ' + e.message, 'bad'); }
    location.hash = `#/trabajo/${w}?r=${Date.now()}`;
  } }, icon('send'), tr.status === 'graded' ? 'Reenviar trabajo corregido' : 'Entregar al tutor');
  view.append(h('section', { class: 'card', 'aria-labelledby': 'ent' }, h('h2', { id: 'ent' }, tr.status === 'graded' ? 'Corrige y reenvía' : 'Tu entrega'),
    h('div', { class: 'field', style: { marginTop: '12px' } }, h('label', { for: 'entrega' }, 'Enlace y explicación'), ta, h('span', { class: 'hint' }, 'El tutor solo ve lo que escribas aquí. No incluyas contraseñas ni datos personales.')), btn));
  return view;
}

// ------------------------------------------------------------------ extras
const pad2 = n => String(n).padStart(2, '0');
/** Abre el Laboratorio en el modo que le sirve a la fase del tema (SQL, JavaScript o web). */
function labMode(phase) {
  try { const k = 'rfs.lab.v1', s = JSON.parse(localStorage.getItem(k) || '{}'); s.mode = phase === 5 ? 'sql' : (phase === 3 || phase === 6) ? 'js' : 'web'; localStorage.setItem(k, JSON.stringify(s)); } catch {}
}
/** Botón para dejar el tema (y su examen) guardado en el dispositivo para estudiar sin internet. */
function offlineRow(w) {
  const topicUrl = `content/topics/${pad2(w)}.json`, examUrl = `content/exams/${pad2(w)}.json`;
  const row = h('div', { class: 'row wrap', style: { marginBottom: '16px' } });
  const paint = async () => {
    let saved = false; try { saved = !!(await caches.match(topicUrl)); } catch {}
    row.replaceChildren(saved ? h('span', { class: 'chip ok' }, icon('check'), 'Guardado para estudiar sin internet')
      : h('button', { class: 'btn sm', onclick: async e => {
        e.currentTarget.disabled = true;
        try { await Promise.all([topicUrl, examUrl].map(u => fetch(u).then(r => { if (!r.ok && r.status !== 404) throw new Error(r.status); }))); toast('Tema guardado: se puede estudiar sin conexión', 'ok'); }
        catch { toast('No se pudo guardar: revisa la conexión', 'bad'); }
        paint();
      } }, icon('download'), 'Guardar para estudiar sin internet'));
  };
  paint();
  return row;
}
