// Haalt het geslacht (de/het) op van elk zelfstandig naamwoord dat als sleutel in een od.e-, od.kaal- of
// bvd-zin staat, uit de Woordenlijst. Vaste kopie in bronnen/zelfstandig.json.
// Nodig voor de controle "een + het-woord: geen -e" (anders kan "een kloppende hart" erdoor glippen).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { parseXml, kind, kinderen, tekst } from './lib/xml.mjs';
import { laadZinnen } from './lib/vragen.mjs';

const UIT = new URL('../bronnen/zelfstandig.json', import.meta.url);
const API = 'https://woordenlijst.org/MolexServe/lexicon/find_wordform';
const cache = existsSync(UIT) ? JSON.parse(readFileSync(UIT, 'utf8')) : { bron: 'https://woordenlijst.org', woorden: {} };

const nodig = [...new Set(laadZinnen().filter((z) => /^(od|bvd)/.test(z.slot) && z.sleutel).map((z) => z.sleutel))].filter((w) => !cache.woorden[w]);
console.log(`ophalen: ${nodig.length} zelfstandige naamwoorden`);

async function haal(w) {
  const q = new URLSearchParams({ database: 'gig_pro_wrdlst', wordform: w, paradigm: 'true', diminutive: 'true', onlyvalid: 'true', regex: 'false' });
  for (let p = 1; p <= 4; p++) {
    try {
      const r = await fetch(`${API}?${q}`);
      const root = kind(parseXml(await r.text()), 'root');
      const lemmas = kinderen(root, 'found_lemmata').map((l) => ({ lemma: tekst(l, 'lemma'), pos: tekst(l, 'lemma_part_of_speech') })).filter((l) => l.pos.startsWith('NOU-C'));
      return {
        lemmas,
        enkelvoud: lemmas.some((l) => l.lemma === w),
        het: lemmas.some((l) => l.lemma === w && /gender=n/.test(l.pos)),
        de: lemmas.some((l) => l.lemma === w && /gender=[mf]/.test(l.pos)),
      };
    } catch (e) {
      if (p === 4) throw e;
      await new Promise((r) => setTimeout(r, 1000 * p));
    }
  }
}
const rij = [...nodig];
await Promise.all([1, 2, 3].map(async () => { while (rij.length) { const w = rij.shift(); cache.woorden[w] = await haal(w); } }));
cache.woorden = Object.fromEntries(Object.entries(cache.woorden).sort(([a], [b]) => a.localeCompare(b, 'nl')));
writeFileSync(UIT, JSON.stringify(cache, null, 1) + '\n');
console.log(`klaar: ${Object.keys(cache.woorden).length} woorden`);
