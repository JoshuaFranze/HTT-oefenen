// Inlezen van de twee externe bronnen:
//  B = Woordenlijst Nederlandse Taal (vaste kopie in bronnen/woordenlijst.json)
//  C = OpenTaal-woordenlijst 2.20.23 (bronnen/opentaal-wordlist-2.20.23.txt.gz)

import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const pad = (p) => new URL('../../' + p, import.meta.url);

let _wnt, _ot;

export function woordenlijst() {
  if (!_wnt) _wnt = JSON.parse(readFileSync(pad('bronnen/woordenlijst.json'), 'utf8'));
  return _wnt;
}

export function opentaal() {
  if (!_ot) _ot = new Set(gunzipSync(readFileSync(pad('bronnen/opentaal-wordlist-2.20.23.txt.gz'))).toString('utf8').split('\n'));
  return _ot;
}

/** Vertaalt een paradigma-regel van de Woordenlijst naar onze slotnaam. */
export function slotVan(p) {
  const pos = p.pos;
  const has = (s) => pos.includes(s);
  if (has('finiteness=inf')) return 'inf';
  if (has('mood=imp')) return 'gw';
  if (has('mood=conj')) return 'aanv';
  if (has('finiteness=part') && has('tense=pres')) return has('infl=e') ? 'od.e' : 'od.kaal';
  if (has('finiteness=part') && has('tense=past')) return 'vd';
  if (has('tense=pres')) {
    if (has('NA=pl')) return 'tt.mv';
    if (has('usage=u')) return 'tt.u';
    if (has('PA=1')) return 'tt.ik';
    if (has('PA=2') && has('position=bs')) return 'tt.jij.na';
    if (has('PA=2')) return 'tt.jij.voor';
    if (has('PA=3')) return 'tt.hij';
  }
  if (has('tense=past')) return has('NA=pl') ? 'vt.mv' : 'vt.ev';
  return '?';
}

/**
 * Per slot alle vormen volgens de Woordenlijst, over alle lemma's met precies dit
 * hele werkwoord samen (bijvoorbeeld wassen = schoonmaken én wassen = groeien).
 * Geeft { slot: { gewoon: Set, archaisch: Set } } en de lemma-informatie.
 */
export function wntVormen(inf) {
  const d = woordenlijst().ww[inf];
  if (!d) return null;
  const lemmas = d.lemmas.filter((l) => l.lemma === inf);
  const slots = {};
  for (const l of lemmas) {
    for (const p of l.paradigma) {
      const s = slotVan(p);
      slots[s] ||= { gewoon: new Set(), archaisch: new Set() };
      (p.archaisch ? slots[s].archaisch : slots[s].gewoon).add(p.vorm);
    }
  }
  return { lemmas, slots, alleVormen: new Set(lemmas.flatMap((l) => l.paradigma.map((p) => p.vorm))) };
}
