// Reglas de la plataforma. Todo lo que decide qué se desbloquea vive aquí.
import { state, mutate, topicOf } from './store.js';
import { dayKey, addDays, toast } from './util.js';
import { call, hasKey } from './sync.js';

export const LEVELS = ['facil', 'medio', 'dificil'];
export const LEVEL_LABEL = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil' };
export const PASS = 9.0;                 // nota mínima en todo: trabajos, exámenes e insignias
export const QUESTIONS_PER_ATTEMPT = 12;
const XP = { cuaderno: 40, ejercicio: 10, check: 3, trabajo: 100, facil: 40, medio: 60, dificil: 80, tema: 150, meta: 20, aplicado: 120, avanzado: 200 };

// ---------------------------------------------------------------- estado de un tema
export const isDone = w => !!topicOf(w).done;
export const isUnlocked = w => w === 1 || isDone(w - 1);
export function statusOf(w) {
  if (isDone(w)) return 'done';
  if (state().current === w) return 'active';
  return isUnlocked(w) ? 'available' : 'locked';
}
export const cuaderno = w => topicOf(w).cuaderno || { page: 1, max: 1, done: false };
export const trabajo = w => topicOf(w).trabajo || { status: 'none' };
export const examOf = (w, lv) => (topicOf(w).exams || {})[lv] || { attempts: [], best: 0, passed: false };

export function examLock(w, lv) {
  const t = trabajo(w);
  if (lv === 'facil') return t.status === 'none' ? 'Envía el trabajo del tema para abrir el examen Fácil.' : '';
  const prev = LEVELS[LEVELS.indexOf(lv) - 1];
  return examOf(w, prev).passed ? '' : `Aprueba el examen ${LEVEL_LABEL[prev]} (${PASS.toFixed(1)} o más) para abrir este.`;
}
export const trabajoLock = w => (cuaderno(w).done ? '' : 'Termina la fundamentación (Cuaderno) para enviar el trabajo.');

export function progress(w, nExercises = 0) {
  const t = topicOf(w);
  if (t.done) return 100;
  if (!t.startedAt) return 0;
  const c = cuaderno(w);
  const parts = [
    c.done ? 1 : (c.total ? Math.min(1, (c.max - 1) / c.total) : 0),
    nExercises ? Math.min(1, Object.values(t.ex || {}).filter(Boolean).length / nExercises) : 0,
    trabajo(w).approved ? 1 : trabajo(w).status === 'pending' ? .5 : 0,
    ...LEVELS.map(l => (examOf(w, l).passed ? 1 : 0)),
  ];
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length * 100);
}

/** Siguiente acción del tema en curso: lleva directo a lo que toca. */
export function nextStep(w) {
  const c = cuaderno(w), t = trabajo(w);
  if (!c.done) return { label: 'Seguir la fundamentación', href: `#/cuaderno/${w}/${c.page || 1}` };
  if (!t.approved && t.status === 'none') return { label: 'Hacer el trabajo', href: `#/trabajo/${w}` };
  if (t.status === 'pending' && !examOf(w, 'facil').passed) return { label: 'Presentar examen Fácil', href: `#/examen/${w}/facil` };
  for (const lv of LEVELS) if (!examOf(w, lv).passed && !examLock(w, lv)) return { label: `Presentar examen ${LEVEL_LABEL[lv]}`, href: `#/examen/${w}/${lv}` };
  if (!t.approved) return { label: 'Ver el trabajo', href: `#/trabajo/${w}` };
  return { label: 'Ver el tema', href: `#/tema/${w}` };
}

// ---------------------------------------------------------------- XP, racha, minutos
function award(S, key, xp) {
  if (S.awards[key]) return false;
  S.awards[key] = 1; S.xp += xp; return true;
}
function touchStreak(S) {
  const today = dayKey(), y = dayKey(addDays(new Date(), -1));
  if (S.streak.last === today) return;
  S.streak.count = S.streak.last === y ? S.streak.count + 1 : 1;
  S.streak.last = today;
}
export const minutesOn = (date = dayKey()) => state().sessions.filter(s => s.date === date).reduce((a, s) => a + s.min, 0);
export const totalMinutes = () => state().sessions.reduce((a, s) => a + s.min, 0);

export function addSession(min, week, note = '') {
  if (min < 1) return;
  mutate(S => {
    S.sessions.push({ date: dayKey(), min, week: week || null, note });
    touchStreak(S);
    const today = S.sessions.filter(s => s.date === dayKey()).reduce((a, s) => a + s.min, 0);
    if (today >= S.profile.goalMin && award(S, 'meta:' + dayKey(), XP.meta)) toast(`Meta diaria cumplida · +${XP.meta} XP`, 'ok');
  });
}

// ---------------------------------------------------------------- acciones de estudio
export function startTopic(w) {
  mutate(S => {
    S.current = w;
    S.topics[w] = { startedAt: Date.now(), done: false, cuaderno: { page: 1, max: 1, done: false }, ex: {}, checklist: {}, trabajo: { status: 'none' }, exams: {} };
    touchStreak(S);
  });
}
export function readPage(w, page, total) {
  mutate(S => {
    const t = S.topics[w]; if (!t) return;
    t.cuaderno.page = page; t.cuaderno.total = total;
    t.cuaderno.max = Math.max(t.cuaderno.max || 1, page);
    touchStreak(S);
  }, { quiet: true });
}
export function finishCuaderno(w) {
  mutate(S => {
    const t = S.topics[w]; t.cuaderno.done = true;
    if (award(S, `cuaderno:${w}`, XP.cuaderno)) toast(`Fundamentación completa · +${XP.cuaderno} XP`, 'ok');
  });
}
export function toggleEx(w, n, on) {
  mutate(S => { const t = S.topics[w]; t.ex = t.ex || {}; t.ex[n] = on; if (on && award(S, `ex:${w}:${n}`, XP.ejercicio)) touchStreak(S); });
}
export function toggleCheck(w, i, on) {
  mutate(S => { const t = S.topics[w]; t.checklist = t.checklist || {}; t.checklist[i] = on; if (on && award(S, `chk:${w}:${i}`, XP.check)) touchStreak(S); });
}

// ---------------------------------------------------------------- exámenes
export function recordAttempt(w, lv, result) {
  // result: { correct, total, wrong: [qid], answered: n }
  const score = Math.round(result.correct / result.total * 100) / 10;
  const passed = score >= PASS;
  mutate(S => {
    const t = S.topics[w]; t.exams = t.exams || {};
    const e = t.exams[lv] = t.exams[lv] || { attempts: [], best: 0, passed: false };
    e.attempts.push({ at: Date.now(), score, correct: result.correct, total: result.total, passed });
    e.best = Math.max(e.best, score);
    if (passed && !e.passed) { e.passed = true; if (award(S, `exam:${w}:${lv}`, XP[lv])) toast(`Examen ${LEVEL_LABEL[lv]} aprobado · +${XP[lv]} XP`, 'ok'); }
    // repaso espaciado de lo fallado
    for (const q of result.wrong) S.review[q] = { box: 0, due: Date.now() };
    touchStreak(S);
  });
  checkComplete(w);
  return { score, passed };
}

// ---------------------------------------------------------------- trabajos e insignias (calificación del tutor)
export async function submitEntrega({ kind, week, title, text, badge, level }) {
  const r = await call('enviarTrabajo', { trabajo: { semana: week, titulo: title, contenido: text } });
  mutate(S => {
    S.entregas[r.id] = { kind, week, badge, level };
    if (kind === 'trabajo') {
      const t = S.topics[week]; const prev = t.trabajo || {};
      t.trabajo = { status: 'pending', text, submittedAt: Date.now(), entregaId: r.id, intentos: (prev.intentos || 0) + 1 };
      touchStreak(S);
    } else {
      S.badges[badge] = S.badges[badge] || {};
      S.badges[badge][level] = { status: 'pending', text, submittedAt: Date.now(), entregaId: r.id };
    }
  });
  return r.id;
}

/** Trae las calificaciones del tutor y las aplica una sola vez cada una. */
export async function refreshGrades() {
  if (!hasKey()) return 0;
  const list = await call('leerCalificaciones');
  const nuevas = list.filter(g => { const i = state().entregas[g.id]; return i && i.applied !== g.calificado; });
  if (!nuevas.length) return 0;                      // sin novedades: no se toca el estado ni se sube nada
  let applied = 0;
  mutate(S => {
    for (const g of nuevas) {
      const info = S.entregas[g.id];
      if (!info || info.applied === g.calificado) continue;
      info.applied = g.calificado;
      const approved = Number(g.nota) >= PASS;
      if (info.kind === 'trabajo') {
        const t = S.topics[info.week]; if (!t || !t.trabajo || t.trabajo.entregaId !== g.id) continue;
        Object.assign(t.trabajo, { status: 'graded', nota: Number(g.nota), feedback: g.retroalimentacion, approved, gradedAt: g.calificado });
        if (approved && award(S, `trabajo:${info.week}`, XP.trabajo)) toast(`Trabajo del tema ${info.week} aprobado · +${XP.trabajo} XP`, 'ok');
      } else if (info.kind === 'badge') {
        const b = (S.badges[info.badge] || {})[info.level]; if (!b || b.entregaId !== g.id) continue;
        Object.assign(b, { status: 'graded', nota: Number(g.nota), feedback: g.retroalimentacion, approved });
        if (approved && award(S, `badge:${info.badge}:${info.level}`, XP[info.level])) toast('Insignia desbloqueada', 'ok');
      }
      applied++;
    }
  });
  Object.keys(state().topics).forEach(w => checkComplete(Number(w)));
  return applied;
}

// ---------------------------------------------------------------- cierre de tema
export function checkComplete(w) {
  const t = topicOf(w);
  if (t.done || !t.cuaderno?.done || !t.trabajo?.approved) return false;
  if (!LEVELS.every(l => examOf(w, l).passed)) return false;
  mutate(S => {
    const x = S.topics[w]; x.done = true; x.doneAt = Date.now();
    if (S.current === w) S.current = null;
    if (award(S, `tema:${w}`, XP.tema)) toast(`Tema ${w} completado · +${XP.tema} XP`, 'ok');
  });
  return true;
}

/** Insignia "Fundamentos": se obtiene al completar el tema base. */
export const badgeFundamentos = week => isDone(week);

// ---------------------------------------------------------------- repaso espaciado
const INTERVALS = [0, 1, 3, 7, 14, 30]; // días por caja
export function dueReviews(now = Date.now()) {
  return Object.entries(state().review).filter(([, r]) => r.due <= now).map(([id]) => id);
}
export function gradeReview(qid, correct) {
  mutate(S => {
    const r = S.review[qid]; if (!r) return;
    if (!correct) { r.box = 0; r.due = Date.now() + 10 * 60 * 1000; return; }
    r.box += 1;
    if (r.box >= INTERVALS.length) { delete S.review[qid]; return; }
    r.due = Date.now() + INTERVALS[r.box] * 86400000;
  }, { quiet: true });
}

// ---------------------------------------------------------------- avatares
export const AVATAR_COUNT = 100;
export const avatarId = i => 'a' + String(i).padStart(2, '0');
export const avatarsUnlocked = () => Math.min(AVATAR_COUNT, 4 + 2 * Object.values(state().topics).filter(t => t.done).length);

export function accumulatedXp() { return state().xp; }
export function level() { const xp = state().xp; return { n: Math.floor(xp / 250) + 1, into: xp % 250, size: 250 }; }
