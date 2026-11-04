// Welke werkwoorden zijn goedgekeurd voor een vorm, en hoe vaak komen ze al voor in de zinnenbank?
//   node tools/werkwoorden-voor.mjs vd            (alle werkwoorden met een goedgekeurd voltooid deelwoord)
//   node tools/werkwoorden-voor.mjs tt.hij --leen (alleen Engelse leenwoorden)
import { laadZinnen, lees } from './lib/vragen.mjs';
const [slot] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const leen = process.argv.includes('--leen');
const vormen = lees('data/vormen.json').werkwoorden;
const tel = {};
for (const z of laadZinnen()) if (z.slot === slot) tel[z.ww] = (tel[z.ww] || 0) + 1;
const rij = Object.entries(vormen).filter(([, w]) => w.vormen[slot] && !!w.leen === leen).map(([inf, w]) => `${inf}=${w.vormen[slot]}${w.soort !== 'zwak' ? '(' + w.soort + ')' : ''}${w.vv ? '[vv ' + w.vv + ']' : ''}${w.sch ? '[sch ' + w.sch + ']' : ''}${tel[inf] ? ' x' + tel[inf] : ''}`);
console.log(`${rij.length} werkwoorden voor ${slot}${leen ? ' (leen)' : ''}:\n` + rij.join('  '));
