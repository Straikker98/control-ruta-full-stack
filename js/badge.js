// Medallas de las insignias: hexágono con relieve, color por nivel (bronce, plata, oro) y un símbolo propio por habilidad.
// Los trazos son constantes del proyecto (no contenido externo).
const GLYPH = {
  terminal: '<path d="M4 17l6-5-6-5"/><path d="M12 19h8"/>',
  html: '<path d="M8 8l-5 4 5 4M16 8l5 4-5 4M14 5l-4 14"/>',
  git: '<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="9" r="2"/><path d="M6 7v10M18 11c0 4-6 3-12 6"/>',
  css: '<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.5-2-.6-1.2.2-2.5 1.6-2.5H17a4 4 0 0 0 4-4C21 6.5 17 3 12 3z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
  javascript: '<path d="M9 4C6 4 7 8 5 12c2 4 1 8 4 8M15 4c3 0 2 4 4 8-2 4-1 8-4 8"/>',
  sql: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  node: '<path d="M12 2l8.7 5v10L12 22l-8.7-5V7z"/><path d="M9 16V8l6 8V8"/>',
  rest: '<path d="M4 8h14l-4-4M20 16H6l4 4"/>',
  typescript: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 11h6M12 11v7"/>',
  react: '<circle cx="12" cy="12" r="1.6"/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/>',
  supabase: '<path d="M13 2L3 14h9l-1 8 10-12h-9z"/>',
  vercel: '<path d="M12 4l9 16H3z"/>',
  docker: '<rect x="3" y="11" width="4" height="4"/><rect x="8" y="11" width="4" height="4"/><rect x="13" y="11" width="4" height="4"/><rect x="8" y="6" width="4" height="4"/><path d="M2 16c1 4 5 5 9 5 6 0 9-3 10-8-1-1-3-1-4 0"/>',
  cicd: '<path d="M21 12a9 9 0 0 1-15.5 6.2M3 12a9 9 0 0 1 15.5-6.2"/><path d="M18.5 2v4h-4M5.5 22v-4h4"/>',
  nextjs: '<circle cx="12" cy="12" r="9"/><path d="M9 16V8l7 9M16 8v4"/>',
  seguridad: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  algoritmos: '<circle cx="12" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/><path d="M12 7v4M12 11H6v6M12 11h6v6"/>',
  python: '<path d="M12 3c-4 0-5 1.5-5 3v3h5v1H6c-2 0-3 2-3 4s1 4 3 4h2v-3c0-1.5 1-3 3-3h4c1.5 0 3-1 3-3V6c0-2-2-3-6-3z"/><circle cx="10" cy="6" r=".8"/><path d="M12 21c4 0 5-1.5 5-3v-3h-5v-1h6c2 0 3-2 3-4"/>',
  award: '<circle cx="12" cy="8" r="7"/><path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12"/>',
};
//          claro      medio      oscuro
const TIER = { fundamentos: ['#fde0b8', '#d9873b', '#8a4b14'], aplicado: ['#ffffff', '#b9c5d8', '#66758c'], avanzado: ['#fff4b8', '#f7b81c', '#b56a00'] };
const HEX = '50,3 92,26.5 92,73.5 50,97 8,73.5 8,26.5';
let uid = 0;

/** state: done | pending | open | retry | locked */
export function medal(id, tier, state = 'locked', size = 88) {
  const [l, m, d] = TIER[tier] || TIER.fundamentos, k = 'md' + (uid++);
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 100 100'); s.setAttribute('width', size); s.setAttribute('height', size);
  s.setAttribute('class', `medal ${tier} ${state}`); s.setAttribute('aria-hidden', 'true');
  s.innerHTML = `<defs>
    <linearGradient id="${k}r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${l}"/><stop offset=".5" stop-color="${m}"/><stop offset="1" stop-color="${d}"/></linearGradient>
    <linearGradient id="${k}i" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${d}"/><stop offset="1" stop-color="${m}"/></linearGradient>
    <linearGradient id="${k}s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
    <polygon points="${HEX}" fill="url(#${k}r)" stroke-linejoin="round"/>
    <polygon points="50,11 85,31 85,69 50,89 15,69 15,31" fill="url(#${k}i)" stroke="rgba(255,255,255,.4)" stroke-width="1.2" stroke-linejoin="round"/>
    <g class="gl" transform="translate(29 29) scale(1.75)" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${GLYPH[id] || GLYPH.award}</g>
    <polygon points="${HEX}" fill="url(#${k}s)"/>
    ${state === 'locked' ? '<g class="lk"><circle cx="80" cy="80" r="13" fill="#0e1024" stroke="rgba(255,255,255,.35)"/><g transform="translate(72.5 72.5) scale(.62)" fill="none" stroke="#c9ccee" stroke-width="2.4" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></g></g>' : ''}
    ${state === 'done' ? '<g class="ck"><circle cx="80" cy="80" r="13" fill="#22c55e" stroke="#fff" stroke-width="2"/><path d="M73.5 80.5l4.5 4.5 8-9" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></g>' : ''}`;
  return s;
}
