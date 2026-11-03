// Robot de rappels : lancé toutes les 15 min par GitHub Actions.
// 1. Lit le dernier état publié par l'appli sur ntfy (sujet "<topic>-etat").
// 2. Si une heure de rappel vient de passer et que la journée n'est pas finie,
//    envoie une notification push sur le sujet "<topic>" (appli ntfy sur le téléphone).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const TOPIC = (process.env.NTFY_TOPIC || '').trim();
const BASE = process.env.NTFY_BASE || 'https://ntfy.sh';
const MEMO = process.env.MEMO_FILE || '.rappels/memo.json';
const NOW = process.env.NOW ? new Date(process.env.NOW) : new Date();
const WINDOW = 45; // minutes : au-delà, un rappel raté n'est plus envoyé

if (!TOPIC) {
  console.log('Secret NTFY_TOPIC absent : rien à faire.');
  process.exit(0);
}

let memo = {};
try { memo = JSON.parse(readFileSync(MEMO, 'utf8')); } catch { /* premier passage */ }
memo.sent ||= {};

// Dernier état publié par l'appli (ntfy garde les messages 12 h).
try {
  const res = await fetch(`${BASE}/${TOPIC}-etat/json?poll=1&since=12h`);
  if (res.ok) {
    const lines = (await res.text()).trim().split('\n').filter(Boolean);
    for (const line of lines) {
      const m = JSON.parse(line);
      if (m.event !== 'message') continue;
      const s = JSON.parse(m.message);
      if (!memo.state || (s.updated || 0) >= (memo.state.updated || 0)) memo.state = s;
    }
  } else console.log('Lecture ntfy :', res.status);
} catch (e) { console.log('Lecture ntfy impossible :', e.message); }

const s = memo.state;
if (!s) {
  console.log("Aucun état reçu de l'appli pour l'instant.");
  save();
  process.exit(0);
}

// Date et heure locales dans le fuseau du téléphone.
const tz = s.tz || 'Europe/Paris';
const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
  timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
}).formatToParts(NOW).map(p => [p.type, p.value]));
const today = `${parts.year}-${parts.month}-${parts.day}`;
const nowMin = Number(parts.hour) * 60 + Number(parts.minute);
const yesterday = (() => {
  const d = new Date(`${today}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
})();
const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

// Si l'appli n'a rien publié aujourd'hui, on considère que rien n'est fait.
const isToday = s.day === today;
const exercises = (s.exercises || []).map(e => ({ ...e, done: isToday ? e.done : 0 }));
const left = exercises.filter(e => e.done < e.goal).map(e => `${e.goal - e.done} ${e.name.toLowerCase()}`);
const complete = isToday ? s.complete : false;
// Série en jeu : celle qui s'arrêtera si la journée n'est pas bouclée.
const streak = isToday ? s.streak : (s.day === yesterday && s.complete ? s.streak : 0);

const sent = (memo.sent[today] ||= []);
for (const k of Object.keys(memo.sent)) if (k < yesterday) delete memo.sent[k];

const due = t => nowMin >= toMin(t) && nowMin - toMin(t) < WINDOW && !sent.includes(t);
let notif = null;

if (complete || !exercises.length) {
  console.log('Journée validée (ou aucun objectif) : pas de rappel.');
} else if (s.eod && due(s.eod)) {
  sent.push(s.eod);
  notif = {
    title: streak ? `🔥 Ne casse pas ta série de ${streak} jour${streak > 1 ? 's' : ''} !` : '⏳ La journée se termine',
    message: `Il te reste : ${left.join(', ')}`,
    priority: 5,
  };
} else {
  const passed = (s.reminders || []).filter(due);
  if (passed.length) {
    sent.push(...passed);
    const total = exercises.reduce((a, e) => a + Math.min(e.done, e.goal), 0);
    const goal = exercises.reduce((a, e) => a + e.goal, 0);
    notif = {
      title: total ? `💪 ${Math.floor(total / goal * 100)} % fait, on continue ?` : '💪 Une petite série ?',
      message: `Il te reste : ${left.join(', ')}`,
      priority: 4,
    };
  }
}

if (notif) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: TOPIC, tags: ['muscle'], click: s.url, ...notif }),
  });
  console.log('Notification envoyée :', notif.title, '→', res.status);
} else if (!complete && exercises.length) console.log(`Rien à envoyer (${today} ${parts.hour}:${parts.minute} ${tz}).`);

save();

function save() {
  mkdirSync(dirname(MEMO), { recursive: true });
  writeFileSync(MEMO, JSON.stringify(memo));
}
