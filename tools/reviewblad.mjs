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
const compact = process.argv.includes('--compact'); // alleen zin, opties, sleutel, korte uitleg en uitleg per afleider
const zonderTrainer = process.argv.includes('--zonder-trainer');
const deelArg = process.argv.includes('--delen') ? Number(process.argv[process.argv.indexOf('--delen') + 1]) : 1;

const vragen = [];
for (let n = van; n <= tot; n++) {
  const t = JSON.parse(readFileSync(pad(`data/toetsen/toets-${String(n).padStart(2, '0')}.json`), 'utf8'));
  for (const v of t.vragen) vragen.push({ ...v, bron: `toets ${n}` });
  for (const v of t.reserves) vragen.push({ ...v, bron: `toets ${n} (reserve)` });
}
if (existsSync(pad('data/trainer.json')) && !idsArg && !zonderTrainer) for (const v of JSON.parse(readFileSync(pad('data/trainer.json'), 'utf8')).vragen) vragen.push({ ...v, bron: 'trainer' });
const lijst = idsArg ? vragen.filter((v) => idsArg.has(v.id)) : vragen;

function schrijfDelen(lijst, naam) {
  const per = Math.ceil(lijst.length / deelArg);
  for (let d = 0; d < deelArg; d++) {
    const stuk = lijst.slice(d * per, (d + 1) * per);
    const achter = deelArg > 1 ? `-deel${d + 1}` : '';
    const blind = [`# Reviewblad (blind) – toets ${bereik}${achter}`, '', 'Kies bij elke zin de juist gespelde werkwoordsvorm (1, 2 of 3). Er is steeds precies één goed antwoord bedoeld.', ''];
    const vol = [`# Reviewblad (${compact ? 'compact' : 'volledig'}) – toets ${bereik}${achter}`, ''];
    for (const v of stuk) {
      const opt = v.opties.map((o, i) => `${i + 1}. ${o}`).join('   ');
      blind.push(`**${v.id}** — ${v.zin}  `, `${opt}`, '');
      if (compact) {
        vol.push(`**${v.id}** (${v.categorie}${v.instinker ? ', instinker' : ''}) ${v.zin}  `, `${opt} → **${v.antwoord}**  `, `Uitleg: ${v.uitleg.kort}  `, ...Object.values(v.uitleg.perAfleider).map((t) => `– ${t}  `), '');
      } else {
        vol.push(
          `## ${v.id} (${v.bron}, ${CATEGORIE[v.categorie]}${v.instinker ? ', instinker' : ''})`,
          `**Zin:** ${v.zin}  `, `**Opties:** ${opt}  `, `**Sleutel:** ${v.goed + 1}. ${v.antwoord}  `, `**Regel:** ${v.regel}  `, `**Uitleg:** ${v.uitleg.kort}  `,
          ...v.uitleg.stappen.map((s, i) => `Stap ${i + 1}: ${s}  `),
          ...Object.entries(v.uitleg.perAfleider).map(([, t]) => `Bij deze afleider: ${t}  `),
          `**Onthoud:** ${v.uitleg.onthoud}  `,
          ...v.hints.map((h, i) => `**Hint ${i + 1}:** ${h.replace(/\n/g, ' / ')}  `), '');
      }
    }
    writeFileSync(pad(`review/${naam}${achter}-blind.md`), blind.join('\n'));
    writeFileSync(pad(`review/${naam}${achter}-${compact ? 'compact' : 'volledig'}.md`), vol.join('\n'));
  }
}
mkdirSync(pad('review'), { recursive: true });
const naam = idsArg ? `herkansing-${Date.now()}` : `blad-${bereik}`;
schrijfDelen(lijst, naam);
console.log(`${lijst.length} vragen -> review/${naam}* (${deelArg} deel/delen${compact ? ', compact' : ''})`);
