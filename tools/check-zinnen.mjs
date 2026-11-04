// Controleert alle zinnen in data/zinnen/ en laat per zin de vraag zien die ervan wordt gemaakt.
// Gebruik: node tools/check-zinnen.mjs [--alles] [filter]
//   zonder --alles: alleen zinnen met problemen

import { laadZinnen, maakVraag, lees } from './lib/vragen.mjs';

const vormen = lees('data/vormen.json').werkwoorden;
const regels = lees('data/regels.json');
const alles = process.argv.includes('--alles');
const filter = process.argv.slice(2).find((a) => !a.startsWith('--'));

const zinnen = laadZinnen();
const ids = new Map();
const teksten = new Map();
let fout = 0;
const telling = {};
for (const z of zinnen) {
  if (filter && !z.id?.startsWith(filter) && z.ww !== filter) continue;
  const { vraag, problemen } = maakVraag(z, vormen, regels);
  if (ids.has(z.id)) problemen.push(`id ${z.id} komt dubbel voor`);
  ids.set(z.id, true);
  const sleutelTekst = z.zin.toLowerCase().replace(/\s+/g, ' ');
  if (teksten.has(sleutelTekst)) problemen.push(`dezelfde zin staat ook bij ${teksten.get(sleutelTekst)}`);
  teksten.set(sleutelTekst, z.id);
  if (vraag) {
    const k = `${vraag.categorie}${vraag.instinker ? '*' : ''}`;
    telling[k] = (telling[k] || 0) + 1;
  }
  if (problemen.length) fout++;
  if (problemen.length || alles) {
    const opt = vraag ? [vraag.antwoord + ' ✓', ...vraag.afleiders.map((a) => `${a.vorm} (${a.soort}:${a.patroon})`)].join(' | ') : '-';
    console.log(`${z.id} [${z.slot}] ${z.zin}\n   ${opt}${vraag ? `  regel=${vraag.regel}${vraag.instinker ? ' INSTINKER' : ''}` : ''}`);
    for (const p of problemen) console.log(`   ! ${p}`);
  }
}
console.log(`\n${zinnen.length} zinnen, ${fout} met problemen.`);
console.log('Per categorie (* = instinker):', Object.entries(telling).sort().map(([k, v]) => `${k}:${v}`).join(' '));
process.exit(fout ? 1 : 0);
