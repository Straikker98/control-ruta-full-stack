// Utilidades de DOM, fechas y azar. Sin dependencias.
export const $ = (sel, root = document) => root.querySelector(sel);

/** Crea un elemento. Los hijos son texto (seguro) o nodos; nunca se interpreta HTML. */
export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k in el && k !== 'list' && k !== 'form') { try { el[k] = v; } catch { el.setAttribute(k, v); } }
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, kids);
  return el;
}
export function append(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
  return el;
}
export const frag = (...kids) => append(document.createDocumentFragment(), kids);
export function clear(el) { while (el.firstChild) el.firstChild.remove(); return el; }

/** Texto con `código` y **negrita** convertidos a nodos (sin innerHTML). */
export function inline(text) {
  const out = [];
  const re = /(`[^`\n]+`|\*\*[^*\n]+\*\*)/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    out.push(tok[0] === '`' ? h('code', null, tok.slice(1, -1)) : h('strong', null, tok.slice(2, -2)));
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

// ---- Fechas (hora local del dispositivo; el usuario está en America/Bogota)
const pad = n => String(n).padStart(2, '0');
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const fmtDate = ts => ts ? new Date(ts).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
export const fmtDateTime = ts => ts ? new Date(ts).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
export const fmtMin = m => m >= 60 ? `${Math.floor(m / 60)} h ${m % 60 ? (m % 60) + ' min' : ''}`.trim() : `${m} min`;
export const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
export const plural = (n, uno, otros) => `${n} ${n === 1 ? uno : otros}`;

// ---- Azar reproducible
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function shuffle(arr, rand = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// ---- Avisos efímeros (región aria-live)
export function toast(msg, kind = '') {
  const box = document.getElementById('toasts'); if (!box) return;
  const t = h('div', { class: 'toast ' + kind, role: 'status' }, msg);
  box.append(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 200); }, 3800);
}

export function confirmDialog(title, text, okLabel = 'Confirmar', danger = false) {
  return new Promise(res => {
    const dlg = h('dialog', null,
      h('h3', null, title), h('p', { class: 'muted' }, text),
      h('div', { class: 'row', style: { justifyContent: 'flex-end', marginTop: '20px' } },
        h('button', { class: 'btn ghost', onclick: () => dlg.close('no') }, 'Cancelar'),
        h('button', { class: 'btn ' + (danger ? 'danger' : 'primary'), onclick: () => dlg.close('si') }, okLabel)));
    dlg.addEventListener('close', () => { res(dlg.returnValue === 'si'); dlg.remove(); });
    document.body.append(dlg); dlg.showModal();
  });
}

export function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
