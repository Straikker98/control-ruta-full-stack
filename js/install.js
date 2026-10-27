// Instalación como app (PWA). Android/Chrome/Edge: aviso nativo guardado para un botón propio.
// iPhone/iPad (Safari) no tiene aviso: solo se puede "Añadir a pantalla de inicio" a mano.
let deferred = null;
const subs = new Set();
const notify = () => subs.forEach(f => f());
export const onInstallChange = fn => { subs.add(fn); return () => subs.delete(fn); };
export const isInstalled = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const canPrompt = () => !!deferred;

window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; notify(); });
window.addEventListener('appinstalled', () => { deferred = null; notify(); });

export async function promptInstall() {
  if (!deferred) return false;
  deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null; notify();
  return outcome === 'accepted';
}
