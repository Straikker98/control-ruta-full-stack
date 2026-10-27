// Laboratorio: practicar sin salir de la app.
//  · Web: HTML + CSS + JavaScript con vista previa en un iframe aislado.
//  · JavaScript: consola con salida.
//  · SQL: PostgreSQL real en el navegador (PGlite), con la base guardada en este dispositivo.
// El código del estudiante corre en un iframe SIN acceso a la app (sandbox sin allow-same-origin):
// no puede leer la clave ni el progreso guardados en el navegador.
import { h, toast, confirmDialog, debounce, clear } from '../util.js';
import { icon } from '../icons.js';
import { heading } from './ui.js';

const LS = 'rfs.lab.v1';
const PGLITE = 'https://cdn.jsdelivr.net/npm/@electric-sql/pglite@0.5.12/dist/index.js';

const EJEMPLOS = {
  web: {
    'Tarjeta de perfil': {
      html: '<article class="tarjeta">\n  <h1>Alejo</h1>\n  <p>Aprendiendo Full Stack, un tema a la vez.</p>\n  <button id="saludo">Saludar</button>\n  <p id="salida" aria-live="polite"></p>\n</article>',
      css: 'body { font-family: system-ui, sans-serif; display: grid; place-items: center; min-height: 100vh; margin: 0; background: #f6f5f1; }\n.tarjeta { background: #fff; padding: 24px 28px; border-radius: 16px; box-shadow: 0 8px 24px rgba(0,0,0,.12); max-width: 320px; }\nh1 { margin: 0 0 8px; }\nbutton { padding: 10px 16px; border: 0; border-radius: 10px; background: #d9480f; color: #fff; font-weight: 600; cursor: pointer; }\nbutton:active { transform: scale(.97); }',
      js: "document.getElementById('saludo').addEventListener('click', () => {\n  document.getElementById('salida').textContent = 'Hola desde JavaScript';\n  console.log('clic registrado');\n});",
    },
    'Página en blanco': { html: '<h1>Hola</h1>', css: 'body { font-family: system-ui, sans-serif; padding: 24px; }', js: "console.log('listo');" },
  },
  js: {
    'map, filter y reduce': "const notas = [8.5, 9.2, 7.4, 9.8, 6.9];\nconst aprobadas = notas.filter(n => n >= 9);\nconst redondeadas = notas.map(n => Math.round(n));\nconst promedio = notas.reduce((a, n) => a + n, 0) / notas.length;\nconsole.log('Aprobadas:', aprobadas);\nconsole.log('Redondeadas:', redondeadas);\nconsole.log('Promedio:', promedio.toFixed(2));",
    'Asincronía con async/await': "const esperar = ms => new Promise(r => setTimeout(r, ms));\nasync function pedirDatos() {\n  console.log('pidiendo…');\n  await esperar(500);\n  return { ok: true, total: 3 };\n}\nconst r = await pedirDatos();\nconsole.log('respuesta:', r);",
  },
  sql: {
    'Crear y consultar tablas': "CREATE TABLE IF NOT EXISTS cursos (\n  id serial PRIMARY KEY,\n  nombre text NOT NULL,\n  horas int CHECK (horas > 0)\n);\nINSERT INTO cursos (nombre, horas) VALUES\n  ('HTML', 20), ('CSS', 30), ('JavaScript', 60)\nON CONFLICT DO NOTHING;\nSELECT * FROM cursos ORDER BY horas DESC;",
    'JOIN y GROUP BY': "CREATE TABLE IF NOT EXISTS estudiantes (id serial PRIMARY KEY, nombre text NOT NULL);\nCREATE TABLE IF NOT EXISTS matriculas (\n  estudiante_id int REFERENCES estudiantes(id),\n  curso text NOT NULL,\n  nota numeric(3,1)\n);\nINSERT INTO estudiantes (nombre) SELECT x FROM unnest(ARRAY['Ana','Luis','Marta']) AS x\n  WHERE NOT EXISTS (SELECT 1 FROM estudiantes);\nINSERT INTO matriculas SELECT e.id, c, 8 + random()*2\n  FROM estudiantes e, unnest(ARRAY['SQL','Node']) AS c\n  WHERE NOT EXISTS (SELECT 1 FROM matriculas);\nSELECT e.nombre, count(*) AS cursos, round(avg(m.nota), 1) AS promedio\nFROM estudiantes e JOIN matriculas m ON m.estudiante_id = e.id\nGROUP BY e.nombre ORDER BY promedio DESC;",
  },
};

function load() {
  try { return Object.assign({ mode: 'web', web: { ...EJEMPLOS.web['Tarjeta de perfil'] }, js: EJEMPLOS.js['map, filter y reduce'], sql: EJEMPLOS.sql['Crear y consultar tablas'], tab: 'html' }, JSON.parse(localStorage.getItem(LS) || '{}')); }
  catch { return { mode: 'web', web: { ...EJEMPLOS.web['Tarjeta de perfil'] }, js: '', sql: '', tab: 'html' }; }
}
const save = debounce(s => { try { localStorage.setItem(LS, JSON.stringify(s)); } catch {} }, 400);

// ------------------------------------------------------------------ editor de texto con sangría y números de línea
function editor({ value, label, onChange, onRun }) {
  const ta = h('textarea', { class: 'ed-ta', spellcheck: false, autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off', 'aria-label': label, wrap: 'off' });
  ta.value = value;
  const gut = h('pre', { class: 'ed-gut', 'aria-hidden': 'true' });
  const lines = () => { const n = ta.value.split('\n').length; gut.textContent = Array.from({ length: n }, (_, i) => i + 1).join('\n'); };
  const edit = (start, end, text, selStart, selEnd) => { ta.focus(); ta.setRangeText(text, start, end, 'end'); ta.selectionStart = selStart ?? ta.selectionEnd; ta.selectionEnd = selEnd ?? ta.selectionEnd; ta.dispatchEvent(new Event('input')); };
  ta.addEventListener('input', () => { lines(); onChange(ta.value); });
  ta.addEventListener('scroll', () => { gut.scrollTop = ta.scrollTop; });
  ta.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); onRun?.(); return; }
    const { selectionStart: s, selectionEnd: en, value: v } = ta;
    if (e.key === 'Tab') {
      e.preventDefault();
      const ls = v.lastIndexOf('\n', s - 1) + 1;
      if (s !== en || e.shiftKey) {                                  // sangrar o quitar sangría de varias líneas
        const blockEnd = v.indexOf('\n', en) < 0 ? v.length : v.indexOf('\n', en);
        const block = v.slice(ls, blockEnd).split('\n').map(l => e.shiftKey ? l.replace(/^ {1,2}/, '') : '  ' + l).join('\n');
        edit(ls, blockEnd, block, ls, ls + block.length);
      } else edit(s, en, '  ');
    } else if (e.key === 'Enter') {                                   // conserva la sangría; añade un nivel tras { ( [ o >
      e.preventDefault();
      const ls = v.lastIndexOf('\n', s - 1) + 1, ind = v.slice(ls, s).match(/^\s*/)[0], prev = v[s - 1], next = v[s];
      const open = '{(['.includes(prev) && '})]'.includes(next ?? '');
      if (open) edit(s, en, '\n' + ind + '  \n' + ind, s + 1 + ind.length + 2, s + 1 + ind.length + 2);
      else edit(s, en, '\n' + ind + (/[{(\[]$/.test(v.slice(ls, s).trimEnd()) ? '  ' : ''));
    } else if (['{', '(', '[', '"', "'", '`'].includes(e.key) && s === en && !e.ctrlKey && !e.metaKey) {
      const pair = { '{': '}', '(': ')', '[': ']', '"': '"', "'": "'", '`': '`' }[e.key];
      if (['"', "'", '`'].includes(e.key) && /\w/.test(v[s - 1] || '')) return;   // apóstrofo dentro de una palabra
      e.preventDefault(); edit(s, en, e.key + pair, s + 1, s + 1);
    } else if ([')', ']', '}', '"', "'", '`'].includes(e.key) && v[s] === e.key && s === en) { e.preventDefault(); ta.selectionStart = ta.selectionEnd = s + 1; }
  });
  lines();
  return { el: h('div', { class: 'ed' }, gut, ta), ta, get: () => ta.value, set: t => { ta.value = t; lines(); onChange(t); } };
}

// ------------------------------------------------------------------ ejecución aislada
const BRIDGE = `<script>(()=>{const send=(t,a)=>parent.postMessage({lab:1,t,a:a.map(x=>{try{return typeof x==='string'?x:(x instanceof Error?x.stack||String(x):JSON.stringify(x,null,1))}catch(e){return String(x)}})},'*');
for(const k of ['log','info','warn','error']){const o=console[k];console[k]=(...a)=>{send(k,a);o.apply(console,a)}}
addEventListener('error',e=>send('error',[e.message+(e.lineno?' (línea '+e.lineno+')':'')]));
addEventListener('unhandledrejection',e=>send('error',['Promesa rechazada: '+(e.reason&&e.reason.message||e.reason)]));})();<\/script>`;

function webDoc({ html, css, js }) {
  const style = `<style>${css}</style>`, script = `<script>${js.replace(/<\/script/gi, '<\\/script')}<\/script>`;
  if (/<html[\s>]/i.test(html)) {
    let d = html.includes('</head>') ? html.replace('</head>', style + '</head>') : style + html;
    d = d.includes('</body>') ? d.replace('</body>', script + '</body>') : d + script;
    return BRIDGE + d;
  }
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${BRIDGE}${style}</head><body>${html}${script}</body></html>`;
}
const jsDoc = code => `<!doctype html><html><head><meta charset="utf-8">${BRIDGE}</head><body><script type="module">try{await(async()=>{${code.replace(/<\/script/gi, '<\\/script')}\n})()}catch(e){console.error(e)}<\/script></body></html>`;

function sandbox() {
  return h('iframe', { class: 'lab-frame', title: 'Resultado', sandbox: 'allow-scripts allow-modals', referrerpolicy: 'no-referrer' });
}

// ------------------------------------------------------------------ vista
let pg = null;
async function getDb(status) {
  if (pg) return pg;
  status('Cargando PostgreSQL en el navegador (la primera vez tarda unos segundos)…');
  const { PGlite } = await import(PGLITE);
  const db = new PGlite('idb://rfs-lab');
  await db.waitReady;
  return (pg = db);
}

export async function labView() {
  const S = load();
  const view = h('div', { class: 'view' });
  view.append(heading('Laboratorio', 'Practica sin salir de la app. Lo que escribes se guarda solo en este dispositivo.'));
  const modes = [['web', 'Web', 'HTML, CSS y JavaScript'], ['js', 'JavaScript', 'Consola'], ['sql', 'SQL', 'PostgreSQL']];
  const body = h('div');
  const tabs = h('div', { class: 'lab-modes', role: 'tablist', 'aria-label': 'Modo del laboratorio' });
  let cleanup = () => {};

  function setMode(m) {
    S.mode = m; save(S); cleanup(); cleanup = () => {};
    tabs.querySelectorAll('button').forEach(b => { const on = b.dataset.m === m; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
    clear(body); body.append(m === 'web' ? webMode() : m === 'js' ? jsMode() : sqlMode());
  }
  modes.forEach(([m, t, s]) => tabs.append(h('button', { class: 'lab-mode', role: 'tab', type: 'button', dataset: { m }, onclick: () => setMode(m) }, h('b', null, t), h('small', null, s))));
  view.append(tabs, body);

  // ---- consola reutilizable
  function consolePanel() {
    const out = h('div', { class: 'lab-out', role: 'log', 'aria-live': 'polite', 'aria-label': 'Consola' });
    const push = (kind, text) => { out.append(h('div', { class: 'ln ' + kind }, text)); out.scrollTop = out.scrollHeight; };
    return { el: h('div', { class: 'lab-console' }, h('div', { class: 'row between' }, h('span', { class: 'eyebrow', style: { margin: 0 } }, 'Consola'), h('button', { class: 'btn ghost sm', onclick: () => clear(out) }, 'Limpiar')), out), push, clear: () => clear(out) };
  }
  function listen(frame, con) {
    const on = e => { if (e.source !== frame.contentWindow || !e.data?.lab) return; con.push(e.data.t, e.data.a.join(' ')); };
    window.addEventListener('message', on); const prev = cleanup; cleanup = () => { window.removeEventListener('message', on); prev(); };
  }
  function examples(kind, apply) {
    const sel = h('select', { class: 'select', 'aria-label': 'Cargar un ejemplo', onchange: async () => { if (!sel.value) return; if (await confirmDialog('Cargar ejemplo', 'Reemplaza lo que hay en el editor.', 'Cargar')) apply(sel.value); sel.value = ''; } },
      h('option', { value: '' }, 'Ejemplos…'), Object.keys(EJEMPLOS[kind]).map(k => h('option', { value: k }, k)));
    return sel;
  }

  // ---- Web
  function webMode() {
    const frame = sandbox(), con = consolePanel(); listen(frame, con);
    const run = () => { con.clear(); frame.srcdoc = webDoc(S.web); };
    const eds = {};
    const mk = k => (eds[k] = editor({ value: S.web[k], label: { html: 'Editor HTML', css: 'Editor CSS', js: 'Editor JavaScript' }[k], onChange: v => { S.web[k] = v; save(S); auto(); }, onRun: run }));
    const auto = debounce(run, 700);
    ['html', 'css', 'js'].forEach(mk);
    const filetabs = h('div', { class: 'lab-files', role: 'tablist' }, ['html', 'css', 'js'].map(k => h('button', { class: 'btn sm ghost', role: 'tab', type: 'button', dataset: { k }, onclick: () => show(k) }, { html: 'index.html', css: 'estilos.css', js: 'app.js' }[k])));
    const holder = h('div', { class: 'lab-ed' });
    function show(k) { S.tab = k; save(S); filetabs.querySelectorAll('button').forEach(b => { const on = b.dataset.k === k; b.setAttribute('aria-selected', String(on)); b.classList.toggle('on', on); }); clear(holder); holder.append(eds[k].el); }
    const wrap = h('div', { class: 'lab-grid' },
      h('section', { class: 'card flat lab-pane' }, h('div', { class: 'row between wrap', style: { marginBottom: '10px' } }, filetabs,
        h('div', { class: 'row' }, examples('web', k => { const e = EJEMPLOS.web[k]; Object.keys(e).forEach(x => eds[x].set(e[x])); run(); }),
          h('button', { class: 'btn primary sm', onclick: run }, icon('play'), 'Ejecutar'))), holder,
        h('p', { class: 'hint', style: { marginTop: '8px' } }, 'Ctrl + Enter ejecuta. Se actualiza solo al escribir. Tab sangra.')),
      h('section', { class: 'card flat lab-pane' }, h('div', { class: 'eyebrow' }, 'Resultado'), frame, con.el));
    show(S.tab || 'html'); run();
    return wrap;
  }

  // ---- JavaScript
  function jsMode() {
    const frame = h('iframe', { sandbox: 'allow-scripts allow-modals', hidden: true, title: 'Entorno de ejecución' }), con = consolePanel(); listen(frame, con);
    const run = () => { con.clear(); frame.srcdoc = jsDoc(ed.get()); };
    const ed = editor({ value: S.js, label: 'Editor JavaScript', onChange: v => { S.js = v; save(S); }, onRun: run });
    return h('div', { class: 'lab-grid' },
      h('section', { class: 'card flat lab-pane' }, h('div', { class: 'row between wrap', style: { marginBottom: '10px' } }, h('span', { class: 'eyebrow', style: { margin: 0 } }, 'app.js'),
        h('div', { class: 'row' }, examples('js', k => { ed.set(EJEMPLOS.js[k]); run(); }), h('button', { class: 'btn primary sm', onclick: run }, icon('play'), 'Ejecutar'))), ed.el,
        h('p', { class: 'hint', style: { marginTop: '8px' } }, 'Admite await en el nivel superior. Ctrl + Enter ejecuta.')),
      h('section', { class: 'card flat lab-pane' }, frame, con.el));
  }

  // ---- SQL
  function sqlMode() {
    const status = h('div', { class: 'hint', 'aria-live': 'polite' }), results = h('div', { class: 'lab-sql' });
    const run = async () => {
      clear(results); const t0 = performance.now();
      try {
        const db = await getDb(m => { status.textContent = m; });
        status.textContent = 'Ejecutando…';
        const res = await db.exec(ed.get());
        status.textContent = `Listo en ${Math.round(performance.now() - t0)} ms · ${res.length} sentencia(s)`;
        let prevAcc = 0;   // PGlite informa las filas afectadas de forma acumulada: se resta lo anterior
        res.forEach((r, i) => {
          const acc = r.affectedRows ?? 0, own = acc - prevAcc; prevAcc = acc;
          const fields = (r.fields || []).map(f => f.name);
          if (fields.length) {
            const cell = v => (v === null ? 'NULL' : typeof v === 'object' ? JSON.stringify(v) : String(v));
            const head = h('thead', null, h('tr', null, fields.map(f => h('th', { scope: 'col' }, f))));
            const rows = h('tbody', null, r.rows.slice(0, 200).map(row => h('tr', null, fields.map(f => h('td', null, cell(row[f]))))));
            results.append(h('div', { class: 'tablewrap' }, h('table', { class: 'sqlt' }, h('caption', null, `Resultado ${i + 1} · ${r.rows.length} fila(s)`), head, rows)));
          }
          else results.append(h('div', { class: 'note ok' }, icon('check'), h('div', null, `Sentencia ${i + 1}: ${r.affectedRows != null ? own + ' fila(s) afectadas' : 'ejecutada'}`)));
        });
      } catch (e) { status.textContent = ''; results.append(h('div', { class: 'note bad', role: 'alert' }, icon('alert'), h('div', null, h('b', null, 'Error de PostgreSQL: '), String(e.message || e)))); }
    };
    const ed = editor({ value: S.sql, label: 'Editor SQL', onChange: v => { S.sql = v; save(S); }, onRun: run });
    return h('div', { class: 'lab-grid' },
      h('section', { class: 'card flat lab-pane' }, h('div', { class: 'row between wrap', style: { marginBottom: '10px' } }, h('span', { class: 'eyebrow', style: { margin: 0 } }, 'consulta.sql'),
        h('div', { class: 'row wrap' }, examples('sql', k => ed.set(EJEMPLOS.sql[k])),
          h('button', { class: 'btn sm', onclick: async () => { if (!(await confirmDialog('Reiniciar la base', 'Borra todas las tablas de tu base de práctica en este dispositivo.', 'Reiniciar', true))) return; try { const db = await getDb(m => { status.textContent = m; }); await db.exec('DROP SCHEMA public CASCADE; CREATE SCHEMA public;'); clear(results); status.textContent = 'Base reiniciada'; toast('Base de práctica reiniciada', 'ok'); } catch (e) { toast(String(e.message || e), 'bad'); } } }, 'Reiniciar base'),
          h('button', { class: 'btn primary sm', onclick: run }, icon('play'), 'Ejecutar'))), ed.el,
        h('p', { class: 'hint', style: { marginTop: '8px' } }, 'PostgreSQL real (PGlite) dentro del navegador. Tus tablas se conservan en este dispositivo. Ctrl + Enter ejecuta todo el script.')),
      h('section', { class: 'card flat lab-pane' }, h('div', { class: 'eyebrow' }, 'Resultado'), status, results));
  }

  setMode(S.mode);
  view.cleanup = () => cleanup();
  return view;
}
