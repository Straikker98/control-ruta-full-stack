// Cliente del backend (Google Apps Script sobre Google Sheets).
// La URL es pública; el acceso lo protege una clave que cada dispositivo guarda solo en su navegador.
import { getConfig } from './content.js';
import { state, mutate, replaceState, getKey, onLocalChange } from './store.js';
import { debounce } from './util.js';

let status = 'off';           // off | idle | syncing | ok | error
let detail = '';
const listeners = new Set();
export const syncStatus = () => ({ status, detail });
export const onSyncStatus = fn => { listeners.add(fn); return () => listeners.delete(fn); };
function set(s, d = '') { status = s; detail = d; listeners.forEach(f => f({ status, detail })); }

export const hasKey = () => !!getKey();

export async function call(accion, extra = {}, timeout = 25000) {
  const key = getKey();
  if (!key) throw new Error('sin-clave');
  const { url } = await getConfig();
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeout);
  try {
    // text/plain evita la comprobación previa de CORS que Apps Script no admite
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ accion, key, ...extra }), signal: ctl.signal });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || 'Error del servidor');
    return j.data;
  } finally { clearTimeout(t); }
}

export async function ping() {
  const r = await call('ping');
  return r.rol;
}

/** Trae el estado remoto. Gana el más reciente, pero solo se adopta un estado remoto válido. */
export async function pull() {
  if (!hasKey()) { set('off'); return false; }
  set('syncing');
  try {
    const r = await call('leerEstado');
    const local = state();
    const remoteOk = !!(r.estado && r.estado.v);
    if (remoteOk && r.actualizado > local.updated) {
      replaceState(r.estado);
      set('ok', 'Datos actualizados desde la nube');
      return true;
    }
    if (!remoteOk || local.updated > (r.actualizado || 0)) {
      // La nube está vacía o es más vieja: el local manda. Se renueva la marca de tiempo para que el servidor lo acepte.
      if (local.updated <= (r.actualizado || 0)) mutate(() => {}, { quiet: true });
      await push(true);
    } else set('ok');
    return false;
  } catch (e) { set('error', e.message === 'sin-clave' ? '' : 'Sin conexión con la nube'); return false; }
}

export async function push(silent = false) {
  if (!hasKey()) { set('off'); return; }
  if (!silent) set('syncing');
  try {
    const s = state();
    const r = await call('guardarEstado', { estado: s, actualizado: s.updated });
    if (!r.guardado) {
      if (r.estado && r.estado.v) { replaceState(r.estado); set('ok', 'La nube tenía datos más nuevos'); }
      else { mutate(() => {}, { quiet: true }); set('idle'); }   // nube inválida: se reintenta con marca nueva
    } else set('ok');
  } catch (e) { set('error', 'No se pudo guardar en la nube'); }
}

const pushSoon = debounce(() => { if (hasKey() && navigator.onLine) push(true); else if (hasKey()) set('error', 'Sin conexión: se guardará al volver'); }, 2500);
onLocalChange(pushSoon);
window.addEventListener('online', () => { if (hasKey()) pull(); });

export function initSync() { set(hasKey() ? 'idle' : 'off'); }
export async function syncNow() { await pull(); }
