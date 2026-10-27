// Avatares: personajes de anime ordenados de menos a más famosos; se desbloquean al completar temas.
// Si existe una imagen en assets/avatars/ (listada en index.json), se usa; si no, se dibuja un avatar geométrico.
// Las ilustraciones originales tienen derechos de autor: este repositorio NO las incluye (ver assets/avatars/LEEME.md).
export const ROSTER = [
  ['Kirito', 'Sword Art Online'], ['Asuna', 'Sword Art Online'], ['Rem', 'Re:Zero'], ['Megumin', 'KonoSuba'],
  ['Rock Lee', 'Naruto'], ['Kaneki Ken', 'Tokyo Ghoul'], ['Natsu Dragneel', 'Fairy Tail'], ['Erza Scarlet', 'Fairy Tail'],
  ['Gon Freecss', 'Hunter x Hunter'], ['Killua Zoldyck', 'Hunter x Hunter'], ['Hinata Hyuga', 'Naruto'], ['Sakura Haruno', 'Naruto'],
  ['Kakashi Hatake', 'Naruto'], ['Gaara', 'Naruto'], ['Nami', 'One Piece'], ['Sanji', 'One Piece'], ['Nico Robin', 'One Piece'],
  ['Tony Tony Chopper', 'One Piece'], ['Usopp', 'One Piece'], ['Bulma', 'Dragon Ball'], ['Piccolo', 'Dragon Ball'], ['Gohan', 'Dragon Ball'],
  ['Trunks', 'Dragon Ball'], ['Frieza', 'Dragon Ball'], ['Spike Spiegel', 'Cowboy Bebop'], ['Alphonse Elric', 'Fullmetal Alchemist'],
  ['Roy Mustang', 'Fullmetal Alchemist'], ['Edward Elric', 'Fullmetal Alchemist'], ['Ryuk', 'Death Note'], ['L Lawliet', 'Death Note'],
  ['Light Yagami', 'Death Note'], ['Armin Arlert', 'Attack on Titan'], ['Mikasa Ackerman', 'Attack on Titan'], ['Denji', 'Chainsaw Man'],
  ['Power', 'Chainsaw Man'], ['Makima', 'Chainsaw Man'], ['Ochaco Uraraka', 'My Hero Academia'], ['Todoroki Shoto', 'My Hero Academia'],
  ['Bakugo Katsuki', 'My Hero Academia'], ['All Might', 'My Hero Academia'], ['Deku', 'My Hero Academia'], ['Inosuke Hashibira', 'Demon Slayer'],
  ['Zenitsu Agatsuma', 'Demon Slayer'], ['Rengoku Kyojuro', 'Demon Slayer'], ['Nezuko Kamado', 'Demon Slayer'], ['Nobara Kugisaki', 'Jujutsu Kaisen'],
  ['Megumi Fushiguro', 'Jujutsu Kaisen'], ['Sukuna', 'Jujutsu Kaisen'], ['Yuji Itadori', 'Jujutsu Kaisen'], ['Genos', 'One Punch Man'],
  ['Ichigo Kurosaki', 'Bleach'], ['Levi Ackerman', 'Attack on Titan'], ['Eren Yeager', 'Attack on Titan'], ['Tanjiro Kamado', 'Demon Slayer'],
  ['Satoru Gojo', 'Jujutsu Kaisen'], ['Roronoa Zoro', 'One Piece'], ['Saitama', 'One Punch Man'], ['Vegeta', 'Dragon Ball'],
  ['Itachi Uchiha', 'Naruto'], ['Sasuke Uchiha', 'Naruto'], ['Monkey D. Luffy', 'One Piece'], ['Naruto Uzumaki', 'Naruto'], ['Goku', 'Dragon Ball'],
];
export const STARTERS = 4;                      // disponibles desde el inicio; el resto, uno por tema completado
export const unlockTopic = i => Math.max(0, i - STARTERS + 1);   // tema que se debe completar para el avatar i
export const avatarInfo = id => { const n = parseInt(String(id).slice(1), 10) || 0; const r = ROSTER[n]; return { n, name: r ? r[0] : `Avatar ${n + 1}`, from: r ? r[1] : '' }; };

const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
let images = {};                                // { slug: archivo } según assets/avatars/index.json
export async function loadAvatarImages() {
  try { const r = await fetch('assets/avatars/index.json', { cache: 'no-cache' }); if (r.ok) images = await r.json(); } catch { images = {}; }
}

// Avatares geométricos generados (sin imágenes con derechos de autor): 100 diseños únicos y deterministas.
const img = n => { const f = ROSTER[n] && images[slug(ROSTER[n][0])]; return f ? `<image href="assets/avatars/${f}" width="64" height="64" preserveAspectRatio="xMidYMid slice"/>` : ''; };
export function avatar(id, size = 44) {
  const n = parseInt(String(id).slice(1), 10) || 0;
  const hue = (n * 47 + 12) % 360, hue2 = (hue + 40 + (n % 7) * 11) % 360;
  const bg1 = `hsl(${hue} 70% 58%)`, bg2 = `hsl(${hue2} 75% 42%)`, ink = 'rgba(255,255,255,.9)', ink2 = 'rgba(255,255,255,.4)';
  const shapes = [
    `<circle cx="32" cy="32" r="14" fill="${ink}"/><circle cx="32" cy="32" r="24" fill="none" stroke="${ink2}" stroke-width="3"/>`,
    `<path d="M10 46 L32 14 L54 46 Z" fill="${ink}"/><circle cx="32" cy="38" r="5" fill="${bg2}"/>`,
    `<rect x="16" y="16" width="32" height="32" rx="9" fill="${ink}" transform="rotate(${(n % 5) * 9} 32 32)"/><rect x="24" y="24" width="16" height="16" rx="4" fill="${bg2}"/>`,
    `<path d="M8 40 Q20 12 32 32 T56 24" fill="none" stroke="${ink}" stroke-width="6" stroke-linecap="round"/><circle cx="46" cy="46" r="6" fill="${ink2}"/>`,
    `<path d="M32 10 L40 26 L58 28 L45 40 L48 58 L32 49 L16 58 L19 40 L6 28 L24 26 Z" fill="${ink}"/>`,
    `<g fill="${ink}"><circle cx="20" cy="20" r="7"/><circle cx="44" cy="20" r="7"/><circle cx="20" cy="44" r="7"/><circle cx="44" cy="44" r="7"/></g><circle cx="32" cy="32" r="8" fill="${ink2}"/>`,
    `<path d="M32 12 C46 12 54 24 50 36 C47 46 38 52 32 52 C26 52 17 46 14 36 C10 24 18 12 32 12Z" fill="${ink}"/><circle cx="25" cy="30" r="3.5" fill="${bg2}"/><circle cx="39" cy="30" r="3.5" fill="${bg2}"/><path d="M25 41 Q32 46 39 41" stroke="${bg2}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    `<g stroke="${ink}" stroke-width="5" stroke-linecap="round"><path d="M16 20h32M16 32h24M16 44h30"/></g>`,
  ];
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 64 64'); s.setAttribute('width', size); s.setAttribute('height', size);
  s.setAttribute('class', 'avatar'); s.setAttribute('role', 'img'); s.setAttribute('aria-label', avatarInfo(id).name);
  s.style.setProperty('--size', size + 'px');
  s.innerHTML = `<defs><linearGradient id="g${n}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient></defs><rect width="64" height="64" fill="url(#g${n})"/>${shapes[(n + Math.floor(n / 8)) % shapes.length]}${img(n)}`;
  return s;
}
