// Cliente del backend (Google Apps Script sobre Google Sheets).
// La URL es pública; el acceso lo protege una clave que cada dispositivo guarda solo en su navegador.
//
// Reglas que protegen el progreso (lecciones de un fallo real):
//  1. Un dispositivo "virgen" (sin temas, XP ni sesiones) JAMÁS sobrescribe una nube con progreso,
//     aunque su marca de tiempo sea más reciente.
//  2. Al abrir la app con clave, se espera a la primera sincronización antes de mostrar nada,
//     para que nadie pueda tocar un estado vacío mientras llega el real.
//  3. El servidor también rechaza un estado vacío sobre uno con progreso (defensa en profundidad).
import { getConfig } from './content.js';
import { state, mutate, replaceState, getKey, onLocalChange } from './store.js';
import { debounce } from './util.js';

let status = 'off';           // off | idle | syncing | ok | error
let detail = '';
let lastOk = 0, lastMs = 0, dirty = false, firstPullDone = false;
const listeners = new Set();
export const syncStatus = () => ({ status, detail, lastOk, lastMs, dirty });
export const onSyncStatus = fn => { listeners.add(fn); return () => listeners.delete(fn); };
function set(s, d = '') { status = s; detail = d; if (s === 'ok') lastOk = Date.now(); listeners.forEach(f => f(syncStatus())); }

export const hasKey = () => !!getKey();

/** Un estado local sin nada de estudio: recién creado en un dispositivo nuevo. */
export function isPristine(s = state()) {
  return !Object.keys(s.topics || {}).length && !s.xp && !(s.sessions || []).length && !Object.keys(s.review || {}).length && !Object.keys(s.entregas || {}).length;
}
const hasProgress = s => !!s && (Object.keys(s.topics || {}).length > 0 || s.xp > 0);

function friendly(e) {
  const m = String(e && e.message || e);
  if (e && e.name === 'AbortError') return 'El servidor tardó demasiado en responder';
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'Sin internet o bloqueado por el navegador';
  if (/clave inválida/i.test(m)) return 'La clave no es correcta';
  if (/Unexpected token|JSON/i.test(m)) return 'El servidor devolvió una respuesta inesperada (¿despliegue desactualizado?)';
  return m;
}
const transient = e => e && (e.name === 'AbortError' || /Failed to fetch|NetworkError|Load failed|Unexpected token|JSON/i.test(String(e.message)));
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function once(accion, extra, timeout, keepalive) {
  const key = getKey();
  if (!key) throw new Error('sin-clave');
  const { url } = await getConfig();
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeout);
  const t0 = performance.now();
  try {
    // text/plain evita la comprobación previa de CORS que Apps Script no admite
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ accion, key, ...extra }), signal: ctl.signal, keepalive });
    const j = await r.json();
    lastMs = Math.round(performance.now() - t0);
    if (!j.ok) throw new Error(j.error || 'Error del servidor');
    return j.data;
  } finally { clearTimeout(t); }
}

/** Llama al backend. Reintenta una vez si el fallo es transitorio (arranque en frío de Apps Script, red). */
export async function call(accion, extra = {}, { timeout = 25000, keepalive = false, retry = true } = {}) {
  try { return await once(accion, extra, timeout, keepalive); }
  catch (e) {
    if (retry && !keepalive && transient(e)) { await sleep(1200); return once(accion, extra, timeout, keepalive); }
    throw e;
  }
}

export async function ping() { return (await call('ping')).rol; }

/** Prueba la conexión y devuelve un resultado legible para mostrar al usuario. */
export async function diagnose() {
  if (!hasKey()) return { ok: false, msg: 'No hay clave guardada en este dispositivo.' };
  if (!navigator.onLine) return { ok: false, msg: 'El dispositivo no tiene internet.' };
  try { const rol = await ping(); return { ok: true, msg: `Conectado como ${rol === 'admin' ? 'tutor' : 'estudiante'} · ${lastMs} ms`, rol }; }
  catch (e) { return { ok: false, msg: friendly(e) }; }
}

/** Trae el estado remoto. Gana el más reciente, salvo que el local esté virgen y la nube tenga progreso. */
export async function pull() {
  if (!hasKey()) { set('off'); firstPullDone = true; return false; }
  set('syncing');
  try {
    const r = await call('leerEstado');
    firstPullDone = true;
    const local = state();
    const remoteOk = !!(r.estado && r.estado.v);
    // Regla 1: un dispositivo nuevo siempre adopta el progreso de la nube, sin mirar fechas.
    if (remoteOk && isPristine(local) && hasProgress(r.estado)) {
      replaceState(r.estado); dirty = false; set('ok', 'Progreso recuperado desde la nube'); return true;
    }
    if (remoteOk && r.actualizado > local.updated) {
      replaceState(r.estado); dirty = false; set('ok', 'Datos actualizados desde la nube'); return true;
    }
    if (!remoteOk || local.updated > (r.actualizado || 0) || dirty) {
      if (isPristine(local)) { set('ok'); return false; }       // nada que subir
      if (local.updated <= (r.actualizado || 0)) mutate(() => {}, { quiet: true });
      await push(true);
    } else set('ok');
    return false;
  } catch (e) { firstPullDone = true; set('error', friendly(e)); return false; }
}

export async function push(silent = false, keepalive = false) {
  if (!hasKey()) { set('off'); return; }
  const s = state();
  if (isPristine(s)) return;                                   // regla 1: nunca se sube un estado virgen
  if (!silent) set('syncing');
  try {
    const r = await call('guardarEstado', { estado: s, actualizado: s.updated }, { keepalive });
    if (!r.guardado) {
      if (r.estado && r.estado.v) { replaceState(r.estado); dirty = false; set('ok', 'La nube tenía datos más nuevos'); }
      else { mutate(() => {}, { quiet: true }); set('idle'); }  // nube inválida: se reintenta con marca nueva
    } else { dirty = false; set('ok'); }
  } catch (e) { set('error', friendly(e)); }
}

const pushSoon = debounce(() => {
  if (!hasKey()) return;
  if (navigator.onLine) push(true); else set('error', 'Sin internet: se guardará al volver');
}, 2500);
onLocalChange(() => { dirty = true; if (firstPullDone) pushSoon(); });

// Al salir o ocultar la pestaña, se envía lo pendiente con keepalive (sobrevive al cierre de la página)
function flush() { if (dirty && hasKey() && firstPullDone && !isPristine()) push(true, true); }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
window.addEventListener('pagehide', flush);
window.addEventListener('online', () => { if (hasKey()) pull(); });

export function initSync() { set(hasKey() ? 'idle' : 'off'); if (!hasKey()) firstPullDone = true; }
export async function syncNow() { await pull(); }
export const isSyncReady = () => firstPullDone;
