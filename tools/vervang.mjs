// Vervangt gemarkeerde vragen in bestaande toetsen door een ongebruikte vraag uit hetzelfde onderdeel
// (zelfde soort: instinker of niet), op dezelfde plek en met het goede antwoord op dezelfde positie.
// De gemarkeerde zinnen gaan uit de zinnenbank (naar data/zinnen/geschrapt.json).
//   node tools/vervang.mjs --ids tt-1003,vd-1020
// Geeft de ids van de nieuwe vragen terug: die moeten nog een (kleine) review krijgen.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { laadZinnen, maakVraag, lees } from './lib/vragen.mjs';
import { hashVan } from './bouw-toetsen.mjs';

const pad = (p) => new URL('../' + p, import.meta.url);
const ids = new Set(process.argv[process.argv.indexOf('--ids') + 1].split(','));
const vormen = lees('data/vormen.json').werkwoorden;
const regels = lees('data/regels.json');

// 1. zinnen schrappen
const geschrapt = existsSync(pad('data/zinnen/geschrapt.json')) ? lees('data/zinnen/geschrapt.json') : { uitleg: 'Na review geschrapte zinnen (niet meer gebruiken).', zinnen: [] };
for (const f of readdirSync(pad('data/zinnen/')).filter((f) => f.endsWith('.json') && f !== 'geschrapt.json')) {
  const p = pad('data/zinnen/' + f);
  const d = JSON.parse(readFileSync(p, 'utf8'));
  const weg = d.zinnen.filter((z) => ids.has(z.id));
  if (!weg.length) continue;
  geschrapt.zinnen.push(...weg);
  d.zinnen = d.zinnen.filter((z) => !ids.has(z.id));
  writeFileSync(p, '{\n "zinnen": [\n' + d.zinnen.map((x) => '  ' + JSON.stringify(x)).join(',\n') + '\n ]\n}\n');
}
writeFileSync(pad('data/zinnen/geschrapt.json'), JSON.stringify(geschrapt, null, 1) + '\n');

// 2. toetsen bijwerken
const dir = pad('data/toetsen/');
const toetsen = readdirSync(dir).filter((f) => /^toets-\d+\.json$/.test(f)).map((f) => ({ f, t: JSON.parse(readFileSync(new URL(f, dir), 'utf8')) }));
const gebruikt = new Set(toetsen.flatMap(({ t }) => [...t.vragen, ...t.reserves].map((v) => v.id)));
lees('data/trainer.json').vragen.forEach((v) => gebruikt.add(v.id));
const pool = laadZinnen().filter((z) => !gebruikt.has(z.id)).map((z) => maakVraag(z, vormen, regels)).filter((x) => x.vraag && !x.problemen.length).map((x) => x.vraag);
const nieuw = [];
for (const { f, t } of toetsen) {
  let veranderd = false;
  const ww = () => new Set([...t.vragen, ...t.reserves].map((v) => v.ww));
  for (const lijst of [t.vragen, t.reserves]) {
    for (let i = 0; i < lijst.length; i++) {
      const v = lijst[i];
      if (!ids.has(v.id)) continue;
      const bezet = ww();
      const k = pool.find((p) => p.categorie === v.categorie && p.instinker === v.instinker && !bezet.has(p.ww)) || pool.find((p) => p.categorie === v.categorie && !bezet.has(p.ww));
      if (!k) throw new Error(`geen vervanging voor ${v.id} in toets ${t.toets}`);
      pool.splice(pool.indexOf(k), 1);
      const opties = k.afleiders.map((a) => a.vorm);
      opties.splice(v.goed, 0, k.antwoord);
      lijst[i] = { ...k, opties, goed: v.goed };
      nieuw.push(k.id);
      veranderd = true;
    }
  }
  if (veranderd) {
    t.hash = hashVan(t);
    writeFileSync(new URL(f, dir), JSON.stringify(t, null, 1) + '\n');
    console.log(`toets ${t.toets} bijgewerkt, hash ${t.hash}`);
  }
}
console.log('NIEUW:' + nieuw.join(','));
