// Maakt leesbare reviewbladen voor een reeks toetsen (plus reserves en trainer).
//   node tools/reviewblad.mjs 1-4            -> review/blad-1-4-blind.md en review/blad-1-4-volledig.md
//   node tools/reviewblad.mjs 1-4 --ids a,b  -> alleen deze vraag-ids (voor een herkansing)
// Het blinde blad heeft geen antwoorden en geen uitleg: alleen zin en opties.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { CATEGORIE } from './lib/uitleg.mjs';

const pad = (p) => new URL('../' + p, import.meta.url);
const [bereik = '1-4'] = process.argv.slice(2);
const idsArg = process.argv.includes('--ids') ? new Set(process.argv[process.argv.indexOf('--ids') + 1].split(',')) : null;
const [van, tot = van] = bereik.split('-').map(Number);

const vragen = [];
for (let n = van; n <= tot; n++) {
  const t = JSON.parse(readFileSync(pad(`data/toetsen/toets-${String(n).padStart(2, '0')}.json`), 'utf8'));
  for (const v of t.vragen) vragen.push({ ...v, bron: `toets ${n}` });
  for (const v of t.reserves) vragen.push({ ...v, bron: `toets ${n} (reserve)` });
}
if (existsSync(pad('data/trainer.json')) && !idsArg) for (const v of JSON.parse(readFileSync(pad('data/trainer.json'), 'utf8')).vragen) vragen.push({ ...v, bron: 'trainer' });
const lijst = idsArg ? vragen.filter((v) => idsArg.has(v.id)) : vragen;

const blind = [`# Reviewblad (blind) – toets ${bereik}`, '', 'Kies bij elke zin de juist gespelde werkwoordsvorm (1, 2 of 3). Er is steeds precies één goed antwoord bedoeld.', ''];
const vol = [`# Reviewblad (volledig) – toets ${bereik}`, '', 'Per vraag: zin, opties, sleutel, regel, uitleg, hints.', ''];
for (const v of lijst) {
  const opt = v.opties.map((o, i) => `${i + 1}. ${o}`).join('   ');
  blind.push(`**${v.id}** — ${v.zin}  `, `${opt}`, '');
  vol.push(
    `## ${v.id} (${v.bron}, ${CATEGORIE[v.categorie]}${v.instinker ? ', instinker' : ''})`,
    `**Zin:** ${v.zin}  `,
    `**Opties:** ${opt}  `,
    `**Sleutel:** ${v.goed + 1}. ${v.antwoord}  `,
    `**Regel:** ${v.regel}  `,
    `**Uitleg:** ${v.uitleg.kort}  `,
    ...v.uitleg.stappen.map((s, i) => `Stap ${i + 1}: ${s}  `),
    ...Object.entries(v.uitleg.perAfleider).map(([k, t]) => `Bij ${k}: ${t}  `),
    `**Onthoud:** ${v.uitleg.onthoud}  `,
    ...v.hints.map((h, i) => `**Hint ${i + 1}:** ${h.replace(/\n/g, ' / ')}  `),
    '',
  );
}
mkdirSync(pad('review'), { recursive: true });
const naam = idsArg ? `herkansing-${Date.now()}` : `blad-${bereik}`;
writeFileSync(pad(`review/${naam}-blind.md`), blind.join('\n'));
writeFileSync(pad(`review/${naam}-volledig.md`), vol.join('\n'));
console.log(`${lijst.length} vragen -> review/${naam}-blind.md en review/${naam}-volledig.md`);
