// Opslag van de voortgang. Alles wordt na elke actie direct in de browser bewaard
// (localStorage) en daarna via een GitHub Gist gesynchroniseerd (zie sync.js).
// Het GitHub-token blijft altijd alleen op dit apparaat.
//
// Vragen worden op id opgeslagen (niet op volgorde), met de hash van de toets erbij.
// Zo kan een vraag via de blocklist worden vervangen zonder dat de rest van de voortgang beschadigt.

const KEY = 'htt.voortgang.v1';
const KEY_GEHEIM = 'htt.geheim.v1'; // token en gist-id: nooit gesynchroniseerd
const KEY_BACKUP = 'htt.voortgang.vorige.v1'; // vorige versie, als extra vangnet

export const STANDAARD_INSTELLINGEN = {
  lettergrootte: 'normaal', // normaal | groot | extra
  contrast: false,
  lettertype: 'standaard', // standaard | leesbaar
  feedback: 'direct', // direct | eind
  scoreTonen: true,
  aftellen: false,
  hintAltijd: false,
  bijgewerkt: 0,
};

export function legeVoortgang() {
  return { v: 1, updatedAt: 0, antwoorden: {}, toetsen: {}, trainer: { rondes: [], antwoorden: {} }, meldingen: {}, instellingen: { ...STANDAARD_INSTELLINGEN } };
}

let geheugen = null; // werkt ook als localStorage het niet doet (privévenster)
let opslagOk = true;

function leesRuw(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    opslagOk = false;
    return null;
  }
}
function schrijfRuw(key, waarde) {
  try {
    localStorage.setItem(key, waarde);
    return true;
  } catch {
    opslagOk = false;
    return false;
  }
}

/** Kan deze browser iets bewaren? (In een privévenster vaak niet.) */
export function opslagWerkt() {
  try {
    localStorage.setItem('htt.test', '1');
    localStorage.removeItem('htt.test');
    return opslagOk;
  } catch {
    return false;
  }
}

/** Zorgt dat een (oud of half) object altijd de juiste vorm heeft. */
export function normaliseer(p) {
  const l = legeVoortgang();
  if (!p || typeof p !== 'object') return l;
  return {
    ...l,
    ...p,
    antwoorden: p.antwoorden && typeof p.antwoorden === 'object' ? p.antwoorden : {},
    toetsen: p.toetsen && typeof p.toetsen === 'object' ? p.toetsen : {},
    trainer: { rondes: Array.isArray(p.trainer?.rondes) ? p.trainer.rondes : [], antwoorden: p.trainer?.antwoorden || {} },
    meldingen: p.meldingen && typeof p.meldingen === 'object' ? p.meldingen : {},
    instellingen: { ...STANDAARD_INSTELLINGEN, ...(p.instellingen || {}) },
  };
}

export function leesVoortgang() {
  if (geheugen) return structuredClone(geheugen);
  const s = leesRuw(KEY);
  let p = null;
  try {
    p = s ? JSON.parse(s) : null;
  } catch {
    // kapotte opslag: terugvallen op de vorige versie
    try {
      p = JSON.parse(leesRuw(KEY_BACKUP) || 'null');
    } catch {
      p = null;
    }
  }
  geheugen = normaliseer(p);
  return structuredClone(geheugen);
}

export function schrijfVoortgang(p, { stil = false } = {}) {
  const oud = leesRuw(KEY);
  if (oud) schrijfRuw(KEY_BACKUP, oud);
  geheugen = normaliseer(p);
  const gelukt = schrijfRuw(KEY, JSON.stringify(geheugen));
  if (!stil) window.dispatchEvent(new CustomEvent('htt:voortgang', { detail: { gelukt } }));
  return gelukt;
}

export function pasAan(fn) {
  const p = leesVoortgang();
  fn(p);
  p.updatedAt = Date.now();
  schrijfVoortgang(p);
  return p;
}

export const antwoordKey = (toets, qid) => `${toets}|${qid}`;

/** Hoeveelste keer wordt deze toets gemaakt? Antwoorden van eerdere keren tellen niet mee in de huidige ronde. */
export const poging = (p, toets) => p.toetsen[toets]?.poging || 1;

/** Slaat één antwoord op (direct na het klikken). */
export function bewaarAntwoord(toets, hash, vraag, keuze, { hint = 0, modus = 'oefen', positie } = {}) {
  return pasAan((p) => {
    const nu = Date.now();
    const t = (p.toetsen[toets] ||= { gestart: nu, resultaten: [], poging: 1 });
    p.antwoorden[antwoordKey(toets, vraag.id)] = { k: keuze, goed: keuze === vraag.antwoord, hint, t: nu, h: hash, c: vraag.categorie, i: !!vraag.instinker, m: modus, p: t.poging || 1 };
    t.hash = hash;
    t.bijgewerkt = nu;
    if (positie !== undefined) t.positie = positie;
  });
}

/** Het antwoord op een vraag in de huidige ronde van deze toets (of null). */
export function huidigAntwoord(p, toets, qid) {
  const a = p.antwoorden[antwoordKey(toets, qid)];
  return a && (a.p || 1) === poging(p, toets) ? a : null;
}

export function bewaarToetsInfo(toets, extra) {
  return pasAan((p) => {
    const t = (p.toetsen[toets] ||= { gestart: Date.now(), resultaten: [], poging: 1 });
    Object.assign(t, extra, { bijgewerkt: Date.now() });
  });
}

export function rondToetsAf(toets, resultaat) {
  return pasAan((p) => {
    const t = (p.toetsen[toets] ||= { gestart: Date.now(), resultaten: [], poging: 1 });
    t.afgerond = resultaat.t;
    t.bijgewerkt = resultaat.t;
    t.resultaten = [...(t.resultaten || []).filter((r) => r.t !== resultaat.t), resultaat];
  });
}

/** Toets opnieuw maken. Het resultaat van de vorige keer blijft bewaard. */
export function begintOpnieuw(toets) {
  return pasAan((p) => {
    const t = (p.toetsen[toets] ||= { gestart: Date.now(), resultaten: [], poging: 1 });
    t.poging = (t.poging || 1) + 1;
    t.positie = 0;
    t.afgerond = null;
    t.bijgewerkt = Date.now();
  });
}

export function bewaarTrainerAntwoord(vraag, keuze, hint) {
  return pasAan((p) => {
    p.trainer.antwoorden[vraag.id] = { k: keuze, goed: keuze === vraag.antwoord, hint, t: Date.now(), c: vraag.categorie, i: !!vraag.instinker };
  });
}
export function bewaarTrainerRonde(r) {
  return pasAan((p) => {
    p.trainer.rondes.push(r);
  });
}

export function bewaarMelding(m) {
  return pasAan((p) => {
    p.meldingen[m.id] = m;
  });
}

export function leesInstellingen() {
  return { ...STANDAARD_INSTELLINGEN, ...leesVoortgang().instellingen };
}
export function schrijfInstellingen(nieuw) {
  return pasAan((p) => {
    p.instellingen = { ...p.instellingen, ...nieuw, bijgewerkt: Date.now() };
  });
}

export function leesGeheim() {
  try {
    return { token: '', gistId: '', ...JSON.parse(leesRuw(KEY_GEHEIM) || '{}') };
  } catch {
    return { token: '', gistId: '' };
  }
}
export function schrijfGeheim(g) {
  schrijfRuw(KEY_GEHEIM, JSON.stringify({ ...leesGeheim(), ...g }));
}

const later = (a, b) => ((a?.t || 0) >= (b?.t || 0) ? a : b);

/**
 * Samenvoegen van twee apparaten. Er gaat nooit iets verloren:
 * per vraag telt het recentste antwoord, toetsresultaten en trainerrondes worden bij elkaar gevoegd,
 * meldingen blijven allemaal staan, en van de instellingen wint de nieuwste.
 */
export function samenvoegen(a, b) {
  a = normaliseer(a);
  b = normaliseer(b);
  const uit = legeVoortgang();
  for (const k of new Set([...Object.keys(a.antwoorden), ...Object.keys(b.antwoorden)])) uit.antwoorden[k] = later(a.antwoorden[k], b.antwoorden[k]);
  for (const k of new Set([...Object.keys(a.toetsen), ...Object.keys(b.toetsen)])) {
    const x = a.toetsen[k];
    const y = b.toetsen[k];
    if (!x || !y) {
      uit.toetsen[k] = structuredClone(x || y);
      continue;
    }
    const nieuwste = (x.bijgewerkt || 0) >= (y.bijgewerkt || 0) ? x : y;
    const res = new Map();
    for (const r of [...(x.resultaten || []), ...(y.resultaten || [])]) res.set(r.t, r);
    uit.toetsen[k] = {
      ...nieuwste,
      gestart: Math.min(x.gestart || Infinity, y.gestart || Infinity),
      poging: Math.max(x.poging || 1, y.poging || 1),
      resultaten: [...res.values()].sort((p, q) => p.t - q.t),
    };
    // was de nieuwste een oudere poging? dan staat de positie op 0 van de hoogste poging
    if ((nieuwste.poging || 1) < uit.toetsen[k].poging) uit.toetsen[k].positie = 0;
  }
  const rondes = new Map();
  for (const r of [...a.trainer.rondes, ...b.trainer.rondes]) rondes.set(r.t, r);
  uit.trainer.rondes = [...rondes.values()].sort((p, q) => p.t - q.t);
  for (const k of new Set([...Object.keys(a.trainer.antwoorden), ...Object.keys(b.trainer.antwoorden)])) uit.trainer.antwoorden[k] = later(a.trainer.antwoorden[k], b.trainer.antwoorden[k]);
  uit.meldingen = { ...a.meldingen, ...b.meldingen };
  uit.instellingen = (a.instellingen.bijgewerkt || 0) >= (b.instellingen.bijgewerkt || 0) ? a.instellingen : b.instellingen;
  uit.updatedAt = Math.max(a.updatedAt || 0, b.updatedAt || 0);
  return uit;
}

/** Back-up als bestand (zonder token). */
export function exporteer() {
  return JSON.stringify({ app: 'htt-werkwoordspelling', gemaakt: new Date().toISOString(), voortgang: leesVoortgang() }, null, 1);
}
/** Import voegt samen met wat er al is, en overschrijft dus nooit iets. */
export function importeer(tekst) {
  const d = JSON.parse(tekst);
  const p = d.voortgang || d;
  if (!p || typeof p !== 'object' || !('antwoorden' in p)) throw new Error('Dit lijkt geen voortgangsbestand van deze site.');
  const samen = samenvoegen(leesVoortgang(), p);
  samen.updatedAt = Date.now();
  schrijfVoortgang(samen);
  return samen;
}

export function wisAlles() {
  const p = legeVoortgang();
  p.updatedAt = Date.now();
  schrijfVoortgang(p);
}

/** Alleen voor tests. */
export function _reset() {
  geheugen = null;
}
