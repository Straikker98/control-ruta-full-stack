// Tema claro/oscuro/automático y color de acento.
import { state } from './store.js';

const mq = window.matchMedia('(prefers-color-scheme: dark)');
export function applyTheme() {
  const p = state().profile;
  const dark = p.theme === 'dark' || (p.theme === 'auto' && mq.matches);
  const root = document.documentElement;
  root.dataset.theme = dark ? 'dark' : 'light';
  root.dataset.accent = p.accent || 'atardecer';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = dark ? '#080914' : '#f4f5fb';
}
mq.addEventListener('change', () => { if (state().profile.theme === 'auto') applyTheme(); });
