// Fase 3: toetsen samenstellen en vastzetten.
//
//   node tools/bouw-toetsen.mjs --toetsen 1-4      bouwt toets 1 t/m 4 (bestaande toetsen blijven staan)
//   node tools/bouw-toetsen.mjs --trainer 10       maakt de trainerbank (10 vragen per onderdeel)
//   node tools/bouw-toetsen.mjs --opnieuw 3        bouwt toets 3 opnieuw (alleen vóór de review!)
//
// Een toets wordt één keer gebouwd en daarna niet meer aangeraakt. Alle keuzes zijn vast
// (vaste seed per toets), dus geen willekeur tijdens het oefenen.

import { writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { laadZinnen, maakVraag, lees } from './lib/vragen.mjs';

const pad = (p) => new URL('../' + p, import.meta.url);
const config = lees('data/config.json');
const vormen = lees('data/vormen.json').werkwoorden;
const regels = lees('data/regels.json');

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const schud = (arr, r) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export function canoniek(x) {
  if (Array.isArray(x)) return `[${x.map(canoniek).join(',')}]`;
  if (x && typeof x === 'object') return `{${Object.keys(x).sort().map((k) => JSON.stringify(k) + ':' + canoniek(x[k])).join(',')}}`;
  return JSON.stringify(x);
}
export const hashVan = (toets) => createHash('sha256').update(canoniek({ vragen: toets.vragen, reserves: toets.reserves })).digest('hex').slice(0, 16);

/** Zet de opties op volgorde: het goede antwoord op positie pos. */
function metOpties(v, pos) {
  const opties = v.afleiders.map((a) => a.vorm);
  opties.splice(pos, 0, v.antwoord);
  return { ...v, opties, goed: pos };
}

const nummer = (n) => String(n).padStart(2, '0');
const toetsPad = (n) => pad(`data/toetsen/toets-${nummer(n)}.json`);

function gebruikteZinnen() {
  const gebruikt = new Map();
  const dir = pad('data/toetsen/');
  for (const f of readdirSync(dir).filter((f) => /^toets-\d+\.json$/.test(f))) {
    const t = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
    for (const v of [...t.vragen, ...t.reserves]) gebruikt.set(v.id, `toets ${t.toets}`);
  }
  if (existsSync(pad('data/trainer.json'))) for (const v of lees('data/trainer.json').vragen) gebruikt.set(v.id, 'trainer');
  return gebruikt;
}

function alleVragen() {
  const uit = [];
  for (const z of laadZinnen()) {
    const { vraag, problemen } = maakVraag(z, vormen, regels);
    if (vraag && !problemen.length) uit.push(vraag);
  }
  return uit;
}

function instinkersVoor(n) {
  const r = config.instinkers.find((x) => n >= x.van && n <= x.tot);
  return r ? r.aantal : config.instinkers.at(-1).aantal;
}

/** Verdeelt het aantal instinkers over de onderdelen (grootste rest). */
function verdeelInstinkers(totaal) {
  const v = config.verdeling;
  const N = config.vragenPerToets;
  const ruw = Object.entries(v).map(([c, n]) => [c, (n * totaal) / N]);
  const basis = Object.fromEntries(ruw.map(([c, x]) => [c, Math.floor(x)]));
  let rest = totaal - Object.values(basis).reduce((a, b) => a + b, 0);
  for (const [c] of [...ruw].sort((a, b) => (b[1] % 1) - (a[1] % 1))) if (rest-- > 0) basis[c]++;
  return basis;
}

function bouwToets(n, pool, gebruikt) {
  const r = rng(1000 + n);
  const doel = verdeelInstinkers(instinkersVoor(n));
  const wwInToets = new Set();
  const gekozen = [];
  const reserves = [];
  const neem = (v) => { wwInToets.add(v.ww); gebruikt.set(v.id, `toets ${n}`); return v; };
  const vrij = (v) => !gebruikt.has(v.id) && !wwInToets.has(v.ww);

  for (const [cat, aantal] of Object.entries(config.verdeling)) {
    const kandidaten = schud(pool.filter((v) => v.categorie === cat), r);
    let ins = doel[cat];
    const gewoon = aantal - ins;
    const kies = (filter, k) => {
      const uit = [];
      for (const v of kandidaten) {
        if (uit.length >= k) break;
        if (filter(v) && vrij(v)) uit.push(neem(v));
      }
      return uit;
    };
    let a = kies((v) => v.instinker, ins);
    let b = kies((v) => !v.instinker, gewoon);
    // te weinig van een soort? dan aanvullen met de andere soort
    if (a.length + b.length < aantal) b = b.concat(kies(() => true, aantal - a.length - b.length));
    if (a.length + b.length < aantal) throw new Error(`toets ${n}: te weinig vragen voor ${cat} (nodig ${aantal}, gevonden ${a.length + b.length}). Schrijf meer zinnen.`);
    gekozen.push(...a, ...b);
    const res = kies(() => true, config.reservePerCategorie);
    if (res.length < config.reservePerCategorie) throw new Error(`toets ${n}: te weinig reservevragen voor ${cat}`);
    reserves.push(...res);
  }

  // volgorde door elkaar, maar vast
  const volgorde = schud(gekozen, r);
  // goede antwoord gelijk verdeeld: 13/13/14 (bij 40 vragen)
  const N = volgorde.length;
  const posities = schud([...Array(N)].map((_, i) => i % 3), r);
  const vragen = volgorde.map((v, i) => metOpties(v, posities[i]));
  const resPos = schud(reserves.map((_, i) => i % 3), r);
  const res = reserves.map((v, i) => metOpties(v, resPos[i]));
  const toets = { toets: n, titel: `Oefentoets ${n}`, vragen, reserves: res };
  toets.hash = hashVan(toets);
  return toets;
}

function schrijf(p, obj) {
  writeFileSync(p, JSON.stringify(obj, null, 1) + '\n');
}

function index() {
  const dir = pad('data/toetsen/');
  const lijst = readdirSync(dir)
    .filter((f) => /^toets-\d+\.json$/.test(f))
    .map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')))
    .sort((a, b) => a.toets - b.toets)
    .map((t) => ({ toets: t.toets, hash: t.hash, aantal: t.vragen.length }));
  schrijf(pad('data/toetsen/gebouwd.json'), { uitleg: 'Overzicht van gebouwde toetsen (gegenereerd). Alleen toetsen die ook in data/review/status.json zijn goedgekeurd, komen live.', toetsen: lijst });
}

const args = process.argv.slice(2);
const arg = (naam) => { const i = args.indexOf(naam); return i >= 0 ? args[i + 1] : null; };

if (arg('--toetsen') || arg('--opnieuw')) {
  const opnieuw = arg('--opnieuw') ? new Set(arg('--opnieuw').split(',').map(Number)) : new Set();
  let [van, tot] = (arg('--toetsen') || [...opnieuw].join('-')).split('-').map(Number);
  tot ||= van;
  const gebruikt = gebruikteZinnen();
  // zinnen van toetsen die opnieuw gebouwd worden, komen weer vrij
  for (const n of opnieuw) {
    if (!existsSync(toetsPad(n))) continue;
    const t = JSON.parse(readFileSync(toetsPad(n), 'utf8'));
    for (const v of [...t.vragen, ...t.reserves]) gebruikt.delete(v.id);
  }
  const pool = alleVragen();
  for (let n = van; n <= tot; n++) {
    if (existsSync(toetsPad(n)) && !opnieuw.has(n)) { console.log(`toets ${n} bestaat al en blijft vast`); continue; }
    const t = bouwToets(n, pool, gebruikt);
    schrijf(toetsPad(n), t);
    const ins = t.vragen.filter((v) => v.instinker).length;
    const pos = [0, 1, 2].map((p) => t.vragen.filter((v) => v.goed === p).length).join('/');
    console.log(`toets ${n}: ${t.vragen.length} vragen, ${ins} instinkers, posities ${pos}, hash ${t.hash}`);
  }
  index();
}

if (arg('--trainer')) {
  const per = Number(arg('--trainer'));
  const gebruikt = gebruikteZinnen();
  for (const [id, waar] of [...gebruikt]) if (waar === 'trainer') gebruikt.delete(id);
  const r = rng(424242);
  const pool = alleVragen().filter((v) => !gebruikt.has(v.id));
  const vragen = [];
  for (const cat of Object.keys(config.verdeling)) {
    // trainer = valkuilen oefenen: liefst instinkers
    const k = schud(pool.filter((v) => v.categorie === cat), r).sort((a, b) => b.instinker - a.instinker).slice(0, per);
    if (k.length < per) console.log(`let op: trainer ${cat} heeft maar ${k.length} vragen`);
    vragen.push(...k);
  }
  const res = vragen.map((v) => metOpties(v, Math.floor(r() * 3)));
  const t = { uitleg: 'Vragen voor de valkuilen-trainer. Komen nooit in een oefentoets.', vragen: res };
  t.hash = createHash('sha256').update(canoniek(res)).digest('hex').slice(0, 16);
  schrijf(pad('data/trainer.json'), t);
  console.log(`trainer: ${res.length} vragen, hash ${t.hash}`);
}

// --herbouw: bestaande toetsen en trainer opnieuw opbouwen met dezelfde vragen, volgorde en posities
// (alleen nodig als de uitleg-sjablonen veranderd zijn). Daarna moet de review opnieuw bevestigd worden.
if (args.includes('--herbouw')) {
  const zinnen = new Map(laadZinnen().map((z) => [z.id, z]));
  const opnieuw = (v) => {
    const { vraag, problemen } = maakVraag(zinnen.get(v.id), vormen, regels);
    if (!vraag || problemen.length) throw new Error(`${v.id}: ${problemen.join('; ')}`);
    return metOpties(vraag, v.goed);
  };
  const dir = pad('data/toetsen/');
  for (const f of readdirSync(dir).filter((f) => /^toets-\d+\.json$/.test(f))) {
    const t = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
    t.vragen = t.vragen.map(opnieuw);
    t.reserves = t.reserves.map(opnieuw);
    t.hash = hashVan(t);
    schrijf(new URL(f, dir), t);
    console.log(`toets ${t.toets} herbouwd, hash ${t.hash}`);
  }
  if (existsSync(pad('data/trainer.json'))) {
    const tr = lees('data/trainer.json');
    tr.vragen = tr.vragen.map(opnieuw);
    tr.hash = createHash('sha256').update(canoniek(tr.vragen)).digest('hex').slice(0, 16);
    schrijf(pad('data/trainer.json'), tr);
    console.log(`trainer herbouwd, hash ${tr.hash}`);
  }
  index();
}
