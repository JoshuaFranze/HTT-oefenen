// Controle A: de regelmotor. Rekent alle werkwoordsvormen uit met de schoolregels
// ('t kofschip, ge-, -end, stam + t enzovoort). Sterke en gemengde werkwoorden krijgen
// hun afwijkende vormen uit data/lexicon.json (die zijn met de hand ingevoerd).
// Deze uitkomst wordt vergeleken met de Woordenlijst (B) en OpenTaal (C).

export const SLOTS = [
  'inf',
  'tt.ik', 'tt.jij.voor', 'tt.jij.na', 'tt.u', 'tt.hij', 'tt.mv',
  'vt.ev', 'vt.mv',
  'vd',
  'od.kaal', 'od.e',
  'gw',
  'bvd.e', 'bvd.kaal',
];

const KLINKER = /[aeiouy]/;
const KOFSCHIP = /(t|k|f|s|p|ch|x)$/;

/** Telt klinkergroepen (ruwe lettergreepschatting). */
const lettergrepen = (s) => (s.match(/[aeiouy]+/g) || []).length;

/** Stam zonder voorvoegsel- en scheidbaar-deel afhandeling. Geeft ook terug of de stam op v/z eindigde. */
export function stamInfo(e) {
  let basis = e.inf;
  if (e.sch) basis = basis.slice(e.sch.length);
  if (e.stam) {
    const s = e.sch && e.stam.startsWith(e.sch) ? e.stam.slice(e.sch.length) : e.stam;
    return { stam: s, vz: /[vz]en$/.test(basis) && !e.leen, basis };
  }
  if (!basis.endsWith('en')) return null;
  let r = basis.slice(0, -2);
  // dubbele medeklinker wordt enkel: zetten -> zet, bellen -> bel
  if (/([^aeiouy])\1$/.test(r)) r = r.slice(0, -1);
  else {
    // open lettergreep: lange klank wordt dubbel geschreven (lopen -> loop)
    const m = r.match(/(^|[^aeiouy])([aeou])([^aeiouyx])$/); // x telt als twee medeklinkers (fax)
    if (m) {
      const kern = e.vv && r.startsWith(e.vv) ? r.slice(e.vv.length) : r;
      const schwa = m[2] === 'e' && /[lrnm]$/.test(r) && lettergrepen(kern) > 1;
      if (!schwa) r = r.slice(0, -1) + m[2] + m[3];
    }
  }
  let vz = false;
  if (r.endsWith('v')) { r = r.slice(0, -1) + 'f'; vz = true; }
  else if (r.endsWith('z')) { r = r.slice(0, -1) + 's'; vz = true; }
  return { stam: r, vz, basis };
}

/** 't kofschip: geeft 't' of 'd'. */
export function kofschip(e, info) {
  if (e.klank) return e.klank;
  if (info.vz) return 'd';
  return KOFSCHIP.test(info.stam) ? 't' : 'd';
}

/** Voltooid deelwoord + e, met de gewone spellingregels (gered -> geredde, gehaat -> gehate). */
export function buigVd(vd) {
  if (/en$/.test(vd)) return vd; // gebroken, gelopen: geen -e erbij
  if (!/[td]$/.test(vd)) return null;
  if (/(^|[^aeiouy])[aeiou][td]$/.test(vd)) return vd + vd.slice(-1) + 'e'; // korte klank: medeklinker dubbel
  if (/(aa|ee|oo|uu)[td]$/.test(vd)) return vd.slice(0, -2) + vd.slice(-1) + 'e'; // lange klank: klinker enkel
  return vd + 'e';
}

function voegGeToe(stam) {
  // ge + klinker die anders samensmelt: trema (geüpdatet, geïnd, geëerd)
  if (/^[eiu]/.test(stam)) return 'ge' + { e: 'ë', i: 'ï', u: 'ü' }[stam[0]] + stam.slice(1);
  return 'ge' + stam;
}

/** Alle vormen volgens de regels. Waarde null = deze vorm maakt de motor niet (bewust niet gebruiken). */
export function vervoeg(e) {
  const info = stamInfo(e);
  const v = Object.fromEntries(SLOTS.map((s) => [s, null]));
  v.inf = e.inf;
  v['od.kaal'] = e.inf + 'd';
  v['od.e'] = e.inf + 'de';
  if (!info) return { vormen: v, stam: null, klank: null };
  const { stam } = info;
  const k = kofschip(e, info);

  // voltooid deelwoord
  let vd;
  if (e.vd) vd = e.vd;
  else {
    const eind = /[td]$/.test(stam) ? '' : k;
    const kern = e.vv ? stam + eind : voegGeToe(stam + eind);
    vd = (e.sch || '') + kern;
  }
  v.vd = vd;
  v['bvd.kaal'] = vd;
  // leenwoorden met een stam op -e (geüpdatet): de -e van de uitspraak blijft, gewoon + e
  v['bvd.e'] = e.leen && e.stam && /e$/.test(e.stam) ? vd + 'e' : buigVd(vd);

  if (e.sch) return { vormen: v, stam, klank: k }; // scheidbaar: alleen inf, deelwoorden

  const t = stam.endsWith('t') ? stam : stam + 't';
  v['tt.ik'] = stam;
  v['tt.jij.voor'] = t;
  v['tt.jij.na'] = stam;
  v['tt.u'] = t;
  v['tt.hij'] = t;
  v['tt.mv'] = e.inf;
  v.gw = stam;
  if (e.vt) {
    v['vt.ev'] = e.vt[0];
    v['vt.mv'] = e.vt[1];
  } else {
    v['vt.ev'] = stam + (k === 't' ? 'te' : 'de');
    v['vt.mv'] = v['vt.ev'] + 'n';
  }
  return { vormen: v, stam, klank: k };
}

export function soortWerkwoord(e) {
  if (e.vt && e.vd) return 'sterk';
  if (e.vt || e.vd) return 'gemengd';
  return 'zwak';
}
