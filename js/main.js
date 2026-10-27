// Arranque, enrutador y barra superior (cronómetro de sesión y estado de sincronización).
import { h, clear, toast } from './util.js';
import { icon } from './icons.js';
import { state, subscribe } from './store.js';
import { openPalette } from './palette.js';
import { canPrompt, promptInstall, onInstallChange } from './install.js';
import { applyTheme } from './theme.js';
import { initSync, pull, hasKey, syncStatus, onSyncStatus, isPristine } from './sync.js';
import * as L from './logic.js';
import { avatar } from './avatar.js';
import { loading } from './views/ui.js';
import { hoy } from './views/hoy.js';
import { ruta } from './views/ruta.js';
import { tema, ejercicios, trabajoView } from './views/tema.js';
import { cuadernoView } from './views/cuaderno.js';
import { examenView, repasoView } from './views/examen.js';
import { insigniasView } from './views/insignias.js';
import { perfilView, registroView } from './views/perfil.js';
import { labView } from './views/lab.js';

const ROUTES = [
  [/^(?:hoy)?$/, () => hoy(), 'Hoy', 'hoy'],
  [/^ruta$/, () => ruta(), 'Ruta', 'ruta'],
  [/^tema\/(\d+)$/, w => tema({ w }), 'Tema', 'ruta'],
  [/^cuaderno\/(\d+)(?:\/(\d+))?$/, (w, p) => cuadernoView({ w, p }), 'Cuaderno', 'ruta'],
  [/^ejercicios\/(\d+)$/, w => ejercicios({ w }), 'Ejercicios', 'ruta'],
  [/^trabajo\/(\d+)$/, w => trabajoView({ w }), 'Trabajo', 'ruta'],
  [/^examen\/(\d+)\/(facil|medio|dificil)$/, (w, lv) => examenView({ w, lv }), 'Examen', 'ruta'],
  [/^repaso$/, () => repasoView(), 'Repaso', 'repaso'],
  [/^insignias$/, () => insigniasView(), 'Insignias', 'insignias'],
  [/^lab$/, () => labView(), 'Laboratorio', 'lab'],
  [/^registro$/, () => registroView(), 'Registro', 'perfil'],
  [/^perfil$/, () => perfilView(), 'Perfil', 'perfil'],
];

const root = document.getElementById('view');
let current = null, token = 0;

async function render() {
  const myToken = ++token;
  const path = location.hash.replace(/^#\/?/, '').split('?')[0].replace(/\/$/, '');
  let match = null;
  for (const [re, fn, title, nav] of ROUTES) { const m = path.match(re); if (m) { match = { fn, title, nav, args: m.slice(1) }; break; } }
  if (current?.cleanup) { try { current.cleanup(); } catch {} }
  document.querySelectorAll('[data-nav]').forEach(a => { if (a.dataset.nav === match?.nav) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  root.replaceChildren(loading());
  let view;
  try {
    view = match ? await match.fn(...match.args) : h('div', { class: 'view' }, h('h1', { id: 'view-title', tabindex: '-1' }, 'Página no encontrada'), h('a', { class: 'btn primary', href: '#/hoy' }, 'Ir a Hoy'));
  } catch (e) {
    console.error(e);
    view = h('div', { class: 'view narrow' }, h('h1', { id: 'view-title', tabindex: '-1' }, 'No se pudo cargar'), h('p', { class: 'muted' }, e.message), h('button', { class: 'btn primary', onclick: () => render() }, icon('refresh'), 'Reintentar'));
  }
  if (myToken !== token) return;             // llegó una navegación más reciente
  current = view;
  root.replaceChildren(view);
  document.title = `${match?.title || 'Ruta Full Stack'} · Ruta Full Stack`;
  window.scrollTo({ top: 0 });
  (document.getElementById('view-title') || view.querySelector('h1,h2'))?.focus?.({ preventScroll: true });
}

// ------------------------------------------------------------------ barra superior
const TIMER_KEY = 'rfs.timer';
const timerBox = document.getElementById('timer');
const syncBox = document.getElementById('sync');
const avatarBox = document.getElementById('me');
let tick = null;

const fmtClock = ms => { const s = Math.floor(ms / 1000), hh = Math.floor(s / 3600), mm = String(Math.floor(s / 60) % 60).padStart(2, '0'), ss = String(s % 60).padStart(2, '0'); return (hh ? hh + ':' : '') + mm + ':' + ss; };
function timerState() { try { return JSON.parse(localStorage.getItem(TIMER_KEY)); } catch { return null; } }

function paintTimer() {
  const t = timerState();
  clear(timerBox); timerBox.classList.toggle('running', !!t);
  const time = h('time', { 'aria-label': 'Tiempo de la sesión' }, t ? fmtClock(Date.now() - t.start) : '00:00');
  const btn = t
    ? h('button', { class: 'btn sm primary', onclick: stop, 'aria-label': 'Terminar y registrar la sesión' }, icon('stop'), 'Terminar')
    : h('button', { class: 'btn sm', onclick: start, 'aria-label': 'Iniciar sesión de estudio' }, icon('play'), 'Estudiar');
  timerBox.append(icon('clock'), time, btn);
  clearInterval(tick);
  if (t) tick = setInterval(() => { time.textContent = fmtClock(Date.now() - t.start); }, 1000);
}
function start() { localStorage.setItem(TIMER_KEY, JSON.stringify({ start: Date.now(), week: state().current })); paintTimer(); }
function stop() {
  const t = timerState(); if (!t) return;
  localStorage.removeItem(TIMER_KEY);
  const min = Math.round((Date.now() - t.start) / 60000);
  if (min < 1) toast('Sesión demasiado corta: no se registró.'); else { L.addSession(min, t.week); toast(`Sesión registrada: ${min} min`, 'ok'); }
  paintTimer();
  if (/#\/(hoy|registro)?$/.test(location.hash) || !location.hash) render();
}

function paintSync() {
  const { status, detail } = syncStatus();
  const map = { off: ['cloudoff', 'Sin sincronizar', ''], idle: ['cloud', 'Nube', ''], syncing: ['refresh', 'Sincronizando', ''], ok: ['cloud', 'Sincronizado', 'ok'], error: ['cloudoff', 'Sin conexión', 'warn'] };
  const [ic, label, cls] = map[status];
  clear(syncBox);
  syncBox.append(h('button', { class: 'chip syncchip ' + cls, title: detail || label, onclick: () => { pull().then(changed => changed && render()); } }, icon(ic), h('span', null, label)));
}
function paintMe() { clear(avatarBox); avatarBox.append(h('a', { href: '#/perfil', 'aria-label': 'Perfil', style: { display: 'block' } }, avatar(state().profile.avatar, 40))); }

// Tarjeta de nivel y racha (barra lateral) y botón de búsqueda
const xpBox = document.getElementById('navxp');
function paintXp() {
  const S = state(), lv = L.level();
  clear(xpBox); xpBox.hidden = !S.profile.gamification;
  xpBox.append(h('div', { class: 'lv' }, h('span', null, `Nivel ${lv.n}`), h('span', { class: 'fire' }, icon('flame'), S.streak.count)),
    h('div', { class: 'bar' }, h('i', { style: { width: (lv.into / lv.size * 100) + '%' } })),
    h('small', { class: 'faint tnum' }, `${S.xp} XP · ${lv.size - lv.into} para el nivel ${lv.n + 1}`));
}
const searchBtn = document.getElementById('search');
searchBtn.append(icon('search'), h('span', null, 'Buscar'), h('kbd', null, 'Ctrl K'));
searchBtn.addEventListener('click', openPalette);
const installBtn = document.getElementById('install');
installBtn.append(icon('down'), h('span', null, 'Instalar'));
installBtn.addEventListener('click', promptInstall);
const paintInstall = () => { installBtn.hidden = !canPrompt(); };
onInstallChange(paintInstall); paintInstall();

// ------------------------------------------------------------------ inicio
applyTheme();
initSync(); paintSync(); onSyncStatus(paintSync);
paintTimer(); paintMe(); paintXp(); subscribe(paintXp);
document.addEventListener('avatar-changed', paintMe);
window.addEventListener('hashchange', render);
document.addEventListener('pointermove', e => { const c = e.target.closest?.('.card, .stat'); if (c) { const r = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px'); } });
if (!location.hash) location.replace('#/hoy');

// Con clave, se espera (máx. 8 s) a la primera sincronización ANTES de mostrar la app:
// así nadie toca un estado vacío mientras llega el progreso real de la nube.
(async () => {
  {
    root.replaceChildren(loading());
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    await Promise.race([pull(), sleep(8000)]);
    applyTheme(); paintMe(); paintXp();
  }
  render();
  try { const n = await L.refreshGrades(); if (n) { toast(`${n} calificación(es) nueva(s) de tu tutor`, 'ok'); render(); } } catch { /* sin conexión: se reintenta al abrir */ }
})();

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
