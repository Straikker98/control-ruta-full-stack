// Carga de contenido público (JSON). El progreso nunca se guarda aquí.
const cache = new Map();

function load(path) {
  if (!cache.has(path)) {
    const p = fetch(path, { cache: 'no-cache' }).then(r => {
      if (!r.ok) throw new Error(`No se pudo cargar ${path} (${r.status})`);
      return r.json();
    });
    p.catch(() => cache.delete(path));
    cache.set(path, p);
  }
  return cache.get(path);
}
const pad = n => String(n).padStart(2, '0');

export const getConfig = () => load('content/config.json');
export const getRoute = () => load('content/route.json');
export const getIndex = () => load('content/index.json');
export const getChecklist = () => load('content/checklist.json');
export const getBadges = () => load('content/badges.json');
export const getTopic = w => load(`content/topics/${pad(w)}.json`);
export const getExam = w => load(`content/exams/${pad(w)}.json`).catch(() => null);

export async function weekInfo(w) {
  const r = await getRoute();
  return r.weeks.find(x => x.week === Number(w));
}
export async function topicReady(w) {
  const t = await getTopic(w).catch(() => null);
  return !!t && t.estado === 'completo' && t.sections.length > 0;
}
export function invalidate() { cache.clear(); }
