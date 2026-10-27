// Estado de progreso (privado). Vive en este dispositivo y se sincroniza con el backend de Google Sheets.
const LS = 'rfs.state.v1';
const subs = new Set();
let changeHook = null;

export const defaults = () => ({
  v: 1, updated: 0,
  profile: { name: 'Alejo', theme: 'auto', accent: 'atardecer', avatar: 'a00', gamification: true, goalMin: 120 },
  current: null,          // semana en curso
  topics: {},             // { [semana]: { done, startedAt, doneAt, cuaderno, ex, checklist, trabajo, exams } }
  xp: 0, awards: {},      // awards: claves ya premiadas (evita XP doble)
  streak: { count: 0, last: '' },
  sessions: [],           // { date, min, week, note }
  badges: {},             // { [id]: { aplicado: {...}, avanzado: {...} } }
  review: {},             // repaso espaciado: { [qid]: { box, due } }
  notes: {},              // notas del Cuaderno: { 'semana:hoja': texto }
  marks: {},              // marcadores del Cuaderno: { 'semana:hoja': 1 }
  cards: {},              // tarjetas propias de repaso: { id: { q, a, box, due } }
  entregas: {},           // { [idBackend]: { kind: 'trabajo'|'badge', week, badge?, level?, applied? } }
});

function read() {
  try {
    const raw = localStorage.getItem(LS);
    if (!raw) return defaults();
    return Object.assign(defaults(), JSON.parse(raw));
  } catch { return defaults(); }
}
let S = read();

export const state = () => S;
export const subscribe = fn => { subs.add(fn); return () => subs.delete(fn); };
export const onLocalChange = fn => { changeHook = fn; };

function persist() {
  try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) { console.warn('No se pudo guardar el progreso', e); }
}
/** Cambia el estado, lo guarda y avisa a la interfaz y a la sincronización. */
export function mutate(fn, { quiet = false } = {}) {
  fn(S);
  S.updated = Date.now();
  if (S.sessions.length > 500) S.sessions = S.sessions.slice(-500);
  persist();
  if (!quiet) subs.forEach(f => f(S));
  if (changeHook) changeHook();
}
/** Sustituye el estado completo (importación o datos más nuevos del servidor). */
export function replaceState(next, { keepUpdated = true } = {}) {
  S = Object.assign(defaults(), next);
  if (!keepUpdated) S.updated = Date.now();
  persist();
  subs.forEach(f => f(S));
}

// ---- Atajos de lectura
export const topicOf = w => S.topics[w] || {};
export const profile = () => S.profile;


// ---- Exportar / importar
export function exportJSON() { return JSON.stringify({ app: 'ruta-full-stack', exported: new Date().toISOString(), state: S }, null, 1); }
export function importJSON(text) {
  const o = JSON.parse(text);
  if (o.app !== 'ruta-full-stack' || !o.state) throw new Error('El archivo no es una copia de progreso válida.');
  replaceState(o.state, { keepUpdated: false });
}
export function resetAll() { localStorage.removeItem(LS); S = defaults(); subs.forEach(f => f(S)); }
