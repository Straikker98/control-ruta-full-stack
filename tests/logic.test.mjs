// Pruebas de las reglas de desbloqueo. Ejecutar: node --test tests/logic.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';

// Entorno mínimo de navegador para importar los módulos de la app
const mem = new Map();
globalThis.localStorage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };
globalThis.document = { addEventListener() {}, getElementById: () => null, querySelector: () => null };
globalThis.window = { addEventListener() {} };
globalThis.addEventListener = () => {};
globalThis.matchMedia = () => ({ matches: false, addEventListener() {} });

const L = await import('../js/logic.js');
const { state, mutate, resetAll } = await import('../js/store.js');
const { ROSTER, STARTERS, unlockTopic } = await import('../js/avatar.js');

test('el tema 1 está abierto y el 2 se bloquea hasta completar el 1', () => {
  resetAll();
  assert.equal(L.isUnlocked(1), true);
  assert.equal(L.isUnlocked(2), false);
  mutate(S => { S.topics[1] = { done: true }; });
  assert.equal(L.isUnlocked(2), true);
});

test('el examen Fácil exige entregar el trabajo; los demás exigen aprobar el anterior', () => {
  resetAll();
  mutate(S => { S.topics[1] = { startedAt: 1, cuaderno: { done: true }, trabajo: { status: 'none' }, exams: {} }; });
  assert.ok(L.examLock(1, 'facil'));
  mutate(S => { S.topics[1].trabajo = { status: 'pending' }; });
  assert.equal(L.examLock(1, 'facil'), '');
  assert.ok(L.examLock(1, 'medio'));
  mutate(S => { S.topics[1].exams.facil = { attempts: [], best: 9, passed: true }; });
  assert.equal(L.examLock(1, 'medio'), '');
});

test('el examen se califica sobre 10 y aprueba con 9,0', () => {
  resetAll();
  mutate(S => { S.topics[1] = { startedAt: 1, cuaderno: { done: true }, trabajo: { status: 'pending' }, exams: {} }; });
  assert.equal(L.recordAttempt(1, 'facil', { correct: 11, total: 12, wrong: ['01a'] }).score, 9.2);
  assert.equal(L.recordAttempt(1, 'medio', { correct: 10, total: 12, wrong: ['01b', '01c'] }).passed, false);   // 8,3
  assert.equal(L.recordAttempt(1, 'dificil', { correct: 12, total: 12, wrong: [] }).passed, true);
});

test('el tema se cierra solo con cuaderno, trabajo aprobado y los tres exámenes', () => {
  resetAll();
  mutate(S => { S.current = 1; S.topics[1] = { startedAt: 1, cuaderno: { done: true }, trabajo: { approved: true }, exams: { facil: { passed: true, attempts: [], best: 9 }, medio: { passed: true, attempts: [], best: 9 }, dificil: { passed: false, attempts: [], best: 5 } } }; });
  assert.equal(L.checkComplete(1), false);
  mutate(S => { S.topics[1].exams.dificil.passed = true; });
  assert.equal(L.checkComplete(1), true);
  assert.equal(state().topics[1].done, true);
  assert.equal(state().current, null);
});

test('los avatares: 4 iniciales y uno más por tema completado, con el más famoso al final', () => {
  resetAll();
  assert.equal(L.avatarsUnlocked(), STARTERS);
  mutate(S => { S.topics[1] = { done: true }; S.topics[2] = { done: true }; });
  assert.equal(L.avatarsUnlocked(), STARTERS + 2);
  assert.equal(L.AVATAR_COUNT, ROSTER.length);
  assert.equal(ROSTER.at(-1)[0], 'Goku');
  assert.equal(unlockTopic(STARTERS), 1);
});

test('las tarjetas propias vuelven pronto si se fallan y se espacian si se aciertan', () => {
  resetAll();
  L.addCard('¿Qué es DNS?', 'Traduce nombres a IP');
  const [{ id }] = L.dueCards();
  L.gradeCard(id, true);
  assert.equal(L.dueCards().length, 0);
  L.gradeCard(id, false);
  assert.ok(state().cards[id].due - Date.now() <= 10 * 60 * 1000 + 50);
});
