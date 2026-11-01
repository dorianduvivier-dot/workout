'use strict';

/* ---------- Stockage ---------- */
const KEY = 'serie-v1';
const DEFAULT_STATE = {
  exercises: [
    { id: 'pompes', name: 'Pompes', goal: 50 },
    { id: 'abdos', name: 'Abdos', goal: 50 },
    { id: 'squats', name: 'Squats', goal: 50 },
    { id: 'tractions', name: 'Tractions', goal: 30 },
  ],
  days: {},              // 'AAAA-MM-JJ' -> { goals: {id: n}, names: {id: nom}, sets: [{id, n, t}] }
  reminders: ['09:00', '12:30', '16:00', '19:00'],
  eod: '21:30',
  notified: {},          // 'AAAA-MM-JJ' -> ['09:00', 'eod', ...]
  best: 0,
};

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && Array.isArray(s.exercises)) return { ...structuredClone(DEFAULT_STATE), ...s };
  } catch (e) { /* données illisibles : on repart à zéro */ }
  return structuredClone(DEFAULT_STATE);
}
let state = load();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { toast("Impossible d'enregistrer"); }
}

/* ---------- Dates ---------- */
const pad = n => String(n).padStart(2, '0');
const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const minutesOf = hhmm => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const nowMinutes = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };

/* ---------- Logique des journées ---------- */
// Crée (ou met à jour) la journée du jour avec les objectifs actuels.
function today() {
  const k = dayKey();
  let d = state.days[k];
  if (!d) d = state.days[k] = { goals: {}, names: {}, sets: [] };
  d.goals = {}; d.names = {};
  for (const ex of state.exercises) { d.goals[ex.id] = ex.goal; d.names[ex.id] = ex.name; }
  return d;
}
const doneOf = (d, id) => d.sets.reduce((s, x) => s + (x.id === id ? x.n : 0), 0);
function progress(d) {
  if (!d) return { pct: 0, complete: false, any: false };
  const ids = Object.keys(d.goals);
  if (!ids.length) return { pct: 0, complete: false, any: false };
  let sum = 0;
  for (const id of ids) sum += Math.min(1, doneOf(d, id) / d.goals[id]);
  const pct = sum / ids.length;
  return { pct, complete: pct >= 1, any: d.sets.length > 0 };
}
function remaining(d) {
  return Object.keys(d.goals)
    .map(id => ({ name: d.names[id], left: Math.max(0, d.goals[id] - doneOf(d, id)) }))
    .filter(x => x.left > 0);
}
// Série : jours consécutifs 100 % complétés. Aujourd'hui compte s'il est fini,
// sinon la série d'hier reste "en jeu" jusqu'à minuit.
function streak() {
  let n = 0;
  let cursor = new Date();
  if (!progress(state.days[dayKey(cursor)]).complete) cursor = addDays(cursor, -1);
  while (progress(state.days[dayKey(cursor)]).complete) { n++; cursor = addDays(cursor, -1); }
  return n;
}

/* ---------- Rendu ---------- */
const $ = sel => document.querySelector(sel);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const RING = 2 * Math.PI * 52;

function render() {
  const d = today();
  const p = progress(d);
  const s = streak();
  if (s > state.best) state.best = s;
  save();

  $('#today-label').textContent = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  $('#streak-count').textContent = s;
  $('#streak').classList.toggle('dim', !p.complete);

  const ring = $('#ring-fg');
  ring.style.strokeDasharray = RING;
  ring.style.strokeDashoffset = RING * (1 - p.pct);
  ring.classList.toggle('done', p.complete);
  $('#pct').textContent = p.complete ? '✓' : Math.floor(p.pct * 100) + '%';
  $('#ring-sub').textContent = p.complete ? 'journée validée' : 'de la journée';

  let msg;
  if (p.complete) msg = `Bravo, série à ${s} jour${s > 1 ? 's' : ''} 🔥 Record : ${state.best}`;
  else if (s > 0) msg = `Termine tout aujourd'hui pour passer à ${s + 1} jours 🔥`;
  else msg = 'Termine tous tes objectifs pour lancer ta série';
  $('#streak-msg').textContent = msg;

  $('#exercise-list').innerHTML = state.exercises.map(ex => {
    const done = doneOf(d, ex.id);
    const left = Math.max(0, ex.goal - done);
    const w = Math.min(100, done / ex.goal * 100);
    return `<li class="ex ${left === 0 ? 'complete' : ''}">
      <div>
        <div class="ex-name">${esc(ex.name)}</div>
        <div class="ex-count"><b>${done}</b> / ${ex.goal} · ${left === 0 ? 'terminé ✓' : `reste ${left}`}</div>
      </div>
      <div class="ex-actions">
        <button class="icon-btn" data-undo="${ex.id}" aria-label="Annuler la dernière série" ${done ? '' : 'disabled'}>−</button>
        <button class="icon-btn plus" data-log="${ex.id}" aria-label="Ajouter des répétitions">+</button>
      </div>
      <div class="bar"><i style="width:${w}%"></i></div>
    </li>`;
  }).join('') || '<li class="hint">Ajoute des exercices dans Réglages.</li>';

  // 7 derniers jours
  const week = [];
  for (let i = 6; i >= 0; i--) {
    const date = addDays(new Date(), -i);
    const dp = progress(state.days[dayKey(date)]);
    const cls = dp.complete ? 'full' : dp.any ? 'part' : '';
    week.push(`<div class="day">${date.toLocaleDateString('fr-FR', { weekday: 'narrow' })}
      <div class="dot ${cls} ${i === 0 ? 'today' : ''}">${dp.complete ? '✓' : date.getDate()}</div></div>`);
  }
  $('#week').innerHTML = week.join('');

  renderSettings();
}

function renderSettings() {
  $('#goal-list').innerHTML = state.exercises.map(ex => `<li>
    <span class="name">${esc(ex.name)}</span>
    <input type="number" inputmode="numeric" min="1" value="${ex.goal}" data-goal="${ex.id}" aria-label="Objectif ${esc(ex.name)}">
    <button class="icon-btn" data-del="${ex.id}" aria-label="Supprimer">×</button>
  </li>`).join('');

  state.reminders.sort();
  $('#time-list').innerHTML = state.reminders.map(t => `<li>
    <span class="name">⏰ ${t}</span>
    <button class="icon-btn" data-deltime="${t}" aria-label="Supprimer">×</button>
  </li>`).join('') || '<li class="hint">Aucun rappel.</li>';

  $('#eod-input').value = state.eod;
  updateNotifStatus();
}

/* ---------- Saisie ---------- */
let logging = null;
function openLog(id) {
  const ex = state.exercises.find(e => e.id === id);
  if (!ex) return;
  logging = id;
  const left = Math.max(0, ex.goal - doneOf(today(), id));
  $('#log-title').textContent = ex.name;
  $('#log-sub').textContent = left ? `Il t'en reste ${left} sur ${ex.goal}. Combien tu viens d'en faire ?` : `Objectif atteint ! Du bonus ?`;
  $('#log-input').value = '';
  const chips = [...new Set([left, 5, 10, 15, 20].filter(n => n > 0))];
  $('#log-chips').innerHTML = chips.map((n, i) =>
    `<button type="button" class="chip" data-chip="${n}">${i === 0 && n === left ? `Tout (${n})` : n}</button>`).join('');
  $('#log-dialog').showModal();
  setTimeout(() => $('#log-input').focus(), 50);
}
function addSet(id, n) {
  if (!(n > 0)) return;
  const d = today();
  const before = progress(d).complete;
  d.sets.push({ id, n: Math.round(n), t: Date.now() });
  const ex = state.exercises.find(e => e.id === id);
  const left = Math.max(0, ex.goal - doneOf(d, id));
  render();
  const after = progress(d).complete;
  if (after && !before) toast(`Journée validée ! Série : ${streak()} 🔥`);
  else toast(left ? `+${n} ${ex.name.toLowerCase()} · reste ${left}` : `${ex.name} : terminé ✓`);
}

document.addEventListener('click', e => {
  const t = e.target.closest('button');
  if (!t) return;
  if (t.dataset.log) openLog(t.dataset.log);
  else if (t.dataset.undo) {
    const d = today();
    const i = d.sets.map(s => s.id).lastIndexOf(t.dataset.undo);
    if (i >= 0) { const [s] = d.sets.splice(i, 1); render(); toast(`Série de ${s.n} annulée`); }
  } else if (t.dataset.chip) {
    $('#log-dialog').close();
    addSet(logging, Number(t.dataset.chip));
  } else if (t.dataset.del) {
    const ex = state.exercises.find(x => x.id === t.dataset.del);
    if (ex && confirm(`Supprimer « ${ex.name} » ?`)) {
      state.exercises = state.exercises.filter(x => x.id !== ex.id);
      render();
    }
  } else if (t.dataset.deltime) {
    state.reminders = state.reminders.filter(x => x !== t.dataset.deltime);
    render();
  } else if (t.dataset.view) {
    document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b === t));
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + t.dataset.view));
    $('#headline').textContent = t.dataset.view === 'today' ? "Aujourd'hui" : 'Réglages';
    window.scrollTo(0, 0);
  }
});

$('#log-dialog').addEventListener('close', () => {
  if ($('#log-dialog').returnValue === 'ok') addSet(logging, Number($('#log-input').value));
  $('#log-dialog').returnValue = '';
});

document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.goal) {
    const ex = state.exercises.find(x => x.id === t.dataset.goal);
    const v = Math.round(Number(t.value));
    if (ex && v > 0) { ex.goal = v; render(); } else t.value = ex.goal;
  }
});

$('#add-form').addEventListener('submit', e => {
  e.preventDefault();
  const name = $('#add-name').value.trim();
  const goal = Math.round(Number($('#add-goal').value));
  if (!name || !(goal > 0)) return;
  state.exercises.push({ id: 'ex' + Date.now().toString(36), name, goal });
  e.target.reset();
  render();
  toast(`${name} ajouté`);
});

$('#time-form').addEventListener('submit', e => {
  e.preventDefault();
  const v = $('#time-input').value;
  if (v && !state.reminders.includes(v)) state.reminders.push(v);
  e.target.reset();
  render();
});

$('#eod-input').addEventListener('change', e => {
  if (e.target.value) { state.eod = e.target.value; save(); toast(`Alerte de fin de journée : ${state.eod}`); }
});

/* ---------- Notifications ---------- */
function updateNotifStatus() {
  const el = $('#notif-status'), btn = $('#notif-btn');
  if (!('Notification' in window)) {
    el.textContent = /iPhone|iPad/.test(navigator.userAgent)
      ? "Sur iPhone : ajoute d'abord l'appli à l'écran d'accueil (Partager → Sur l'écran d'accueil), puis ouvre-la depuis l'icône."
      : 'Ton navigateur ne gère pas les notifications. Utilise les rappels calendrier.';
    btn.disabled = true;
  } else if (Notification.permission === 'granted') {
    el.textContent = 'Notifications activées ✓'; btn.textContent = 'Tester une notification'; btn.disabled = false;
  } else if (Notification.permission === 'denied') {
    el.textContent = 'Notifications bloquées : réactive-les dans les réglages du téléphone.'; btn.disabled = true;
  }
}

async function notify(title, body, tag) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const opts = { body, tag, icon: 'icon-192.png', badge: 'icon-192.png', renotify: true, data: { url: './' } };
  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg) return reg.showNotification(title, opts);
  } catch (e) { /* repli ci-dessous */ }
  new Notification(title, opts);
}

$('#notif-btn').addEventListener('click', async () => {
  if (Notification.permission === 'granted') return reminderNow(true);
  const r = await Notification.requestPermission();
  updateNotifStatus();
  if (r === 'granted') { toast('Notifications activées'); syncToServiceWorker(); }
});

function reminderText(d) {
  const r = remaining(d);
  return r.map(x => `${x.left} ${x.name.toLowerCase()}`).join(', ');
}
function reminderNow(test) {
  const d = today();
  if (progress(d).complete && !test) return;
  const txt = reminderText(d);
  notify(txt ? '💪 Une petite série ?' : '✓ Journée validée', txt ? `Il te reste : ${txt}` : 'Tout est fait, bravo !', 'rappel');
}

// Vérifie chaque minute (et à chaque retour dans l'appli) si un rappel est dû.
// Un rappel n'est envoyé que s'il est dû depuis moins de 45 min, pour éviter les rafales.
function checkReminders() {
  const k = dayKey();
  const sent = state.notified[k] || (state.notified[k] = []);
  const now = nowMinutes();
  const d = today();
  if (progress(d).complete) return;
  const due = (t) => now >= minutesOf(t) && now - minutesOf(t) < 45;

  if (state.eod && due(state.eod) && !sent.includes('eod')) {
    sent.push('eod');
    const s = streak();
    notify(s ? `🔥 Ne casse pas ta série de ${s} jour${s > 1 ? 's' : ''} !` : '⏳ La journée se termine',
      `Il te reste : ${reminderText(d)}`, 'eod');
  } else {
    const t = state.reminders.find(t => due(t) && !sent.includes(t));
    if (t) { state.reminders.filter(x => minutesOf(x) <= now).forEach(x => sent.includes(x) || sent.push(x)); reminderNow(); }
  }
  // Nettoyage : on ne garde que les 3 derniers jours.
  for (const key of Object.keys(state.notified)) if (key < dayKey(addDays(new Date(), -3))) delete state.notified[key];
  save();
}

// Transmet un résumé au service worker (pour la synchro périodique Android).
async function syncToServiceWorker() {
  try {
    const cache = await caches.open('serie-state');
    const d = today();
    await cache.put('state.json', new Response(JSON.stringify({
      day: dayKey(), reminders: state.reminders, eod: state.eod,
      complete: progress(d).complete, remaining: reminderText(d), streak: streak(),
    })));
    const reg = await navigator.serviceWorker?.ready;
    if (reg && 'periodicSync' in reg) await reg.periodicSync.register('rappel', { minInterval: 60 * 60 * 1000 }).catch(() => {});
  } catch (e) { /* facultatif */ }
}

/* ---------- Calendrier (.ics) ---------- */
function buildICS() {
  const url = location.href.split('#')[0].split('?')[0];
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const start = new Date();
  const date = `${start.getFullYear()}${pad(start.getMonth() + 1)}${pad(start.getDate())}`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const goals = state.exercises.map(e => `${e.goal} ${e.name.toLowerCase()}`).join(', ');
  const icsEsc = s => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

  const event = (time, uid, title, desc) => {
    const [h, m] = time.split(':');
    return [
      'BEGIN:VEVENT', `UID:${uid}@serie-app`, `DTSTAMP:${stamp}`,
      `DTSTART;TZID=${tz}:${date}T${h}${m}00`, 'DURATION:PT5M', 'RRULE:FREQ=DAILY',
      `SUMMARY:${icsEsc(title)}`, `DESCRIPTION:${icsEsc(desc + '\n\nOuvre l\'appli : ' + url)}`, `URL:${url}`,
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(title)}`, 'TRIGGER:PT0M', 'END:VALARM',
      'END:VEVENT',
    ].join('\r\n');
  };
  const events = state.reminders.map(t =>
    event(t, `rappel-${t.replace(':', '')}`, '💪 Série de sport', `Objectifs du jour : ${goals}. Note tes répétitions dans l'appli.`));
  if (state.eod) events.push(event(state.eod, 'fin-de-journee', '🔥 Dernier appel : ne casse pas ta série',
    'Si ce n\'est pas fini, c\'est le moment de boucler tes objectifs !'));

  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Serie//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:Série sport', ...events, 'END:VCALENDAR'].join('\r\n');
}

function download(name, content, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

$('#ics-btn').addEventListener('click', () => {
  download('rappels-serie.ics', buildICS(), 'text/calendar');
  toast('Ouvre le fichier pour l\'ajouter à ton calendrier');
});

/* ---------- Sauvegarde ---------- */
$('#export-btn').addEventListener('click', () => {
  download(`serie-${dayKey()}.json`, JSON.stringify(state, null, 2), 'application/json');
});
$('#import-input').addEventListener('change', async e => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const s = JSON.parse(await f.text());
    if (!Array.isArray(s.exercises) || typeof s.days !== 'object') throw new Error();
    state = { ...structuredClone(DEFAULT_STATE), ...s };
    render();
    toast('Données restaurées');
  } catch { toast('Fichier invalide'); }
  e.target.value = '';
});

/* ---------- Divers ---------- */
let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

let lastDay = dayKey();
function tick() {
  if (dayKey() !== lastDay) { lastDay = dayKey(); render(); }
  checkReminders();
  syncToServiceWorker();
}

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
document.addEventListener('visibilitychange', () => { if (!document.hidden) { render(); tick(); } });
render();
tick();
setInterval(tick, 60 * 1000);
