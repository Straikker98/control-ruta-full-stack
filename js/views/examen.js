// Exámenes de selección única (autocalificados) y repaso espaciado.
import { h, inline, shuffle, toast } from '../util.js';
import { icon } from '../icons.js';
import { getExam, weekInfo } from '../content.js';
import * as L from '../logic.js';
import { state } from '../store.js';
import { back, heading, note, fmtScore } from './ui.js';
import { confetti, countUp } from '../fx.js';

/** Enunciado con bloques ``` y `código` en línea, sin interpretar HTML. */
function promptNodes(text) {
  const parts = String(text).split(/```(?:\w+)?\n?/);
  return parts.map((p, i) => i % 2 ? h('pre', null, h('code', null, p.replace(/\n$/, ''))) : (p.trim() ? h('span', null, inline(p.trim())) : null));
}
const LETTERS = ['A', 'B', 'C', 'D'];

function buildAttempt(bank, n) {
  // Prioriza lo que antes se falló y completa con el resto, mezclado
  const wrong = new Set(Object.keys(state().review));
  const pri = shuffle(bank.filter(q => wrong.has(q.id)));
  const rest = shuffle(bank.filter(q => !wrong.has(q.id)));
  const picked = shuffle([...pri.slice(0, Math.ceil(n / 3)), ...rest].slice(0, n));
  return picked.map(q => { const order = shuffle([0, 1, 2, 3]); return { q, order, correctPos: order.indexOf(q.answer) }; });
}

function optionButton(i, text, onClick) {
  return h('button', { class: 'q-opt', type: 'button', 'aria-pressed': 'false', onclick: onClick }, h('span', { class: 'k' }, LETTERS[i]), h('span', null, inline(text)));
}

export async function examenView({ w, lv }) {
  w = Number(w);
  const info = await weekInfo(w), exam = await getExam(w);
  const st = L.statusOf(w);
  const view = h('div', { class: 'view narrow' });
  view.append(back(`#/tema/${w}`, `Tema ${w}`));
  if (!L.LEVELS.includes(lv)) { view.append(note('bad', 'Nivel de examen no válido.', 'alert')); return view; }
  if (!exam || !exam.levels?.[lv]?.length) { view.append(heading(`Examen ${L.LEVEL_LABEL[lv]}`, info?.title), note('warn', 'El examen de este tema está en preparación y aún no se puede presentar.', 'clock')); return view; }
  if (st !== 'active' && st !== 'done') { view.append(note('warn', 'Inicia el tema para presentar sus exámenes.', 'lock')); return view; }
  const lock = L.examLock(w, lv);
  if (lock) { view.append(heading(`Examen ${L.LEVEL_LABEL[lv]}`, info?.title), note('warn', lock, 'lock')); return view; }

  const bank = exam.levels[lv];
  const n = Math.min(L.QUESTIONS_PER_ATTEMPT, bank.length);
  const needed = Math.ceil(n * L.PASS / 10);
  const stage = h('div');
  view.append(stage);
  const e0 = L.examOf(w, lv);

  function intro() {
    stage.replaceChildren(heading(`Examen ${L.LEVEL_LABEL[lv]}`, info.title, `Tema ${w}`),
      h('section', { class: 'card' },
        h('ul', { style: { paddingLeft: '1.2em', margin: '0 0 16px' } },
          h('li', null, `${n} preguntas de selección única: una sola respuesta correcta.`),
          h('li', null, `Se aprueba con ${L.PASS.toFixed(1).replace('.', ',')} o más: máximo ${n - needed} ${n - needed === 1 ? 'error' : 'errores'}.`),
          h('li', null, 'Al repetir, las preguntas rotan y se priorizan las que fallaste.'),
          h('li', null, 'La corrección y la explicación de cada pregunta aparecen al entregar.')),
        e0.attempts.length ? h('p', { class: 'muted' }, `Mejor nota: ${fmtScore(e0.best)} · ${e0.attempts.length} intento(s)${e0.passed ? ' · ya aprobado' : ''}`) : null,
        h('button', { class: 'btn primary', onclick: () => run(buildAttempt(bank, n)) }, icon('play'), e0.attempts.length ? 'Presentar de nuevo' : 'Comenzar')));
    document.getElementById('view-title')?.focus({ preventScroll: true });
  }

  function run(items) {
    let i = 0; const chosen = new Array(items.length).fill(null);
    const t0 = Date.now();
    const mmss = ms => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
    const clock = h('span', { class: 'chip tnum', title: 'Tiempo transcurrido (sin límite)' }, icon('clock'), '0:00');
    const tick = setInterval(() => { clock.lastChild.textContent = mmss(Date.now() - t0); }, 1000);
    const onKey = e => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const k = e.key.toUpperCase(); const idx = ['1', '2', '3', '4'].includes(k) ? Number(k) - 1 : LETTERS.indexOf(k);
      if (idx >= 0 && idx < 4 && document.querySelector('.q-opts')) { document.querySelectorAll('.q-opt')[idx]?.click(); }
      else if (e.key === 'Enter' && !/BUTTON|A/.test(document.activeElement?.tagName)) document.getElementById('q-next')?.click();
    };
    document.addEventListener('keydown', onKey);
    view.cleanup = () => { document.removeEventListener('keydown', onKey); clearInterval(tick); };

    function paint() {
      const it = items[i];
      const opts = it.order.map((orig, pos) => optionButton(pos, it.q.options[orig], ev => {
        chosen[i] = pos;
        optsBox.querySelectorAll('.q-opt').forEach((b, j) => b.setAttribute('aria-pressed', j === pos ? 'true' : 'false'));
        nextBtn.disabled = false;
      }));
      const optsBox = h('div', { class: 'q-opts', role: 'group', 'aria-label': 'Opciones' }, opts);
      if (chosen[i] != null) optsBox.querySelectorAll('.q-opt')[chosen[i]].setAttribute('aria-pressed', 'true');
      const lastQ = i === items.length - 1;
      const nextBtn = h('button', { class: 'btn primary', id: 'q-next', disabled: chosen[i] == null, onclick: () => { if (lastQ) finish(); else { i++; paint(); } } }, lastQ ? 'Entregar examen' : 'Siguiente', icon(lastQ ? 'check' : 'right'));
      const prevBtn = h('button', { class: 'btn ghost', disabled: i === 0, onclick: () => { i--; paint(); } }, icon('left'), 'Anterior');
      stage.replaceChildren(
        h('div', { class: 'row between', style: { marginBottom: '12px' } }, h('span', { class: 'eyebrow', style: { margin: 0 } }, `Examen ${L.LEVEL_LABEL[lv]} · Tema ${w}`), h('div', { class: 'row', style: { gap: '8px' } }, clock, h('span', { class: 'chip tnum' }, `${i + 1} de ${items.length}`))),
        h('div', { class: 'bar', style: { marginBottom: '16px' }, role: 'progressbar', 'aria-valuenow': i + 1, 'aria-valuemin': 1, 'aria-valuemax': items.length }, h('i', { style: { width: ((i + 1) / items.length * 100) + '%' } })),
        h('section', { class: 'card q-card' }, h('div', { class: 'q-prompt', id: 'view-title', tabindex: '-1' }, promptNodes(it.q.prompt)), optsBox),
        h('div', { class: 'row between', style: { marginTop: '16px' } }, prevBtn, nextBtn),
        h('p', { class: 'hint', style: { textAlign: 'center', marginTop: '12px' } }, 'Atajos: 1–4 o A–D para responder · Enter para continuar'));
    }

    function finish() {
      document.removeEventListener('keydown', onKey); clearInterval(tick);
      const wrong = items.filter((it, k) => chosen[k] !== it.correctPos).map(it => it.q.id);
      const correct = items.length - wrong.length;
      const res = L.recordAttempt(w, lv, { correct, total: items.length, wrong });
      results(items, chosen, res, correct, mmss(Date.now() - t0));
    }
    paint();
  }

  function results(items, chosen, res, correct, took) {
    const next = L.LEVELS[L.LEVELS.indexOf(lv) + 1];
    const topicDone = L.isDone(w);
    stage.replaceChildren(
      h('section', { class: 'card tint', style: { textAlign: 'center', padding: '32px 20px' }, 'aria-live': 'polite' },
        h('div', { class: 'eyebrow' }, res.passed ? 'Aprobado' : 'Todavía no'),
        h('div', { class: 'score-big', id: 'view-title', tabindex: '-1', style: { color: res.passed ? 'var(--ok)' : 'var(--bad)' } }, fmtScore(res.score), h('small', { class: 'faint', style: { fontSize: '1.2rem' } }, ' / 10')),
        h('p', { class: 'muted', style: { margin: '10px 0 20px' } }, `${correct} de ${items.length} correctas · ${took}.` + (res.passed ? '' : ` Necesitas ${needed} para aprobar; las que fallaste pasan a tu repaso.`)),
        h('div', { class: 'row wrap', style: { justifyContent: 'center' } },
          !res.passed ? h('button', { class: 'btn primary', onclick: () => run(buildAttempt(bank, n)) }, icon('refresh'), 'Intentar de nuevo') : null,
          res.passed && next && !topicDone ? h('a', { class: 'btn primary', href: `#/examen/${w}/${next}` }, `Examen ${L.LEVEL_LABEL[next]}`, icon('right')) : null,
          topicDone ? h('a', { class: 'btn primary', href: '#/hoy' }, icon('sparkle'), 'Tema completado: ir a Hoy') : null,
          h('a', { class: 'btn', href: `#/tema/${w}` }, 'Volver al tema'))),
      h('h2', { style: { margin: '28px 0 12px' } }, 'Revisión'),
      ...items.map((it, k) => {
        const ok = chosen[k] === it.correctPos;
        return h('section', { class: 'card flat', style: { marginBottom: '12px' } },
          h('div', { class: 'row between', style: { marginBottom: '10px' } }, h('span', { class: 'eyebrow', style: { margin: 0 } }, `Pregunta ${k + 1}`), h('span', { class: 'chip ' + (ok ? 'ok' : 'bad') }, ok ? 'Correcta' : 'Incorrecta')),
          h('div', { class: 'q-prompt', style: { fontSize: '1rem' } }, promptNodes(it.q.prompt)),
          h('div', { class: 'q-opts' }, it.order.map((orig, pos) => {
            const b = optionButton(pos, it.q.options[orig], () => {});
            b.disabled = true; b.setAttribute('aria-pressed', 'false');
            if (pos === it.correctPos) b.classList.add('right'); else if (pos === chosen[k]) b.classList.add('wrong');
            return b;
          })),
          h('div', { class: 'prose-box q-expl' }, h('p', null, h('strong', null, 'Por qué: '), inline(it.q.explanation))));
      }));
    scrollTo({ top: 0 });
    const big = document.getElementById('view-title');
    big?.focus({ preventScroll: true });
    if (big?.firstChild) countUp(big.firstChild, res.score, { dec: 1 });   // el nodo de texto, no el <small>
    if (res.passed) confetti({ big: true });
  }

  intro();
  return view;
}

// ------------------------------------------------------------------ repaso espaciado
export async function repasoView() {
  const view = h('div', { class: 'view narrow' });
  const due = L.dueReviews();
  view.append(heading('Repaso', 'Las preguntas que fallaste vuelven a ti en intervalos crecientes (1, 3, 7, 14 y 30 días) hasta que las dominas.'), h('a', { class: 'btn sm', href: '#/tarjetas', style: { marginBottom: '16px' } }, icon('sparkle'), 'Mis tarjetas'));
  if (!due.length) {
    const pending = Object.keys(state().review).length;
    view.append(h('div', { class: 'card', style: { textAlign: 'center', padding: '36px 20px' } },
      h('h2', null, 'Nada por repasar ahora'),
      h('p', { class: 'muted' }, pending ? `Tienes ${pending} pregunta(s) en espera; vuelven en los próximos días.` : 'Cuando falles una pregunta de un examen, aparecerá aquí.'),
      h('a', { class: 'btn primary', href: '#/hoy' }, 'Ir a Hoy')));
    return view;
  }
  // Carga los bancos de los temas implicados
  const weeks = [...new Set(due.map(id => parseInt(id.slice(0, 2), 10)))];
  const banks = Object.fromEntries(await Promise.all(weeks.map(async w => [w, await getExam(w)])));
  const find = id => { const w = parseInt(id.slice(0, 2), 10); const ex = banks[w]; if (!ex) return null; for (const l of L.LEVELS) { const q = ex.levels[l]?.find(x => x.id === id); if (q) return q; } return null; };
  const queue = shuffle(due).slice(0, 10).map(id => ({ id, q: find(id) })).filter(x => x.q);
  const stage = h('div'); view.append(stage);
  let k = 0, okN = 0;
  function show() {
    if (k >= queue.length) {
      stage.replaceChildren(h('div', { class: 'card tint', style: { textAlign: 'center', padding: '32px 20px' } }, h('h2', null, 'Sesión de repaso completa'),
        h('p', { class: 'muted' }, `${okN} de ${queue.length} acertadas.`), h('div', { class: 'row', style: { justifyContent: 'center' } }, h('a', { class: 'btn primary', href: '#/hoy' }, 'Ir a Hoy'), L.dueReviews().length ? h('a', { class: 'btn', href: `#/repaso?r=${Date.now()}` }, 'Otra ronda') : null)));
      return;
    }
    const { id, q } = queue[k]; const order = shuffle([0, 1, 2, 3]); const correctPos = order.indexOf(q.answer);
    let answered = false;
    const box = h('div', { class: 'q-opts' });
    const expl = h('div'); const nextBtn = h('button', { class: 'btn primary', hidden: true, onclick: () => { k++; show(); } }, k === queue.length - 1 ? 'Terminar' : 'Siguiente', icon('right'));
    order.forEach((orig, pos) => box.append(optionButton(pos, q.options[orig], () => {
      if (answered) return; answered = true;
      const ok = pos === correctPos; if (ok) okN++;
      L.gradeReview(id, ok);
      box.querySelectorAll('.q-opt').forEach((b, j) => { b.disabled = true; if (j === correctPos) b.classList.add('right'); else if (j === pos) b.classList.add('wrong'); });
      expl.append(h('div', { class: 'prose-box q-expl' }, h('p', null, h('strong', null, ok ? 'Correcto. ' : 'No era esa. '), inline(q.explanation))));
      nextBtn.hidden = false; nextBtn.focus();
    })));
    stage.replaceChildren(
      h('div', { class: 'row between', style: { marginBottom: '12px' } }, h('span', { class: 'eyebrow', style: { margin: 0 } }, `Tema ${parseInt(id.slice(0, 2), 10)}`), h('span', { class: 'chip tnum' }, `${k + 1} de ${queue.length}`)),
      h('section', { class: 'card q-card' }, h('div', { class: 'q-prompt' }, promptNodes(q.prompt)), box, expl),
      h('div', { class: 'row', style: { justifyContent: 'flex-end', marginTop: '16px' } }, nextBtn));
  }
  show();
  return view;
}
