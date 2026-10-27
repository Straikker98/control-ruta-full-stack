// Perfil, sincronización, copias de seguridad y Registro de sesiones.
import { h, toast, confirmDialog, dayKey, addDays, fmtDate, fmtMin, clear } from '../util.js';
import { icon } from '../icons.js';
import { getRoute } from '../content.js';
import { state, mutate, getKey, setKey, exportJSON, importJSON, resetAll } from '../store.js';
import * as L from '../logic.js';
import { syncNow, ping, syncStatus, onSyncStatus } from '../sync.js';
import { avatar } from '../avatar.js';
import { applyTheme } from '../theme.js';
import { heading, note } from './ui.js';

const ACCENTS = [['atardecer', 'Atardecer', '#d9480f'], ['oceano', 'Océano', '#0b7285'], ['bosque', 'Bosque', '#2b8a3e'], ['violeta', 'Violeta', '#6741d9'], ['grafito', 'Grafito', '#343a40']];

function section(title, ...kids) { return h('section', { class: 'card', style: { marginBottom: '16px' } }, h('h2', { style: { fontSize: '1.1rem' } }, title), ...kids); }

export async function perfilView() {
  const S = state(), P = S.profile;
  const view = h('div', { class: 'view narrow' });
  view.append(heading('Perfil', 'Tu cuenta de estudio, la apariencia y la sincronización entre dispositivos.'));

  // ---- Identidad
  const unlocked = L.avatarsUnlocked();
  const name = h('input', { class: 'input', id: 'nombre', value: P.name, maxlength: 40, onchange: e => mutate(S => { S.profile.name = e.target.value.trim() || 'Alejo'; }) });
  const grid = h('div', { class: 'avatar-grid', role: 'group', 'aria-label': 'Avatares' });
  for (let i = 0; i < L.AVATAR_COUNT; i++) {
    const id = L.avatarId(i);
    const b = h('button', { class: 'avatar-opt', type: 'button', disabled: i >= unlocked, 'aria-pressed': String(P.avatar === id), 'aria-label': `Avatar ${i + 1}${i >= unlocked ? ' (bloqueado)' : ''}`,
      onclick: () => { mutate(S => { S.profile.avatar = id; }, { quiet: true }); grid.querySelectorAll('.avatar-opt').forEach(x => x.setAttribute('aria-pressed', String(x === b))); document.dispatchEvent(new Event('avatar-changed')); } }, avatar(id, 54));
    grid.append(b);
  }
  view.append(section('Identidad',
    h('div', { class: 'row', style: { marginBottom: '16px' } }, avatar(P.avatar, 64), h('div', { class: 'field', style: { margin: 0, flex: 1 } }, h('label', { for: 'nombre' }, 'Nombre'), name)),
    h('div', { class: 'label', style: { marginBottom: '8px' } }, `Avatares (${unlocked} de ${L.AVATAR_COUNT} desbloqueados)`),
    h('p', { class: 'hint' }, 'Empiezas con 4 y desbloqueas 2 más por cada tema completado.'), grid));

  // ---- Apariencia
  const theme = h('div', { class: 'row wrap', role: 'radiogroup', 'aria-label': 'Tema' }, [['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']].map(([v, t]) =>
    h('button', { class: 'btn sm' + (P.theme === v ? ' primary' : ''), role: 'radio', 'aria-checked': String(P.theme === v), onclick: () => { mutate(S => { S.profile.theme = v; }); applyTheme(); location.hash = `#/perfil?r=${Date.now()}`; } }, t)));
  const acc = h('div', { class: 'row wrap', role: 'radiogroup', 'aria-label': 'Color de acento' }, ACCENTS.map(([v, t, c]) =>
    h('button', { class: 'btn sm' + (P.accent === v ? ' primary' : ''), role: 'radio', 'aria-checked': String(P.accent === v), onclick: () => { mutate(S => { S.profile.accent = v; }); applyTheme(); location.hash = `#/perfil?r=${Date.now()}`; } },
      h('i', { style: { width: '12px', height: '12px', borderRadius: '50%', background: c, display: 'inline-block' } }), t)));
  view.append(section('Apariencia', h('div', { class: 'field' }, h('span', { class: 'label' }, 'Tema'), theme), h('div', { class: 'field', style: { margin: 0 } }, h('span', { class: 'label' }, 'Color de acento'), acc)));

  // ---- Estudio
  const goal = h('input', { class: 'input', type: 'number', id: 'meta', min: 15, max: 600, step: 15, value: P.goalMin, onchange: e => mutate(S => { S.profile.goalMin = Math.min(600, Math.max(15, Number(e.target.value) || 120)); }) });
  view.append(section('Estudio',
    h('div', { class: 'field' }, h('label', { for: 'meta' }, 'Meta diaria (minutos)'), goal),
    h('label', { class: 'check', style: { borderTop: 0, padding: 0 } }, h('input', { type: 'checkbox', checked: P.gamification, onchange: e => mutate(S => { S.profile.gamification = e.target.checked; }) }), h('span', null, 'Mostrar XP, nivel y racha'))));

  // ---- Sincronización
  const keyIn = h('input', { class: 'input', id: 'clave', type: 'password', autocomplete: 'off', placeholder: 'Pega tu clave de estudiante', value: getKey() });
  const stBox = h('div', { class: 'hint', 'aria-live': 'polite' });
  const paint = () => { const s = syncStatus(); stBox.textContent = ({ off: 'Sin clave: el progreso solo vive en este dispositivo.', idle: 'Clave guardada.', syncing: 'Sincronizando…', ok: 'Sincronizado con Google Sheets.', error: 'No se pudo sincronizar. ' + (s.detail || '') })[s.status] || ''; };
  const off = onSyncStatus(paint); paint();
  view.append(section('Sincronización',
    h('p', { class: 'muted' }, 'Tu progreso se guarda en una hoja de Google Sheets de tu cuenta para verlo igual en el celular y en el computador. La clave solo se guarda en este navegador.'),
    h('div', { class: 'field' }, h('label', { for: 'clave' }, 'Clave de estudiante'), keyIn, stBox),
    h('div', { class: 'row wrap' },
      h('button', { class: 'btn primary', onclick: async e => {
        const b = e.currentTarget; b.disabled = true; setKey(keyIn.value);
        try { const rol = await ping(); toast(`Conectado (${rol === 'admin' ? 'tutor' : 'estudiante'})`, 'ok'); await syncNow(); await L.refreshGrades().catch(() => 0); location.hash = `#/perfil?r=${Date.now()}`; }
        catch (x) { toast(x.message === 'sin-clave' ? 'Escribe la clave.' : 'No se pudo conectar: ' + x.message, 'bad'); setKey(''); paint(); }
        b.disabled = false;
      } }, icon('cloud'), 'Guardar y conectar'),
      h('button', { class: 'btn', onclick: async () => { await syncNow(); try { const n = await L.refreshGrades(); toast(n ? `${n} calificación(es) nueva(s)` : 'Todo al día', 'ok'); } catch { toast('Sin conexión', 'bad'); } } }, icon('refresh'), 'Sincronizar ahora'),
      getKey() ? h('button', { class: 'btn ghost', onclick: () => { setKey(''); toast('Clave eliminada de este dispositivo'); location.hash = `#/perfil?r=${Date.now()}`; } }, 'Quitar clave') : null)));
  view.cleanup = off;

  // ---- Copias
  const file = h('input', { type: 'file', accept: 'application/json', hidden: true, onchange: async e => {
    const f = e.target.files[0]; if (!f) return;
    if (!(await confirmDialog('Importar progreso', 'Esto reemplaza el progreso actual de este dispositivo.', 'Importar', true))) return;
    try { importJSON(await f.text()); toast('Progreso importado', 'ok'); location.hash = '#/hoy'; } catch (x) { toast(x.message, 'bad'); }
  } });
  view.append(section('Copia de seguridad',
    h('p', { class: 'muted' }, 'Descarga tu progreso como archivo o restáuralo en otro dispositivo.'),
    h('div', { class: 'row wrap' },
      h('button', { class: 'btn', onclick: () => { const a = h('a', { href: URL.createObjectURL(new Blob([exportJSON()], { type: 'application/json' })), download: `progreso-ruta-fullstack-${dayKey()}.json` }); a.click(); URL.revokeObjectURL(a.href); } }, 'Descargar progreso'),
      h('button', { class: 'btn', onclick: () => file.click() }, 'Importar progreso'), file)));

  view.append(section('Zona delicada', h('p', { class: 'muted' }, 'Borra todo el progreso de este dispositivo (la copia de la nube se sobrescribe al sincronizar).'),
    h('button', { class: 'btn danger', onclick: async () => { if (await confirmDialog('Borrar todo el progreso', 'No se puede deshacer. ¿Seguro?', 'Borrar todo', true)) { resetAll(); toast('Progreso borrado'); location.hash = '#/hoy'; } } }, 'Borrar progreso')));
  return view;
}

// ------------------------------------------------------------------ Registro de sesiones
export async function registroView() {
  const S = state();
  const view = h('div', { class: 'view narrow' });
  view.append(heading('Registro', 'La bitácora de tu estudio. Lo que no está registrado aquí no cuenta como avance.'));
  const days = []; for (let i = 13; i >= 0; i--) { const d = addDays(new Date(), -i); days.push({ key: dayKey(d), label: d.toLocaleDateString('es-CO', { weekday: 'narrow' }), min: L.minutesOn(dayKey(d)) }); }
  const goal = S.profile.goalMin, mx = Math.max(goal, ...days.map(d => d.min), 1);
  const bars = h('div', { class: 'bars', role: 'img', 'aria-label': 'Minutos de estudio de los últimos 14 días' }, days.map(d => h('div', null, h('i', { style: { height: (d.min / mx * 100) + '%' }, title: `${d.key}: ${d.min} min` }), h('small', null, d.label))), h('span', { class: 'goal', style: { bottom: (goal / mx * 100) + '%' } }));
  const total = L.totalMinutes(), week = days.slice(-7).reduce((a, d) => a + d.min, 0);
  view.append(h('section', { class: 'card', style: { marginBottom: '16px' } }, h('div', { class: 'row between wrap', style: { marginBottom: '20px' } }, h('h2', { style: { margin: 0, fontSize: '1.1rem' } }, 'Últimos 14 días'), h('span', { class: 'hint' }, 'Línea punteada: tu meta diaria')), bars, h('div', { style: { height: '22px' } })),
    h('div', { class: 'grid cols-3', style: { marginBottom: '16px' } },
      h('div', { class: 'stat' }, h('b', { class: 'tnum' }, fmtMin(week)), h('span', null, 'Últimos 7 días')),
      h('div', { class: 'stat' }, h('b', { class: 'tnum' }, fmtMin(total)), h('span', null, 'Total registrado')),
      h('div', { class: 'stat' }, h('b', { class: 'tnum' }, S.streak.count), h('span', null, 'Racha actual (días)'))));

  // ---- Sesión manual
  const min = h('input', { class: 'input', type: 'number', min: 5, max: 600, step: 5, value: 30, id: 'smin' });
  const nota = h('input', { class: 'input', id: 'snota', placeholder: 'Qué estudiaste (opcional)', maxlength: 120 });
  view.append(h('section', { class: 'card', style: { marginBottom: '16px' } }, h('h2', { style: { fontSize: '1.1rem' } }, 'Registrar una sesión manual'),
    h('div', { class: 'grid cols-2' }, h('div', { class: 'field', style: { margin: 0 } }, h('label', { for: 'smin' }, 'Minutos'), min), h('div', { class: 'field', style: { margin: 0 } }, h('label', { for: 'snota' }, 'Nota'), nota)),
    h('div', { style: { marginTop: '14px' } }, h('button', { class: 'btn primary', onclick: () => { L.addSession(Math.round(Number(min.value)) || 0, S.current, nota.value.trim()); toast('Sesión registrada', 'ok'); location.hash = `#/registro?r=${Date.now()}`; } }, 'Registrar'))));

  // ---- Historial
  const list = [...S.sessions].reverse().slice(0, 40);
  view.append(h('section', { class: 'card' }, h('h2', { style: { fontSize: '1.1rem' } }, 'Sesiones recientes'),
    list.length ? h('div', null, list.map(s => h('div', { class: 'check', style: { cursor: 'default' } }, h('span', null, h('strong', null, fmtMin(s.min)), h('span', { class: 'muted' }, ` · ${fmtDate(s.date + 'T12:00:00')}${s.week ? ' · Tema ' + s.week : ''}${s.note ? ' · ' + s.note : ''}`)))))
      : h('p', { class: 'muted' }, 'Aún no hay sesiones. Usa el cronómetro de arriba para empezar.')));
  return view;
}
