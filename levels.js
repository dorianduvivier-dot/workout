'use strict';
// Niveaux : paliers par exercice (répétitions par jour, moyenne sur 7 jours)
// et silhouette du corps colorée selon le niveau de chaque muscle.

const TIERS = [
  { name: 'Bronze', color: '#c8814f' },
  { name: 'Argent', color: '#b9c3cf' },
  { name: 'Or', color: '#f2c14e' },
  { name: 'Diamant', color: '#59d0f2' },
  { name: 'Maître', color: '#a77dff', single: true },
  { name: 'Légende', color: '#ff4d6d', single: true },
];
// 14 paliers : Bronze I→III, Argent I→III, Or I→III, Diamant I→III, Maître, Légende.
const LEVELS = TIERS.flatMap(t => t.single ? [{ ...t, label: t.name, step: 3 }]
  : [1, 2, 3].map(step => ({ ...t, label: `${t.name} ${'I'.repeat(step)}`, step })));

// Seuils (rép./jour) estimés pour chaque type d'exercice, du Bronze I à Légende.
const KINDS = {
  pompes:    { label: 'Pompes',    muscles: ['chest', 'triceps', 'delts'],                   t: [10, 15, 20, 30, 40, 50, 65, 80, 100, 125, 150, 175, 200, 300] },
  tractions: { label: 'Tractions', muscles: ['lats', 'biceps', 'forearms', 'traps'],          t: [3, 5, 8, 12, 16, 20, 25, 30, 40, 50, 60, 75, 100, 150] },
  abdos:     { label: 'Abdos',     muscles: ['abs', 'obliques'],                             t: [15, 25, 35, 50, 65, 80, 100, 120, 150, 180, 220, 260, 300, 400] },
  squats:    { label: 'Squats',    muscles: ['quads', 'glutes', 'hamstrings'],               t: [15, 25, 35, 50, 65, 80, 100, 125, 150, 180, 220, 260, 300, 400] },
  dips:      { label: 'Dips',      muscles: ['triceps', 'chest', 'delts'],                   t: [5, 8, 12, 18, 24, 30, 40, 50, 60, 75, 90, 110, 130, 200] },
  fentes:    { label: 'Fentes',    muscles: ['quads', 'glutes', 'hamstrings'],               t: [10, 15, 20, 30, 40, 50, 65, 80, 100, 120, 140, 160, 200, 300] },
  mollets:   { label: 'Mollets',   muscles: ['calves'],                                      t: [20, 30, 40, 60, 80, 100, 125, 150, 180, 220, 260, 300, 400, 600] },
  burpees:   { label: 'Burpees',   muscles: ['chest', 'delts', 'quads', 'abs', 'calves'],    t: [5, 8, 12, 18, 24, 30, 40, 50, 60, 75, 90, 110, 130, 200] },
  lombaires: { label: 'Lombaires / dos', muscles: ['lowerback', 'glutes'],                   t: [10, 15, 20, 30, 40, 50, 65, 80, 100, 120, 140, 160, 200, 300] },
  autre:     { label: 'Autre',     muscles: [],                                              t: [10, 15, 20, 30, 40, 50, 65, 80, 100, 125, 150, 175, 200, 300] },
};

function guessKind(name) {
  const n = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (/pomp|push/.test(n)) return 'pompes';
  if (/tract|pull|chin|traction/.test(n)) return 'tractions';
  if (/abdo|crunch|sit.?up|gainage|relev/.test(n)) return 'abdos';
  if (/squat|flexion/.test(n)) return 'squats';
  if (/dip/.test(n)) return 'dips';
  if (/fente|lunge/.test(n)) return 'fentes';
  if (/mollet|calf|calves/.test(n)) return 'mollets';
  if (/burpee/.test(n)) return 'burpees';
  if (/lombaire|superman|dos/.test(n)) return 'lombaires';
  return 'autre';
}

// Niveau (0 = non classé, 1..14) pour une moyenne de rép./jour.
function levelFor(kind, avg) {
  const t = (KINDS[kind] || KINDS.autre).t;
  let lvl = 0;
  while (lvl < t.length && avg >= t[lvl]) lvl++;
  return lvl;
}
const levelInfo = lvl => lvl ? LEVELS[lvl - 1] : { label: 'Non classé', color: null, step: 0 };
const nextThreshold = (kind, lvl) => (KINDS[kind] || KINDS.autre).t[lvl]; // undefined au max

// Couleur d'un niveau : la teinte du rang, plus intense de I à III.
function levelColor(lvl) {
  const L = levelInfo(lvl);
  if (!L.color) return null;
  return `color-mix(in srgb, ${L.color} ${[0, 55, 78, 100][L.step]}%, #2a2e38)`;
}

/* ---------- Silhouette ---------- */
// Formes de la moitié gauche (vue de face / de dos), recopiées en miroir.
const NEUTRAL = {
  front: [
    '<circle cx="100" cy="28" r="17"/>',
    '<rect x="92" y="42" width="16" height="16" rx="4"/>',
    '<ellipse cx="55" cy="188" rx="6" ry="9"/>',
    '<path d="M78 158 L99 158 L99 172 Q88 176 77 168 Z"/>',
    '<ellipse cx="88" cy="243" rx="8" ry="6"/>',
    '<ellipse cx="88" cy="326" rx="9" ry="5"/>',
  ],
  back: [
    '<circle cx="100" cy="28" r="17"/>',
    '<rect x="92" y="42" width="16" height="16" rx="4"/>',
    '<ellipse cx="55" cy="188" rx="6" ry="9"/>',
    '<ellipse cx="88" cy="243" rx="8" ry="6"/>',
    '<ellipse cx="88" cy="326" rx="9" ry="5"/>',
  ],
};
const REGIONS = {
  front: {
    traps: ['M92 54 L76 63 L92 64 Z'],
    delts: ['M66 61 Q53 64 53 80 Q55 88 61 90 Q70 78 76 64 Z'],
    chest: ['M98 66 L80 65 Q70 72 72 88 Q78 101 98 99 Z'],
    biceps: ['M56 91 Q50 110 54 128 L66 128 Q71 108 66 90 Z'],
    forearms: ['M53 132 Q46 152 50 177 L60 177 Q67 152 66 132 Z'],
    abs: ['M86 103 h11 v14 h-11 Z', 'M86 120 h11 v15 h-11 Z', 'M86 138 h11 v17 h-11 Z'],
    obliques: ['M83 104 L75 102 Q73 130 79 155 L83 155 Z'],
    quads: ['M77 172 Q71 200 77 233 Q87 238 97 233 Q101 202 99 176 Z'],
    calves: ['M80 252 Q76 284 82 318 L94 318 Q98 284 96 252 Z'],
  },
  back: {
    lats: ['M97 88 L79 70 Q69 92 76 122 Q86 136 97 140 Z'],
    traps: ['M93 50 Q84 58 72 64 L97 90 L97 50 Z'],
    delts: ['M66 61 Q53 64 53 80 Q55 88 61 90 Q70 78 74 66 Z'],
    triceps: ['M56 91 Q50 110 54 128 L66 128 Q71 108 66 90 Z'],
    forearms: ['M53 132 Q46 152 50 177 L60 177 Q67 152 66 132 Z'],
    lowerback: ['M88 141 h10 v17 h-10 Z'],
    glutes: ['M78 158 Q71 174 79 190 Q91 196 99 188 L99 160 Z'],
    hamstrings: ['M78 194 Q73 214 79 234 Q88 238 97 234 Q101 214 99 194 Z'],
    calves: ['M80 252 Q73 274 81 302 Q89 307 95 299 Q99 274 96 252 Z'],
  },
};
const MUSCLE_NAMES = {
  chest: 'Pectoraux', delts: 'Épaules', triceps: 'Triceps', biceps: 'Biceps', forearms: 'Avant-bras',
  traps: 'Trapèzes', lats: 'Dorsaux', abs: 'Abdos', obliques: 'Obliques', quads: 'Quadriceps',
  glutes: 'Fessiers', hamstrings: 'Ischios', calves: 'Mollets', lowerback: 'Lombaires',
};

// muscleLevels : { chest: 5, ... } → SVG des deux vues.
function bodySVG(muscleLevels) {
  const mirror = s => s + s.replace(/^<(\w+)/, '<$1 transform="matrix(-1 0 0 1 200 0)"');
  const view = (side, dx) => {
    const neutral = NEUTRAL[side].map(mirror).join('');
    const regions = Object.entries(REGIONS[side]).map(([m, paths]) => {
      const fill = levelColor(muscleLevels[m] || 0) || 'var(--body-off)';
      const title = `<title>${MUSCLE_NAMES[m]} : ${levelInfo(muscleLevels[m] || 0).label}</title>`;
      return `<g fill="${fill}" class="muscle">${title}${paths.map(d => mirror(`<path d="${d}"/>`)).join('')}</g>`;
    }).join('');
    return `<g transform="translate(${dx} 0)"><g class="body-base">${neutral}</g>${regions}
      <text x="100" y="352" text-anchor="middle" class="body-label">${side === 'front' ? 'Face' : 'Dos'}</text></g>`;
  };
  return `<svg viewBox="38 4 244 356" class="body" role="img" aria-label="Niveau de chaque muscle">${view('front', 0)}${view('back', 120)}</svg>`;
}

window.Levels = { TIERS, LEVELS, KINDS, guessKind, levelFor, levelInfo, nextThreshold, levelColor, bodySVG, MUSCLE_NAMES };
