// Alle controles in één keer. Draait in GitHub Actions vóór elke deploy: bij één probleem gaat er niets live.
//   node tools/verifieer.mjs
//
// 1. A, B en C zijn het eens over elke gebruikte vorm (vormen.json is actueel).
// 2. Alle voorbeelden in regels.json kloppen met de goedgekeurde vormen.
// 3. Elke vraag in elke toets en in de trainer komt nog precies zo uit de zinnenbank
//    (dus: zin, antwoord, afleiders, uitleg en hints zijn nog steeds goedgekeurd door alle controles).
// 4. Per toets: 40 vragen, verdeling per onderdeel, instinkers, geen dubbel werkwoord, antwoorden 13/13/14, reserves.
// 5. Geen zin dubbel over alle toetsen en de trainer samen.
// 6. Elke toets heeft een geldige hash en is in data/review/status.json goedgekeurd met precies die hash.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { laadZinnen, maakVraag, lees } from './lib/vragen.mjs';
import { hashVan, canoniek } from './bouw-toetsen.mjs';
import { createHash } from 'node:crypto';

const pad = (p) => new URL('../' + p, import.meta.url);
const problemen = [];
const fout = (m) => problemen.push(m);
const ok = (m) => console.log('  ✓ ' + m);

// 1
try {
  execFileSync(process.execPath, [new URL('vormen.mjs', import.meta.url).pathname, '--check'], { stdio: 'pipe' });
  ok('vormen.json: regelmotor, Woordenlijst en OpenTaal zijn het eens');
} catch (e) {
  fout('vormen.json is niet actueel: ' + (e.stderr?.toString() || e.message));
}

const config = lees('data/config.json');
const vormen = lees('data/vormen.json').werkwoorden;
const regels = lees('data/regels.json');

// 2
let nVb = 0;
for (const [id, r] of Object.entries(regels.regels)) {
  if (!r.voorbeelden || r.voorbeelden.length < 2) fout(`regel ${id}: minder dan twee voorbeelden`);
  for (const v of r.voorbeelden || []) {
    nVb++;
    const f = vormen[v.ww]?.vormen[v.slot];
    if (f !== v.vorm) fout(`regel ${id}: voorbeeld ${v.ww} ${v.slot} = ${v.vorm}, maar goedgekeurd is ${f}`);
    if (!new RegExp(`(^|[^\\p{L}])${v.vorm}($|[^\\p{L}])`, 'iu').test(v.zin)) fout(`regel ${id}: voorbeeldzin bevat ${v.vorm} niet`);
  }
}
ok(`${nVb} voorbeelden in regels.json gecontroleerd`);

// 3 + 4 + 5
const zinnen = new Map(laadZinnen().map((z) => [z.id, z]));
const zonderPositie = ({ opties, goed, ...rest }) => rest;
const gezien = new Map();
const tekstGezien = new Map();
function controleerVraag(v, waar) {
  const z = zinnen.get(v.id);
  if (!z) return fout(`${waar}: zin ${v.id} bestaat niet meer in de zinnenbank`);
  const { vraag, problemen: p } = maakVraag(z, vormen, regels);
  if (p.length) fout(`${waar}: ${v.id} slaagt niet meer voor de controles: ${p.join('; ')}`);
  if (!vraag || canoniek(zonderPositie(v)) !== canoniek(vraag)) fout(`${waar}: ${v.id} is anders dan wat de zinnenbank nu oplevert (toets opnieuw laten reviewen)`);
  if (v.opties?.[v.goed] !== v.antwoord) fout(`${waar}: ${v.id} heeft het goede antwoord niet op positie ${v.goed}`);
  if (new Set(v.opties.map((o) => o.toLowerCase())).size !== 3) fout(`${waar}: ${v.id} heeft geen drie verschillende opties`);
  if (gezien.has(v.id)) fout(`${v.id} staat in ${gezien.get(v.id)} én in ${waar}`);
  gezien.set(v.id, waar);
  const t = v.zin.toLowerCase();
  if (tekstGezien.has(t) && tekstGezien.get(t) !== v.id) fout(`dezelfde zin in ${v.id} en ${tekstGezien.get(t)}`);
  tekstGezien.set(t, v.id);
}

const status = existsSync(pad('data/review/status.json')) ? lees('data/review/status.json').toetsen : {};
const blocklist = lees('data/blocklist.json').vragen.map((b) => b.id);
const dir = pad('data/toetsen/');
const bestanden = readdirSync(dir).filter((f) => /^toets-\d+\.json$/.test(f)).sort();
for (const f of bestanden) {
  const t = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
  const waar = `toets ${t.toets}`;
  const voor = problemen.length;
  if (t.vragen.length !== config.vragenPerToets) fout(`${waar}: ${t.vragen.length} vragen in plaats van ${config.vragenPerToets}`);
  for (const [cat, n] of Object.entries(config.verdeling)) {
    const k = t.vragen.filter((v) => v.categorie === cat).length;
    if (k !== n) fout(`${waar}: ${k} vragen ${cat}, verwacht ${n}`);
    const r = t.reserves.filter((v) => v.categorie === cat).length;
    if (r < config.reservePerCategorie) fout(`${waar}: ${r} reserves ${cat}, verwacht ${config.reservePerCategorie}`);
  }
  const ww = [...t.vragen, ...t.reserves].map((v) => v.ww);
  if (new Set(ww).size !== ww.length) fout(`${waar}: een werkwoord komt twee keer voor`);
  const pos = [0, 1, 2].map((p) => t.vragen.filter((v) => v.goed === p).length);
  if (pos.some((x) => Math.abs(x - t.vragen.length / 3) > 1)) fout(`${waar}: antwoorden niet gelijk verdeeld (${pos.join('/')})`);
  const doel = (config.instinkers.find((x) => t.toets >= x.van && t.toets <= x.tot) || config.instinkers.at(-1)).aantal;
  const ins = t.vragen.filter((v) => v.instinker).length;
  if (Math.abs(ins - doel) > 1) fout(`${waar}: ${ins} instinkers, verwacht ongeveer ${doel}`);
  for (const v of t.vragen) controleerVraag(v, waar);
  for (const v of t.reserves) controleerVraag(v, waar + ' (reserve)');
  if (hashVan(t) !== t.hash) fout(`${waar}: hash klopt niet (de toets is met de hand veranderd)`);
  const s = status[t.toets];
  if (!s || s.hash !== t.hash || !s.goedgekeurd) fout(`${waar}: niet goedgekeurd in data/review/status.json met hash ${t.hash}`);
  if (problemen.length === voor) ok(`${waar}: ${t.vragen.length} vragen, ${ins} instinkers, posities ${pos.join('/')}, hash ${t.hash}, goedgekeurd`);
}

if (existsSync(pad('data/trainer.json'))) {
  const tr = lees('data/trainer.json');
  const voor = problemen.length;
  for (const v of tr.vragen) controleerVraag(v, 'trainer');
  if (createHash('sha256').update(canoniek(tr.vragen)).digest('hex').slice(0, 16) !== tr.hash) fout('trainer: hash klopt niet');
  const s = status.trainer;
  if (!s || s.hash !== tr.hash || !s.goedgekeurd) fout(`trainer: niet goedgekeurd in data/review/status.json met hash ${tr.hash}`);
  if (problemen.length === voor) ok(`trainer: ${tr.vragen.length} vragen, goedgekeurd`);
}
for (const id of blocklist) if (!gezien.has(id)) fout(`blocklist: ${id} staat in geen enkele toets`);

// vrijgave: elke gebouwde toets heeft een datum
for (const f of bestanden) {
  const n = Number(f.match(/\d+/)[0]);
  if (!config.vrijgave.some((v) => v.toets === n)) fout(`toets ${n} heeft geen vrijgavedatum in config.json`);
}

if (problemen.length) {
  console.error(`\n${problemen.length} probleem/problemen:`);
  for (const p of problemen) console.error('  ✗ ' + p);
  process.exit(1);
}
console.log('\nAlles klopt.');
