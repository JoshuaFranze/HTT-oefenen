// Haalt voor elk werkwoord uit data/lexicon.json het volledige paradigma op uit de
// Woordenlijst Nederlandse Taal (Groene Boekje, Taalunie/INT) en bewaart een
// vaste kopie in bronnen/woordenlijst.json. De controles gebruiken alleen die kopie,
// zodat de build niet afhangt van internet en altijd hetzelfde uitkomt.
//
// Gebruik: node tools/haal-woordenlijst.mjs            (alleen ontbrekende ophalen)
//          node tools/haal-woordenlijst.mjs --alles    (alles opnieuw ophalen)

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { parseXml, kind, kinderen, tekst } from './lib/xml.mjs';

const API = 'https://woordenlijst.org/MolexServe/lexicon/find_wordform';
const UIT = new URL('../bronnen/woordenlijst.json', import.meta.url);
const LEX = new URL('../data/lexicon.json', import.meta.url);

const alles = process.argv.includes('--alles');
const lexicon = JSON.parse(readFileSync(LEX, 'utf8'));
const cache = existsSync(UIT) && !alles ? JSON.parse(readFileSync(UIT, 'utf8')) : { bron: 'https://woordenlijst.org (database gig_pro_wrdlst)', ww: {} };

function leesLemma(l) {
  const par = kind(l, 'paradigm');
  return {
    lemma: tekst(l, 'lemma'),
    lemmaId: tekst(l, 'lemma_id'),
    pos: tekst(l, 'lemma_part_of_speech'),
    label: tekst(l, 'label'),
    werkwoordKenmerken: tekst(l, 'verb_features'),
    hulpwerkwoord: tekst(l, 'hulpwerkwoord'),
    taaladvies: tekst(l, 'taaladvies'),
    nuance: tekst(l, 'nuancerende_opmerking'),
    keurmerk: tekst(l, 'keurmerk') === 'true',
    paradigma: par
      ? kinderen(par, 'paradigm').map((p) => ({
          vorm: tekst(p, 'wordform'),
          label: tekst(p, 'label'),
          groep: tekst(p, 'group_label'),
          pos: tekst(p, 'part_of_speech'),
          archaisch: tekst(p, 'arch') === 'true',
          keurmerk: tekst(p, 'keurmerk') === 'true',
        }))
      : [],
  };
}

async function haal(inf) {
  const q = new URLSearchParams({ database: 'gig_pro_wrdlst', wordform: inf, part_of_speech: 'VRB', paradigm: 'true', diminutive: 'false', onlyvalid: 'true', regex: 'false' });
  for (let poging = 1; poging <= 4; poging++) {
    try {
      const res = await fetch(`${API}?${q}`, { headers: { 'User-Agent': 'htt-oefenen-bronnencontrole' } });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const boom = parseXml(await res.text());
      const root = kind(boom, 'root');
      const lemmas = kinderen(root, 'found_lemmata').map(leesLemma).filter((l) => l.pos.startsWith('VRB'));
      return { opgehaald: new Date().toISOString().slice(0, 10), lemmas };
    } catch (e) {
      if (poging === 4) throw new Error(`${inf}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 1000 * 2 ** poging));
    }
  }
}

const teDoen = lexicon.werkwoorden.map((w) => w.inf).filter((inf) => alles || !cache.ww[inf]);
console.log(`Ophalen uit de Woordenlijst: ${teDoen.length} werkwoorden`);
let klaar = 0;
const rij = [...teDoen];
async function werker() {
  while (rij.length) {
    const inf = rij.shift();
    cache.ww[inf] = await haal(inf);
    if (++klaar % 25 === 0) console.log(`  ${klaar}/${teDoen.length}`);
  }
}
await Promise.all([werker(), werker(), werker()]);

const gesorteerd = Object.fromEntries(Object.entries(cache.ww).sort(([a], [b]) => a.localeCompare(b, 'nl')));
writeFileSync(UIT, JSON.stringify({ ...cache, ww: gesorteerd }, null, 1) + '\n');
console.log(`Klaar. ${Object.keys(gesorteerd).length} werkwoorden in bronnen/woordenlijst.json`);
