'use strict';
/* Versión independiente de la plataforma Ruta Full Stack.
   Se alimenta de respaldo.json (respaldo generado desde la app de Muse).
   Los marcados locales (checklist y respuestas) se guardan en localStorage. */

const LS_CHECKS = 'rfs_checks_v1';
const LS_ANSWERS = 'rfs_answers_v1';
let B = null;        // respaldo completo
let D = null;        // respaldo.data
const state = { view: 'hoy', nbWeek: null, nbPage: 1, workWeek: null, evalWeek: null, openExam: null };

const $app = document.getElementById('app');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const loadLS = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } };
const saveLS = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const num10 = (score) => (Math.round((score / 10) * 10) / 10).toFixed(1).replace('.', ',');

const STATUS = {
  not_started: ['Sin iniciar', ''], in_progress: ['En curso', 'prog'], completed: ['Completada', 'ok'],
  planned: ['Planificada', ''], pending: ['Pendiente', ''], submitted: ['Entregada', 'prog'],
  reviewed: ['Calificada', 'ok'], approved: ['Aprobada', 'ok']
};
const chip = (st) => { const [t, c] = STATUS[st] || [st, '']; return `<span class="chip ${c}">${esc(t)}</span>`; };

function inlineFmt(t) {
  return esc(t)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}
function fmtBody(text) {
  if (!text) return '';
  return String(text).split(/\n\s*\n/).map(p => `<p>${inlineFmt(p).replace(/\n/g, '<br>')}</p>`).join('');
}
function splitFeedback(text) {
  if (!text) return [];
  const t = String(text).trim();
  if (/\n/.test(t)) return t.split(/\n+/).filter(Boolean);
  const parts = t.split(/(?=\b\d+\.\s)/).map(s => s.trim()).filter(Boolean);
  return parts.length > 1 ? parts : [t];
}
function feedbackBox(text, title = 'Retroalimentación del experto') {
  if (!text) return '';
  return `<div class="feedback-box"><div class="fb-title">${esc(title)}</div>${splitFeedback(text).map(p => `<p>${inlineFmt(p)}</p>`).join('')}</div>`;
}

const byWeek = (arr, w) => arr.filter(x => x.week === w);
const weeksSorted = () => [...D.route_weeks].sort((a, b) => a.week - b.week);
function currentWeek() {
  const ws = weeksSorted();
  return (ws.find(w => w.status === 'in_progress') || ws.find(w => w.status === 'not_started') || ws[ws.length - 1]).week;
}
function weekSelect(id, value, onlyContent) {
  const opts = weeksSorted().map(w => {
    const has = !onlyContent || D.notebook_sections.some(s => s.week === w.week);
    return `<option value="${w.week}" ${w.week === value ? 'selected' : ''}>Semana ${w.week} · ${esc(w.title)}${has ? '' : ' (sin fundamentación)'}</option>`;
  }).join('');
  return `<select class="week-select" id="${id}">${opts}</select>`;
}

/* ---------------- HOY ---------------- */
function viewHoy() {
  const cw = currentWeek();
  const w = D.route_weeks.find(x => x.week === cw);
  const checks = loadLS(LS_CHECKS, {});
  const tasks = byWeek(D.week_tasks, cw).sort((a, b) => a.sort_order - b.sort_order);
  const doneCount = tasks.filter(t => (checks[t.id] ?? t.done)).length;
  const completedWeeks = D.route_weeks.filter(x => x.status === 'completed').length;
  const tp = D.theory_progress.find(t => t.week === cw) || D.theory_progress[0];
  const doneTasks = tasks.map(t => {
    const done = checks[t.id] ?? t.done;
    return `<label class="check ${done ? 'done' : ''}"><input type="checkbox" data-task="${t.id}" ${done ? 'checked' : ''}><span>${esc(t.title)}</span></label>`;
  }).join('');
  $app.innerHTML = `
    <div class="grid">
      <div class="stat"><div class="num">${D.profile.xp} XP</div><div class="muted small">Experiencia acumulada</div></div>
      <div class="stat"><div class="num">${completedWeeks}/48</div><div class="muted small">Semanas completadas</div></div>
      <div class="stat"><div class="num">${D.notebook_sections.length}</div><div class="muted small">Secciones del Cuaderno</div></div>
      <div class="stat"><div class="num">${D.assessment_questions.length}</div><div class="muted small">Preguntas de examen</div></div>
    </div>
    <section class="card">
      <h2>Semana ${w.week} · ${esc(w.title)} ${chip(w.status)}</h2>
      <p><strong>Dominio:</strong> ${esc(w.mastery)}</p>
      <p><strong>Evidencia:</strong> ${esc(w.evidence_goal)}</p>
      <p class="muted small">Fase ${w.phase} · ${esc(w.phase_title)}</p>
      ${tp && tp.week === w.week ? `<p class="small">Fundamentación: ${tp.percent}% · Hoja ${tp.current_page} de ${tp.theory_pages}</p><div class="progress"><div style="width:${tp.percent}%"></div></div>` : ''}
    </section>
    <section class="card">
      <h2>Checklist de la semana · ${doneCount}/${tasks.length} acciones listas</h2>
      ${doneTasks || '<p class="muted">Sin acciones registradas.</p>'}
      <p class="muted small">Marcar aquí guarda solo en este navegador; el checklist oficial está en la app de Muse.</p>
    </section>`;
  $app.querySelectorAll('input[data-task]').forEach(inp => inp.addEventListener('change', () => {
    const c = loadLS(LS_CHECKS, {}); c[inp.dataset.task] = inp.checked; saveLS(LS_CHECKS, c); viewHoy();
  }));
}

/* ---------------- RUTA ---------------- */
function viewRuta() {
  const phases = [...new Set(D.route_weeks.map(w => w.phase))].sort((a, b) => a - b);
  $app.innerHTML = phases.map(ph => {
    const ws = byWeek(D.route_weeks, NaN).length ? [] : D.route_weeks.filter(w => w.phase === ph).sort((a, b) => a.week - b.week);
    return `<h3 class="phase-title">Fase ${ph} · ${esc(ws[0]?.phase_title || '')}</h3>
      <div class="week-grid">${ws.map(w => `
        <article class="week-card">
          <div class="small muted">Semana ${w.week}</div>
          <h4>${esc(w.title)}</h4>
          <p class="small">${esc(w.mastery)}</p>
          ${chip(w.status)}
        </article>`).join('')}</div>`;
  }).join('');
}

/* ---------------- CUADERNO ---------------- */
function sectionHtml(s) {
  const title = s.title ? `<h3>${esc(s.title)}</h3>` : '';
  if (s.kind === 'code' || s.kind === 'diagram' || s.kind === 'table') {
    return `<div class="nb-sec k-${s.kind}">${title}<pre>${esc(s.body)}</pre></div>`;
  }
  return `<div class="nb-sec k-${s.kind}">${title}${fmtBody(s.body)}</div>`;
}
function viewCuaderno() {
  if (!state.nbWeek) state.nbWeek = currentWeek();
  const w = state.nbWeek;
  const secs = byWeek(D.notebook_sections, w).sort((a, b) => a.sort_order - b.sort_order);
  const wk = D.route_weeks.find(x => x.week === w);
  if (!secs.length) {
    $app.innerHTML = `${weekSelect('nbWeekSel', w)}
      <section class="card"><h2>Semana ${w} · ${esc(wk?.title || '')}</h2>
      <p class="muted">Este tema aún no tiene fundamentación creada en el respaldo. En la app de Muse se crea un tema nuevo cada día, en orden.</p></section>`;
    bindWeekSelect('nbWeekSel', v => { state.nbWeek = v; state.nbPage = 1; viewCuaderno(); });
    return;
  }
  const pages = [...new Set(secs.map(s => s.page))].sort((a, b) => a - b);
  if (!pages.includes(state.nbPage)) state.nbPage = pages[0];
  const pageSecs = secs.filter(s => s.page === state.nbPage);
  const idx = pages.indexOf(state.nbPage);
  const tp = D.theory_progress.find(t => t.week === w);
  const exercises = byWeek(D.topic_exercises, w).sort((a, b) => a.sort_order - b.sort_order);
  $app.innerHTML = `
    ${weekSelect('nbWeekSel', w)}
    <section class="card">
      <h2>Tema ${w} · ${esc(wk?.title || '')}</h2>
      ${tp ? `<p class="small muted">Fundamentación: ${tp.percent}% ${tp.completed_at ? '· completada' : '· en curso'}</p><div class="progress"><div style="width:${tp.percent}%"></div></div>` : '<p class="small muted">Fundamentación sin iniciar en el respaldo.</p>'}
      <div class="pager">
        <button id="pgPrev" ${idx === 0 ? 'disabled' : ''}>← Hoja anterior</button>
        <strong>Hoja ${idx + 1} de ${pages.length}</strong>
        <button id="pgNext" ${idx === pages.length - 1 ? 'disabled' : ''}>Hoja siguiente →</button>
      </div>
      <div class="notebook">${pageSecs.map(sectionHtml).join('')}</div>
      <div class="pager">
        <button id="pgPrev2" ${idx === 0 ? 'disabled' : ''}>← Hoja anterior</button>
        <strong>Hoja ${idx + 1} de ${pages.length}</strong>
        <button id="pgNext2" ${idx === pages.length - 1 ? 'disabled' : ''}>Hoja siguiente →</button>
      </div>
    </section>
    ${exercises.length ? `<section class="card"><h2>Ejercicios del tema</h2>${exercises.map(e => `
      <article class="q">
        <div class="prompt">${esc(e.title)}</div>
        ${e.objective ? `<p><strong>Objetivo:</strong> ${esc(e.objective)}</p>` : ''}
        ${Array.isArray(e.steps) && e.steps.length ? `<ol>${e.steps.map(s => `<li>${inlineFmt(String(s))}</li>`).join('')}</ol>` : ''}
        ${e.example ? `<p><strong>Ejemplo / resultado:</strong></p>${fmtBody(e.example)}` : ''}
        ${e.verification ? `<p><strong>Verificación:</strong> ${esc(e.verification)}</p>` : ''}
      </article>`).join('')}</section>` : ''}`;
  bindWeekSelect('nbWeekSel', v => { state.nbWeek = v; state.nbPage = 1; viewCuaderno(); });
  const go = (d) => { state.nbPage = pages[Math.min(pages.length - 1, Math.max(0, idx + d))]; viewCuaderno(); window.scrollTo({ top: 0 }); };
  ['pgPrev', 'pgPrev2'].forEach(id => { const b = document.getElementById(id); if (b) b.onclick = () => go(-1); });
  ['pgNext', 'pgNext2'].forEach(id => { const b = document.getElementById(id); if (b) b.onclick = () => go(1); });
}
function bindWeekSelect(id, cb) {
  const sel = document.getElementById(id);
  if (sel) sel.addEventListener('change', () => cb(parseInt(sel.value, 10)));
}

/* ---------------- TRABAJOS ---------------- */
function viewTrabajos() {
  if (!state.workWeek) state.workWeek = currentWeek();
  const w = state.workWeek;
  const items = byWeek(D.assignments, w);
  $app.innerHTML = `${weekSelect('wkSel', w)}` + (items.length ? items.map(a => `
    <section class="card">
      <h2>${esc(a.title)} ${chip(a.status)}</h2>
      ${fmtBody(a.description)}
      <table class="kv">
        ${a.estimated_minutes ? `<tr><td class="muted">Tiempo estimado</td><td>${a.estimated_minutes} min</td></tr>` : ''}
        ${a.grade != null && a.status !== 'pending' && a.status !== 'planned' ? `<tr><td class="muted">Calificación del experto</td><td><strong>${num10(a.grade * 10)}/10</strong></td></tr>` : ''}
        ${a.submission_url ? `<tr><td class="muted">Entrega</td><td><a href="${esc(a.submission_url)}" target="_blank" rel="noopener">${esc(a.submission_url)}</a></td></tr>` : ''}
      </table>
      ${feedbackBox(a.feedback)}
    </section>`).join('') : '<section class="card"><p class="muted">Sin trabajo registrado para esta semana en el respaldo.</p></section>');
  bindWeekSelect('wkSel', v => { state.workWeek = v; viewTrabajos(); });
}

/* ---------------- EVALUACIONES ---------------- */
const LEVEL_ORDER = { facil: 0, medio: 1, dificil: 2 };
const LEVEL_NAME = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil' };
function savedAnswer(q) {
  const overlay = loadLS(LS_ANSWERS, {});
  if (overlay[q.id] != null) return overlay[q.id];
  const rec = D.assessment_answers.find(a => a.question_id === q.id);
  if (!rec) return null;
  if (typeof rec.answer === 'number') return rec.answer;
  const idx = (q.options || []).indexOf(rec.answer);
  return idx >= 0 ? idx : null;
}
function viewEvaluaciones() {
  if (!state.evalWeek) state.evalWeek = currentWeek();
  const w = state.evalWeek;
  const items = byWeek(D.assessments, w).sort((a, b) => (LEVEL_ORDER[a.level] ?? 9) - (LEVEL_ORDER[b.level] ?? 9));
  $app.innerHTML = `${weekSelect('evSel', w)}` + (items.length ? items.map(a => {
    const qs = D.assessment_questions.filter(q => q.assessment_id === a.id).sort((x, y) => x.sort_order - y.sort_order);
    const open = state.openExam === a.id;
    return `<section class="card">
      <h2>Nivel ${LEVEL_NAME[a.level] || esc(a.level)} · ${esc(a.title)} ${chip(a.status)}</h2>
      ${a.status === 'completed' || a.score ? `<p>Calificación del experto: <strong>${num10(a.score)}/10</strong> · Apruebas con ${num10(a.passing_score)}/10 · Intentos: ${a.attempts}</p>` : `<p class="muted small">Apruebas con ${num10(a.passing_score)}/10 · Califica el experto en máx. 24 h desde la entrega (en la app de Muse).</p>`}
      ${feedbackBox(a.feedback)}
      ${qs.length ? `<button class="btn" data-exam="${a.id}">${open ? 'Ocultar examen' : `Ver examen (${qs.length} preguntas)`}</button>` : '<p class="muted small">Examen en preparación en el respaldo.</p>'}
      ${open ? `<div>${qs.map((q, i) => {
        const sel = savedAnswer(q);
        return `<div class="q"><div class="prompt">${i + 1}. ${esc(q.prompt)}</div>
          ${(q.options || []).map((op, oi) => `<label class="${sel === oi ? 'sel' : ''}"><input type="radio" name="q${q.id}" data-q="${q.id}" value="${oi}" ${sel === oi ? 'checked' : ''}><span>${esc(op)}</span></label>`).join('')}
        </div>`;
      }).join('')}<p class="muted small">Las respuestas se guardan solo en este navegador. Sin autocalificación: la nota la pone el experto en la app de Muse.</p></div>` : ''}
    </section>`;
  }).join('') : '<section class="card"><p class="muted">Sin evaluaciones registradas para esta semana en el respaldo.</p></section>');
  bindWeekSelect('evSel', v => { state.evalWeek = v; state.openExam = null; viewEvaluaciones(); });
  $app.querySelectorAll('button[data-exam]').forEach(b => b.addEventListener('click', () => {
    state.openExam = state.openExam === Number(b.dataset.exam) ? null : Number(b.dataset.exam); viewEvaluaciones();
  }));
  $app.querySelectorAll('input[data-q]').forEach(inp => inp.addEventListener('change', () => {
    const o = loadLS(LS_ANSWERS, {}); o[inp.dataset.q] = Number(inp.value); saveLS(LS_ANSWERS, o); viewEvaluaciones();
  }));
}

/* ---------------- INSIGNIAS ---------------- */
const BADGES = [
  ['Terminal y entorno', 1, '#37474f', 'TE'], ['HTML', 3, '#e65100', 'H5'], ['Git y GitHub', 5, '#6a1b9a', 'GIT'],
  ['CSS', 7, '#1565c0', 'CSS'], ['JavaScript', 13, '#f9a825', 'JS'], ['SQL y PostgreSQL', 25, '#2e7d32', 'SQL'],
  ['Node.js', 31, '#33691e', 'ND'], ['APIs REST', 32, '#00838f', 'API'], ['TypeScript', 37, '#0d47a1', 'TS'],
  ['React', 38, '#0277bd', 'RE'], ['Supabase', 43, '#1b5e20', 'SB'], ['Despliegue en Vercel', 47, '#212121', '▲']
];
function viewInsignias() {
  $app.innerHTML = `<section class="card"><h2>Insignias de habilidades</h2>
    <p class="muted">Fundamentos se desbloquea al completar el tema con trabajo y evaluaciones aprobadas ≥ 9,0/10. Aplicado y Avanzado se ganan con evidencias calificadas por el experto en la app de Muse; esta copia solo refleja el estado del respaldo.</p></section>
    <div class="badge-grid">${BADGES.map(([name, wk, color, ico]) => {
      const done = D.route_weeks.find(w => w.week === wk)?.status === 'completed';
      return `<article class="badge-card ${done ? '' : 'locked'}">
        <div class="b-ico" style="background:${color}">${esc(ico)}</div>
        <h3>${esc(name)}</h3>
        <p class="small muted">Tema ${wk}</p>
        <p>${done ? '<span class="chip ok">Fundamentos · criterios cumplidos</span>' : '<span class="chip">Fundamentos · bloqueada</span>'}</p>
        <p class="small muted">Aplicado: por evidencia · Avanzado: por evidencia</p>
      </article>`;
    }).join('')}</div>`;
}

/* ---------------- PERFIL ---------------- */
function viewPerfil() {
  const p = D.profile;
  const initials = String(p.avatar_id || '—').slice(0, 2).toUpperCase();
  $app.innerHTML = `<section class="card">
    <h2>Perfil y XP</h2>
    <div class="profile-chip" style="margin-bottom:.8rem"><div class="avatar-circle">${esc(initials)}</div><div><strong>Avatar:</strong> ${esc(p.avatar_id)}</div></div>
    <table class="kv">
      <tr><td class="muted">XP</td><td>${p.xp}</td></tr>
      <tr><td class="muted">Racha</td><td>${p.streak_days} días</td></tr>
      <tr><td class="muted">Meta diaria</td><td>${p.daily_goal_minutes} min</td></tr>
      <tr><td class="muted">Apariencia</td><td>${esc(p.appearance_mode)} · Tema de color: ${esc(p.color_theme)}</td></tr>
      <tr><td class="muted">Gamificación</td><td>${p.gamification_on ? 'Activada' : 'Desactivada'}</td></tr>
      <tr><td class="muted">Respaldo generado</td><td>${esc(B.exported_at_label || B.exported_at)}</td></tr>
    </table>
    <p class="muted small">Los retratos de avatar viven en la app de Muse; en esta copia el avatar se representa con sus iniciales. Para actualizar los datos: descarga un respaldo nuevo en la app de Muse (Registro → Perfil y XP) y reemplaza <strong>respaldo.json</strong> por el archivo nuevo.</p>
  </section>`;
}

/* ---------------- INICIO ---------------- */
const VIEWS = { hoy: viewHoy, ruta: viewRuta, cuaderno: viewCuaderno, trabajos: viewTrabajos, evaluaciones: viewEvaluaciones, insignias: viewInsignias, perfil: viewPerfil };
function render() { (VIEWS[state.view] || viewHoy)(); }
document.getElementById('tabs').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-view]'); if (!b) return;
  state.view = b.dataset.view;
  document.querySelectorAll('#tabs button').forEach(x => x.classList.toggle('active', x === b));
  render();
});
fetch('respaldo.json')
  .then(r => { if (!r.ok) throw new Error('No se pudo leer respaldo.json'); return r.json(); })
  .then(json => {
    B = json; D = json.data;
    const p = D.profile;
    document.getElementById('profileChip').innerHTML = `<div class="avatar-circle">${esc(String(p.avatar_id || '').slice(0, 2).toUpperCase())}</div><div><strong>${p.xp} XP</strong><div class="muted small">Avatar: ${esc(p.avatar_id)}</div></div>`;
    render();
  })
  .catch(err => { $app.innerHTML = `<section class="card"><h2>No se pudieron cargar los datos</h2><p>${esc(err.message)}</p><p class="muted">Abre esta copia con un servidor local (por ejemplo <code>python3 -m http.server</code>) o en GitHub Pages; algunos navegadores bloquean leer el JSON desde file://.</p></section>`; });
