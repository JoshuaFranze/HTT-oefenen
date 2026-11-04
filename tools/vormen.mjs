// Fase 1: drie controles op elke werkwoordsvorm.
//  A = regelmotor (tools/lib/regelmotor.mjs)
//  B = Woordenlijst Nederlandse Taal (vaste kopie)
//  C = OpenTaal-woordenlijst
// Een vorm komt alleen in data/vormen.json als A, B en C hetzelfde zeggen.
// Alles wat afvalt, komt met de reden in data/niet-gebruiken.json.
//
// Gebruik: node tools/vormen.mjs           (schrijft de bestanden)
//          node tools/vormen.mjs --check   (alleen controleren of ze nog kloppen; voor CI)

import { readFileSync, writeFileSync } from 'node:fs';
import { vervoeg, soortWerkwoord, SLOTS } from './lib/regelmotor.mjs';
import { wntVormen, opentaal } from './lib/bronnen.mjs';

const pad = (p) => new URL('../' + p, import.meta.url);
const lexicon = JSON.parse(readFileSync(pad('data/lexicon.json'), 'utf8')).werkwoorden;
const ot = opentaal();

const goed = {};
const afgekeurd = [];
const verschillen = []; // A en B zijn het oneens: dat moet ik bekijken (fout in lexicon of motor)

for (const e of lexicon) {
  const { vormen: a, stam, klank } = vervoeg(e);
  const b = wntVormen(e.inf);
  const rij = { soort: soortWerkwoord(e), stam, klank, ...(e.leen ? { leen: true } : {}), ...(e.vv ? { vv: e.vv } : {}), ...(e.sch ? { sch: e.sch } : {}), vormen: {}, alleVormen: [] };
  const weg = (slot, reden) => afgekeurd.push({ inf: e.inf, slot, reden });

  if (!b || !b.lemmas.length) {
    weg('*', 'niet gevonden in de Woordenlijst');
    continue;
  }
  if (b.lemmas.some((l) => !l.keurmerk)) weg('*', 'lemma zonder keurmerk in de Woordenlijst');
  const advies = b.lemmas.map((l) => l.taaladvies).filter(Boolean);
  if (advies.length) rij.taaladvies = advies;

  for (const slot of SLOTS) {
    const vorm = a[slot];
    if (!vorm) continue;
    const isBvd = slot.startsWith('bvd');
    const bSlot = isBvd ? 'vd' : slot;
    const bs = b.slots[bSlot];
    if (!bs || !bs.gewoon.size) { weg(slot, 'Woordenlijst geeft deze vorm niet'); continue; }
    const alle = new Set([...bs.gewoon, ...bs.archaisch]);
    if (alle.size > 1) { weg(slot, `meer dan één vorm goed volgens de Woordenlijst: ${[...alle].join(' / ')}`); continue; }
    const bVorm = [...bs.gewoon][0];
    const aVorm = isBvd ? a.vd : vorm;
    if (aVorm !== bVorm) {
      verschillen.push({ inf: e.inf, slot, A: aVorm, B: bVorm });
      weg(slot, `regelmotor (${aVorm}) en Woordenlijst (${bVorm}) verschillen`);
      continue;
    }
    if (!ot.has(vorm)) { weg(slot, `${vorm} staat niet in OpenTaal`); continue; }
    rij.vormen[slot] = vorm;
  }
  // alle vormen die volgens de Woordenlijst bij dit werkwoord horen (voor de afleiders)
  rij.alleVormen = [...b.alleVormen].filter((v) => !v.includes(' ')).sort();
  if (afgekeurd.some((x) => x.inf === e.inf && x.slot === '*')) continue;
  goed[e.inf] = rij;
}

const uitGoed = JSON.stringify({ uitleg: 'Gegenereerd door tools/vormen.mjs. Alleen vormen waarover regelmotor, Woordenlijst en OpenTaal het eens zijn.', werkwoorden: goed }, null, 1) + '\n';
const uitWeg = JSON.stringify({ uitleg: 'Gegenereerd door tools/vormen.mjs. Deze vormen worden niet gebruikt, met de reden.', vormen: afgekeurd }, null, 1) + '\n';

if (process.argv.includes('--check')) {
  const oud = readFileSync(pad('data/vormen.json'), 'utf8');
  if (oud !== uitGoed) {
    console.error('data/vormen.json klopt niet meer met lexicon en bronnen. Draai: node tools/vormen.mjs');
    process.exit(1);
  }
  console.log('vormen.json klopt met A, B en C.');
} else {
  writeFileSync(pad('data/vormen.json'), uitGoed);
  writeFileSync(pad('data/niet-gebruiken.json'), uitWeg);
  const n = Object.values(goed).reduce((s, r) => s + Object.keys(r.vormen).length, 0);
  console.log(`${Object.keys(goed).length} werkwoorden, ${n} goedgekeurde vormen, ${afgekeurd.length} afgekeurd.`);
  if (verschillen.length) {
    console.log(`\nA en B verschillen (${verschillen.length}):`);
    for (const v of verschillen) console.log(`  ${v.inf} ${v.slot}: A=${v.A} B=${v.B}`);
  }
}
