// Legt de reviewgoedkeuring vast: per toets (en de trainer) de huidige hash.
//   node tools/keur-goed.mjs 1-24 trainer --notitie "rondes ..."
// Alleen draaien als alle reviewrondes voor deze toetsen zonder openstaande punten zijn afgerond.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const pad = (p) => new URL('../' + p, import.meta.url);
const args = process.argv.slice(2);
const notitie = args.includes('--notitie') ? args[args.indexOf('--notitie') + 1] : '';
const status = existsSync(pad('data/review/status.json')) ? JSON.parse(readFileSync(pad('data/review/status.json'), 'utf8')) : { toetsen: {} };
const datum = new Date().toISOString().slice(0, 10);
for (const a of args) {
  if (a === 'trainer') {
    const t = JSON.parse(readFileSync(pad('data/trainer.json'), 'utf8'));
    status.toetsen.trainer = { hash: t.hash, goedgekeurd: true, datum, notitie };
  } else if (/^\d+(-\d+)?$/.test(a)) {
    const [van, tot = van] = a.split('-').map(Number);
    for (let n = van; n <= tot; n++) {
      const t = JSON.parse(readFileSync(pad(`data/toetsen/toets-${String(n).padStart(2, '0')}.json`), 'utf8'));
      status.toetsen[n] = { hash: t.hash, goedgekeurd: true, datum, notitie };
    }
  }
}
writeFileSync(pad('data/review/status.json'), JSON.stringify(status, null, 1) + '\n');
console.log('goedgekeurd:', Object.keys(status.toetsen).join(', '));
