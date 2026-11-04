// Uitleg, stappenplan, hints en "onthoud" per vraag, opgebouwd uit vaste sjablonen.
// Alles wordt vooraf gemaakt en daarna automatisch gecontroleerd (tools/verifieer.mjs).
// Toon: korte zinnen (B1), rustig, geen "fout" of "verkeerd". Term: 't kofschip.
//
// Na reviewronde 1 aangepast: hints per regel (niet per onderdeel), v/z-regel als "-ven/-zen",
// voorvoegsel "zonder klemtoon", geen absolute "altijd/nooit", juiste lettergrepen,
// "klinkt hetzelfde" alleen bij echte klankgelijke paren, stam op t/d apart uitgelegd.

export const CATEGORIE = {
  tt: 'Tegenwoordige tijd',
  vt: 'Verleden tijd',
  vd: 'Voltooid deelwoord',
  od: 'Onvoltooid deelwoord',
  inf: 'Infinitief',
  gw: 'Gebiedende wijs',
  eng: 'Engelse werkwoorden',
  bvd: 'Bijvoeglijk gebruikt voltooid deelwoord',
};

export function categorieVan(ww, slot) {
  if (ww.leen) return 'eng';
  return slot.split('.')[0];
}

const q = (s) => `‘${s}’`;
// Werkwoorden die je (bijna) nooit met ik gebruikt: stam laten zien met het/dat.
const ONPERSOONLIJK = new Set(['regenen', 'sneeuwen', 'gebeuren', 'lukken', 'kosten']);

/** Lettergrepen (eenvoudige regel, genoeg voor de hele werkwoorden in deze lijst): be-lo-ven, ver-hu-ren. */
export function lettergrepen(w) {
  const delen = w.match(/(ch|[^aeiouy])*?([aeiouy]+|$)/g).filter(Boolean);
  // delen = [beginmedeklinkers+klinker, ...]; medeklinkers tussen klinkers verdelen
  const uit = [];
  let rest = '';
  const tokens = w.match(/ch|[aeiouy]+|[^aeiouy]/g);
  let huidig = '';
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const isKlinker = /^[aeiouy]/.test(t);
    if (!isKlinker) { huidig += t; continue; }
    // medeklinkers in 'huidig' na de vorige klinker: bij 1 alles naar de nieuwe lettergreep, bij 2+ de eerste blijft achter
    if (uit.length) {
      const m = huidig.match(/ch|[^aeiouy]/g) || [];
      if (m.length >= 2) {
        uit[uit.length - 1] += m[0];
        huidig = m.slice(1).join('');
      }
    }
    uit.push(huidig + t);
    huidig = '';
  }
  if (huidig) uit[uit.length - 1] += huidig;
  void delen; void rest;
  return uit.join('-');
}

/** De letter of klank waar je bij 't kofschip naar kijkt. */
export function kofschipLetter(inf, ww) {
  const st = ww.stam;
  if (ww.leen) {
    if (/sh$/.test(st)) return { letter: 'sh', klank: 'sj', leenKlank: true, stemloos: true };
    if (/ch$/.test(st)) return { letter: 'ch', klank: 'tsj', leenKlank: true, stemloos: true };
    if (/e$/.test(st)) {
      const l = st.at(-2) === 'c' ? 's' : st.at(-2);
      return { letter: l, klank: l, leenKlank: true, eStam: true };
    }
  }
  const basis = inf.slice((ww.sch || '').length);
  if (/[vz]en$/.test(basis) && /[fs]$/.test(st)) {
    const l = st.endsWith('f') ? 'v' : 'z';
    return { letter: l, vz: true, basis: basis.slice(0, -2), uitgang: basis.slice(-3) };
  }
  if (/ch$/.test(st)) return { letter: 'ch' };
  if (/x$/.test(st)) return { letter: 'x', x: true };
  return { letter: st.at(-1) };
}

const inKofschip = (ww) => ww.klank === 't';

/** Het voltooid deelwoord zoals het bij een zwak werkwoord zou zijn. */
export function zwakVd(ww) {
  const st = ww.stam;
  const eind = /[td]$/.test(st) ? '' : ww.klank;
  let kern = st + eind;
  if (!ww.vv) kern = /^[eiu]/.test(kern) ? 'ge' + { e: 'ë', i: 'ï', u: 'ü' }[kern[0]] + kern.slice(1) : 'ge' + kern;
  return (ww.sch || '') + kern;
}

/** Waarom -te/-de of -t/-d: de redenering met 't kofschip (of de v/z, of de klank). */
function kofschipZin(inf, ww, uitgang, mv = false) {
  const k = kofschipLetter(inf, ww);
  const wel = inKofschip(ww);
  uitgang ??= (wel ? '-te' : '-de') + (mv ? 'n' : '');
  if (k.vz) return `${inf} is een zwak werkwoord dat eindigt op -${k.uitgang}. Haal -en eraf: ${k.basis}. Dan kijk je naar de ${k.letter}. Die zit niet in 't kofschip, dus ${uitgang}.`;
  if (k.leenKlank && k.stemloos) return `${inf} is een Engels werkwoord. In ${lettergrepen(inf)} hoor je aan het eind van de stam een ${k.klank}. Die klank is stemloos (je keel trilt niet als je hem zegt), net als de klanken van 't kofschip. Dus ${uitgang}.`;
  if (k.leenKlank) return `${inf} is een Engels werkwoord. De stam is het Engelse woord: ${ww.stam}. Luister naar de laatste medeklinker in het hele werkwoord (${lettergrepen(inf)}): een ${k.klank}. De ${k.klank} ${wel ? 'is stemloos, net als de klanken van' : 'zit niet in'} 't kofschip, dus ${uitgang}.`;
  const voor = ww.leen ? `${inf} is een Engels werkwoord, maar hier zijn letter en klank hetzelfde. ` : '';
  if (k.x) return `${voor}De stam eindigt op x. Die klinkt als ks, en de s zit in 't kofschip. Dus ${uitgang}.`;
  if (k.letter === 'ch') return `${voor}De stam eindigt op ch. Die zit in 't kofschip, dus ${uitgang}.`;
  return `${voor}De laatste letter van de stam is een ${k.letter}. Die zit ${wel ? '' : 'niet '}in 't kofschip, dus ${uitgang}.`;
}

const isStamTd = (ww) => /[td]$/.test(ww.stam);

/** Bepaalt de regel van deze vraag. */
export function regelVan(inf, ww, zin) {
  const s = zin.slot;
  const st = ww.stam;
  const sterk = ww.soort === 'sterk' || (ww.soort === 'gemengd' && !/(te|de)n?$/.test(ww.vormen['vt.ev'] || ''));
  if (s === 'tt.ik') return 'tt-ik';
  if (s === 'tt.mv') return 'tt-mv';
  if (s === 'tt.jij.na') return st.endsWith('d') ? 'tt-inversie-d' : 'tt-inversie';
  if (s.startsWith('tt.')) {
    if (zin.jeBezit) return 'tt-je-bezit';
    if (s === 'tt.u' && zin.inversie) return 'tt-u-inversie';
    if (st.endsWith('t')) return 'tt-stam-t';
    if (st.endsWith('d')) return 'tt-dt';
    return 'tt-t';
  }
  if (s.startsWith('vt.')) {
    const jij = /^(jij|je)$/i.test(zin.sleutel || '');
    if (sterk) return /(cht|ist)$/.test(ww.vormen['vt.ev']) ? 'vt-onregelmatig' : jij ? 'vt-sterk-jij' : 'vt-sterk';
    const k = kofschipLetter(inf, ww);
    if (st.endsWith('t')) return 'vt-stam-t';
    if (st.endsWith('d')) return 'vt-stam-d';
    if (k.leenKlank) return 'vt-leen-klank';
    if (k.vz) return 'vt-vz';
    return inKofschip(ww) ? 'vt-te' : 'vt-de';
  }
  if (s === 'vd') {
    if (ww.sch) return ww.vv ? 'vd-scheidbaar-geen-ge' : 'vd-scheidbaar';
    if (ww.soort === 'gemengd' && /en$/.test(ww.vormen.vd)) return 'vd-gemengd';
    if (/en$/.test(ww.vormen.vd)) return ww.vv ? 'vd-sterk-geen-ge' : 'vd-sterk';
    if (ww.vormen.vd !== zwakVd(ww)) return 'vd-onregelmatig';
    if (ww.vv) return 'vd-geen-ge';
    const k = kofschipLetter(inf, ww);
    if (isStamTd(ww)) return 'vd-stam-td';
    if (k.leenKlank) return 'vd-leen-klank';
    if (k.vz) return 'vd-vz';
    return inKofschip(ww) ? 'vd-t' : 'vd-d';
  }
  if (s === 'od.e') return 'od-e';
  if (s === 'od.kaal') return zin.eenHet ? 'od-een-het' : 'od-kaal';
  if (s === 'inf') return 'inf';
  if (s === 'gw') return st.endsWith('d') ? 'gw-d' : 'gw';
  if (s === 'bvd.kaal') return 'bvd-een-het';
  if (s === 'bvd.e') {
    if (/en$/.test(ww.vormen.vd)) return 'bvd-sterk';
    if (ww.vormen['bvd.e'] !== ww.vormen.vd + 'e') return 'bvd-spelling';
    if (/t$/.test(ww.vormen.vd) && /t$/.test(st)) return 'bvd-stam-t';
    return 'bvd-e';
  }
  throw new Error(`geen regel voor ${inf} ${s}`);
}

const VALKUIL_REGELS = new Set([
  'tt-dt', 'tt-stam-t', 'tt-inversie', 'tt-inversie-d', 'tt-u-inversie', 'tt-je-bezit',
  'vt-vz', 'vt-stam-t', 'vt-stam-d', 'vt-sterk-jij', 'vt-leen-klank', 'vt-onregelmatig',
  'vd-vz', 'vd-stam-td', 'vd-geen-ge', 'vd-sterk-geen-ge', 'vd-scheidbaar', 'vd-scheidbaar-geen-ge', 'vd-gemengd', 'vd-onregelmatig', 'vd-leen-klank',
  'od-een-het', 'gw-d', 'bvd-stam-t', 'bvd-een-het', 'bvd-spelling', 'bvd-sterk',
]);
const VALKUIL_PATRONEN = new Set(['tt-vd-gelijk', 'vd-tt-gelijk', 'vt-tt-gelijk', 'inf-vt-gelijk', 'tt-vt-gelijk', 'bvd-vt-gelijk']);

export function isInstinker(regel, afleiders) {
  return VALKUIL_REGELS.has(regel) || afleiders.some((a) => VALKUIL_PATRONEN.has(a.patroon));
}

// ---------- uitleg ----------

function vormZin(zin, ww) {
  const s = zin.slot;
  const ond = zin.sleutel ? ` Het onderwerp is ${q(zin.sleutel)}.` : '';
  if (s.startsWith('tt.')) {
    if (zin.jeBezit) return `Dit is de persoonsvorm in de tegenwoordige tijd. ${q('Je')} betekent hier ${q('jouw')}: het onderwerp is ${q(zin.sleutel)}.`;
    if (s === 'tt.jij.na') return `Dit is de persoonsvorm in de tegenwoordige tijd. Het onderwerp ${q(zin.sleutel)} staat achter het werkwoord.`;
    if (s === 'tt.u' && zin.inversie) return `Dit is de persoonsvorm in de tegenwoordige tijd. Het onderwerp ${q('u')} staat achter het werkwoord.`;
    return `Dit is de persoonsvorm in de tegenwoordige tijd.${ond}`;
  }
  if (s.startsWith('vt.')) return `Dit is de persoonsvorm in de verleden tijd${zin.tijd ? ` (dat zie je aan ${q(zin.tijd)})` : ''}.${ond}`;
  if (s === 'vd') return `Er staat al een hulpwerkwoord in de zin (${q(zin.sleutel)}), en het werkwoord staat achteraan. Dus dit is een voltooid deelwoord.`;
  if (s === 'od.e') return `Dit is een onvoltooid deelwoord (hele werkwoord + d). Het hoort bij het zelfstandig naamwoord ${q(zin.sleutel)}.`;
  if (s === 'od.kaal') return zin.eenHet ? `Dit is een onvoltooid deelwoord (hele werkwoord + d). Het hoort bij ${q('een ' + zin.sleutel)}.` : `Dit is een onvoltooid deelwoord (hele werkwoord + d). Het staat los in de zin en zegt hoe iemand iets doet.`;
  if (s === 'inf') return `Na ${q(zin.sleutel)} komt het hele werkwoord (de infinitief).`;
  if (s === 'gw') return `Dit is een opdracht of een verzoek. Dat heet de gebiedende wijs.`;
  if (s.startsWith('bvd')) return `Het voltooid deelwoord hoort hier bij het zelfstandig naamwoord ${q(zin.sleutel)}. Je gebruikt het als bijvoeglijk naamwoord.`;
  return '';
}

function stamZin(inf, ww) {
  if (ONPERSOONLIJK.has(inf)) return `De stam: ${ww.stam} (het hele werkwoord min -en, en dan de spelling aanpassen).`;
  if (ww.leen && /e$/.test(ww.stam)) return `De stam: ik ${ww.stam} (het Engelse woord, met de e).`;
  return `De stam: ik ${ww.stam}${ww.sch ? ` ${ww.sch}` : ''}.`;
}

/** Bij 'je' als wederkerend voornaamwoord direct na de open plek (Jij meldt je): even zeggen dat dat geen onderwerp is. */
function reflexief(zin) {
  const na = zin.zin.split('___')[1] || '';
  return zin.slot === 'tt.jij.voor' && /^\s*je\b/i.test(na) ? ` Het ${q('je')} achter het werkwoord is hier geen onderwerp, dus dat verandert niets.` : '';
}

/** Waarom het voltooid deelwoord (bij bvd) zo is: voorvoegsel, scheidbaar, -ven/-zen of onregelmatig. */
function vdReden(inf, ww) {
  if (/en$/.test(ww.vormen.vd)) return '';
  if (ww.vormen.vd !== zwakVd(ww)) return `${inf} is onregelmatig; het voltooid deelwoord leer je los. `;
  const k = kofschipLetter(inf, ww);
  const delen = [];
  if (ww.sch && ww.vv) delen.push(`${inf} is scheidbaar en het tweede deel heeft het voorvoegsel ${ww.vv}-, dus geen ge-`);
  else if (ww.sch) delen.push(`${inf} is scheidbaar, dus de ge- komt in het midden`);
  else if (ww.vv) delen.push(`${inf} heeft het voorvoegsel ${ww.vv}- (zonder klemtoon), dus geen ge-`);
  if (k.vz) delen.push(`${inf} eindigt op -${k.uitgang}, dus een d`);
  return delen.length ? delen.join(', en ').replace(/^./, (x) => x.toUpperCase()) + '. ' : '';
}

function regelZin(regel, inf, ww, zin, c) {
  const st = ww.stam;
  const V = ww.vormen;
  const mv = zin.slot === 'vt.mv';
  switch (regel) {
    case 'tt-ik': return `Bij ik schrijf je alleen de stam. Er komt geen t bij: ${c}.`;
    case 'tt-t': return `Het onderwerp is ${zin.slot === 'tt.u' ? 'u' : zin.slot === 'tt.jij.voor' ? `${q(zin.sleutel)}, en dat staat voor het werkwoord` : 'enkelvoud (net als hij, zij of het)'}. Dan komt er een t achter de stam: ${st} + t = ${c}.${reflexief(zin)}`;
    case 'tt-dt': return `De stam is ${st}, met een d. Het onderwerp is ${zin.slot === 'tt.u' ? 'u' : zin.slot === 'tt.jij.voor' ? `${q(zin.sleutel)}, en dat staat voor het werkwoord` : 'enkelvoud (net als hij, zij of het)'}. Dan komt er toch een t achter: ${st} + t = ${c}.${reflexief(zin)}`;
    case 'tt-stam-t': return `De stam ${st} eindigt al op een t. Er komt geen tweede t bij: ${c}.`;
    case 'tt-inversie': return `Het onderwerp ${q(zin.sleutel)} staat achter het werkwoord. Dan komt er geen t bij: alleen de stam, ${c}.`;
    case 'tt-inversie-d': return `Het onderwerp ${q(zin.sleutel)} staat achter het werkwoord. Dan komt er geen t bij: alleen de stam. De stam eindigt op een d, en die blijft gewoon staan: ${c}.`;
    case 'tt-u-inversie': return `Het onderwerp is u. Bij u komt er een t achter de stam, ook als u achter het werkwoord staat: ${c}.`;
    case 'tt-je-bezit': return `Je betekent hier jouw. Het onderwerp is ${q(zin.sleutel)}: dat is enkelvoud, net als hij. Dus stam + t: ${c}.`;
    case 'tt-mv': return `Het onderwerp is meervoud. Dan gebruik je het hele werkwoord: ${c}.`;
    case 'vt-te': case 'vt-de': case 'vt-vz': case 'vt-leen-klank':
      return `${kofschipZin(inf, ww, undefined, mv)} ${mv ? 'Het onderwerp is meervoud, dus -ten of -den' : 'Zo krijg je'}: ${c}.`;
    case 'vt-stam-t': return `${inf} is een zwak werkwoord en de stam ${st} eindigt op een t. Die zit in 't kofschip, dus -te${mv ? 'n' : ''}: ${st} + te${mv ? 'n' : ''} = ${c}. Daarom staan er twee t's.`;
    case 'vt-stam-d': return `${inf} is een zwak werkwoord en de stam ${st} eindigt op een d. Die zit niet in 't kofschip, dus -de${mv ? 'n' : ''}: ${st} + de${mv ? 'n' : ''} = ${c}. Daarom staan er twee d's.`;
    case 'vt-sterk': return `${inf} is een sterk werkwoord: in de verleden tijd verandert de klinker, en er komt geen -te of -de achter. ${mv ? `In het meervoud is het ${c}.` : `Dus: ${c}.`}`;
    case 'vt-sterk-jij': return `${inf} is een sterk werkwoord. In de verleden tijd krijgt jij geen extra t: ${c}.`;
    case 'vt-onregelmatig': return `${inf} is een onregelmatig werkwoord. De verleden tijd${mv ? ' in het meervoud' : ''} is ${c}. Deze vorm leer je los, want hij volgt geen regel.`;
    case 'vd-t': case 'vd-d': case 'vd-vz': case 'vd-leen-klank':
      return `${kofschipZin(inf, ww, ww.klank === 't' ? 'een t' : 'een d')} Het wordt ge + ${st} + ${ww.klank}: ${c}.`;
    case 'vd-stam-td': return `${inf} is een zwak werkwoord en de stam ${st} eindigt al op een ${st.at(-1)}. Die blijft staan, en er komt niets meer achter: ge + ${st} = ${c}.`;
    case 'vd-geen-ge': {
      const k = kofschipLetter(inf, ww);
      const rest = isStamTd(ww) ? `De stam ${st} eindigt al op een ${st.at(-1)}, dus er komt niets meer achter` : k.vz ? `Het hele werkwoord eindigt op -${k.uitgang}: de ${k.letter} zit niet in 't kofschip, dus een d` : `De laatste letter van de stam (${k.letter === 'ch' ? 'ch' : st.at(-1)}) zit ${inKofschip(ww) ? '' : 'niet '}in 't kofschip, dus een ${ww.klank}`;
      return `${inf} heeft het voorvoegsel ${ww.vv}- (zonder klemtoon). Dan komt er geen ge- voor. ${rest}: ${c}.`;
    }
    case 'vd-sterk-geen-ge': return `${inf} heeft het voorvoegsel ${ww.vv}- (zonder klemtoon), dus er komt geen ge- voor. Het is een sterk werkwoord, dus het eindigt op -en: ${c}.`;
    case 'vd-scheidbaar-geen-ge': { const tw = inf.slice(ww.sch.length); return `${inf} is een scheidbaar werkwoord (${ww.sch} + ${tw}). Normaal komt de ge- in het midden, maar ${tw} heeft al het voorvoegsel ${ww.vv}-. Dan komt er geen ge- bij: ${c}.`; }
    case 'vd-scheidbaar': return `${inf} is een scheidbaar werkwoord (ik ${st} ${ww.sch}). De ge- komt in het midden: ${c}.`;
    case 'vd-sterk': return `${inf} is een sterk werkwoord. Het voltooid deelwoord eindigt op -en: ${c}.`;
    case 'vd-gemengd': return `${inf} heeft in de verleden tijd -te of -de (${V['vt.ev']}), maar het voltooid deelwoord eindigt op -en: ${c}.`;
    case 'vd-onregelmatig': return `${inf} is een onregelmatig werkwoord. Het voltooid deelwoord is ${c}. Deze vorm leer je los, want hij volgt geen regel.`;
    case 'od-e': return `Het hoort bij het zelfstandig naamwoord ${q(zin.sleutel)}. Daarom komt er een -e achter: ${c}.`;
    case 'od-kaal': return `Het onvoltooid deelwoord is het hele werkwoord + d: ${inf} + d = ${c}.`;
    case 'od-een-het': return `Het hoort bij een het-woord met ${q('een')} ervoor (${q('een ' + zin.sleutel)}). Dan komt er geen -e achter: ${c}.`;
    case 'inf': return `Het hele werkwoord schrijf je zoals in het woordenboek: ${c}.`;
    case 'gw': return `De gebiedende wijs is de stam: ${c}.`;
    case 'gw-d': return `De gebiedende wijs is de stam. Er komt geen t bij. De stam is ${st}, met een d: ${c}.`;
    case 'bvd-e': return `${vdReden(inf, ww)}Het voltooid deelwoord is ${V.vd}. Bij een zelfstandig naamwoord komt er een -e achter: ${c}.`;
    case 'bvd-stam-t': return `${vdReden(inf, ww)}Het voltooid deelwoord is ${V.vd}. Daar zet je alleen een -e achter, er komt geen extra t bij: ${c}.`;
    case 'bvd-spelling': return `${vdReden(inf, ww)}Het voltooid deelwoord is ${V.vd}. Er komt een -e achter, en dan pas je de spelling aan (${lettergrepen(c)}): ${c}.`;
    case 'bvd-sterk': return `Het voltooid deelwoord ${c} eindigt al op -en. Daar komt geen -e meer achter.`;
    case 'bvd-een-het': return `Het hoort bij een het-woord met ${q('een')} ervoor (${q('een ' + zin.sleutel)}). Dan komt er geen -e achter: ${c}.`;
  }
  throw new Error('onbekende regel ' + regel);
}

const ONTHOUD = {
  'tt-ik': 'Ik + stam. Er komt geen t bij.',
  'tt-t': 'Onderwerp jij of je (voor het werkwoord), u, of een ander enkelvoud: stam + t.',
  'tt-dt': 'Onderwerp jij (voor het werkwoord), u, of een ander enkelvoud: stam + t. Eindigt de stam op d? Dan krijg je dt.',
  'tt-stam-t': 'Eindigt de stam al op t? Dan komt er geen tweede t bij.',
  'tt-inversie': 'Staat het onderwerp jij of je achter het werkwoord? Dan komt er geen t bij.',
  'tt-inversie-d': 'Staat het onderwerp jij of je achter het werkwoord? Dan komt er geen t bij, ook niet bij een stam op d.',
  'tt-u-inversie': 'Is u het onderwerp? Dan stam + t, ook als u achteraan staat.',
  'tt-je-bezit': 'Betekent je ‘jouw’? Kijk dan naar het woord erna: je fiets is enkelvoud, dus stam + t.',
  'tt-mv': 'Meervoud in de tegenwoordige tijd: het hele werkwoord.',
  'vt-te': "Stam + te als de laatste letter in 't kofschip zit.",
  'vt-de': "Stam + de als de laatste letter niet in 't kofschip zit.",
  'vt-vz': 'Zwak werkwoord op -ven of -zen? Dan -de.',
  'vt-leen-klank': 'Bij Engelse werkwoorden kijk je naar de laatste klank die je hoort.',
  'vt-stam-t': 'Zwak werkwoord met een stam op t: + te geeft tt. Dat hoort zo.',
  'vt-stam-d': 'Zwak werkwoord met een stam op d: + de geeft dd. Dat hoort zo.',
  'vt-sterk': 'Sterk werkwoord in de verleden tijd: de klinker verandert, geen -te of -de.',
  'vt-sterk-jij': 'Sterk werkwoord in de verleden tijd: jij krijgt geen extra t.',
  'vt-onregelmatig': 'Een paar werkwoorden leer je los, zoals kocht, dacht en bracht.',
  'vd-t': "Ge + stam + t als de laatste letter in 't kofschip zit.",
  'vd-d': "Ge + stam + d als de laatste letter niet in 't kofschip zit.",
  'vd-vz': 'Zwak werkwoord op -ven of -zen? Dan eindigt het voltooid deelwoord op een d.',
  'vd-leen-klank': 'Bij Engelse werkwoorden kijk je naar de laatste klank die je hoort.',
  'vd-stam-td': 'Zwak werkwoord met een stam op t of d? Dan komt er niets meer achter.',
  'vd-geen-ge': 'Voorvoegsel be-, ge-, her-, er-, ont- of ver- zonder klemtoon? Dan geen ge-.',
  'vd-sterk-geen-ge': 'Voorvoegsel be-, ge-, her-, er-, ont- of ver- zonder klemtoon? Dan geen ge-.',
  'vd-scheidbaar': 'Scheidbaar werkwoord: de ge- komt in het midden.',
  'vd-scheidbaar-geen-ge': 'Scheidbaar werkwoord met be-, ge-, her-, er-, ont- of ver- in het tweede deel: geen ge- erbij.',
  'vd-sterk': 'Sterk werkwoord: het voltooid deelwoord eindigt vaak op -en.',
  'vd-gemengd': 'Een paar werkwoorden hebben -te of -de in de verleden tijd, maar -en in het voltooid deelwoord.',
  'vd-onregelmatig': 'Een paar werkwoorden leer je los, zoals gekocht, gedacht en gebracht.',
  'od-e': 'Onvoltooid deelwoord bij een zelfstandig naamwoord: -ende.',
  'od-kaal': 'Onvoltooid deelwoord: het hele werkwoord + d.',
  'od-een-het': 'Een, geen of zo\'n + het-woord: geen -e erachter.',
  'inf': 'Na willen, moeten, kunnen, mogen, gaan, zullen of te komt het hele werkwoord.',
  'gw': 'Een opdracht schrijf je met alleen de stam.',
  'gw-d': 'Een opdracht schrijf je met alleen de stam, ook bij een stam op d.',
  'bvd-e': 'Voltooid deelwoord bij een zelfstandig naamwoord: + e.',
  'bvd-stam-t': 'Eerst het voltooid deelwoord maken, dan alleen een -e erachter.',
  'bvd-spelling': 'Eerst het voltooid deelwoord, dan de -e, dan de spelling netjes maken.',
  'bvd-sterk': 'Eindigt het voltooid deelwoord op -en? Dan geen -e erbij.',
  'bvd-een-het': 'Een, geen of zo\'n + het-woord: geen -e erachter.',
};

/** Twee vormen die precies hetzelfde klinken (verhuist/verhuisd, wachten/wachtten). */
function klinktGelijk(a, b) {
  const n = (w) => w.replace(/dt$|d$/, 't').replace(/tt(en)$/, 't$1').replace(/dd(en)$/, 'd$1').replace(/d(en)$/, 'd$1');
  return n(a) === n(b);
}

function afleiderZin(p, d, inf, ww, zin, c) {
  const st = ww.stam;
  const V = ww.vormen;
  const sl = zin.sleutel ? q(zin.sleutel) : 'het onderwerp';
  const k = kofschipLetter(inf, ww);
  switch (p) {
    case 'tt-vd-gelijk':
      if (d === st) return `${d} is de stam (en ook het voltooid deelwoord). Bij ${sl} komt er nog een t achter.`;
      return `${d} klinkt hetzelfde, maar dat is het voltooid deelwoord. Hier is het de persoonsvorm, en die schrijf je met stam + t.`;
    case 'tt-d-als-t': return `${d}: je hoort een t, maar de stam is ${st}, met een d. Die d blijft staan.`;
    case 'tt-dubbele-t': return `${d}: de stam ${st} eindigt al op een t. Er komt geen tweede t bij.`;
    case 'tt-t-vergeten': return zin.slot === 'tt.u' ? `${d} is de stam. Bij u komt er nog een t achter.` : `${d} is de stam. Bij ${sl} komt er nog een t achter.`;
    case 'tt-z-gehouden': return `${d}: de stam schrijf je met een s (${st}), niet met een z.`;
    case 'tt-v-gehouden': return `${d}: de stam schrijf je met een f (${st}), niet met een v.`;
    case 'tt-d-ipv-t': return `${d}: in de tegenwoordige tijd komt er een t achter de stam, geen d.`;
    case 'tt-ik-met-t': return `${d}: bij ik schrijf je alleen de stam. Er komt geen t bij.`;
    case 'tt-inversie-t': return `${d}: deze vorm lijkt logisch, maar staat het onderwerp jij of je achter het werkwoord, dan komt er geen t bij.`;
    case 'tt-d-achter-stam': return zin.slot === 'tt.ik' ? `${d}: bij ik schrijf je alleen de stam.` : `${d}: het onderwerp ${q(zin.sleutel)} staat achter het werkwoord, dus je schrijft alleen de stam.`;
    case 'tt-ev-ipv-mv': return `${d} is de vorm voor één persoon of ding. ${sl} is meervoud, dus je gebruikt het hele werkwoord.`;
    case 'tt-vt-gelijk': return `${d} is de verleden tijd. Let op ${q(zin.tijd)}: dit gebeurt nu.`;
    case 'tt-stam-ipv-mv': return `${d} is de stam. Bij meervoud gebruik je het hele werkwoord.`;
    case 'tt-mv-ipv-ev': return `${d} is het hele werkwoord. Dat gebruik je bij meervoud, maar ${zin.slot === 'tt.u' ? q('u') : sl} is hier enkelvoud.`;
    case 'mv-dubbele-klinker': {
      let t = `${d}: in ${c} hoor je een lange klank aan het eind van een lettergreep (${lettergrepen(c)}). Dan schrijf je één klinker.`;
      if (/[vz]en$/.test(c) && /[fs]en$/.test(d)) t += ` En het hele werkwoord schrijf je met een ${c.at(-3)}.`;
      return t;
    }
    case 'vt-kofschip-omgedraaid': return `${d}: kijk nog eens naar 't kofschip. ${kofschipZin(inf, ww, undefined, zin.slot === 'vt.mv')}`;
    case 'vt-een-t-of-d-te-weinig': { const l = st.at(-1); return `${d}: hier mist een ${l}. De stam ${st} eindigt al op een ${l}, en daar komt -${l === 't' ? 'te' : 'de'} achter.`; }
    case 'vt-z-gehouden': return `${d}: de stam schrijf je met een s (${st}). De z in ${inf} vertelt je alleen dat het -de wordt.`;
    case 'vt-v-gehouden': return `${d}: de stam schrijf je met een f (${st}). De v in ${inf} vertelt je alleen dat het -de wordt.`;
    case 'vt-sterk-jij-t': return `${d}: deze vorm lijkt logisch, maar in de verleden tijd van een sterk werkwoord krijgt jij geen extra t.`;
    case 'vt-sterk-t': return `${d}: in de verleden tijd van een sterk werkwoord komt er geen extra t bij.`;
    case 'vt-zwak-gemaakt': return `${d}: zo zou het gaan bij een zwak werkwoord. ${inf} verandert in de verleden tijd van klank: ${c}.`;
    case 'vt-mv-ipv-ev': return `${d} is de vorm voor meervoud. ${sl} is enkelvoud.`;
    case 'vt-ev-ipv-mv': return /(te|de)$/.test(d) ? `${d} is de vorm voor één persoon of ding. ${sl} is meervoud, dus er komt nog een -n achter.` : `${d} is de vorm voor één persoon of ding. ${sl} is meervoud: dan is het ${c}.`;
    case 'vt-tt-gelijk':
    case 'vt-tt':
      return klinktGelijk(d, c) ? `${d} klinkt hetzelfde, maar dat is de tegenwoordige tijd. Let op ${q(zin.tijd)}: het gebeurde in het verleden.` : `${d} is de tegenwoordige tijd. Let op ${q(zin.tijd)}: het gebeurde in het verleden.`;
    case 'vd-tt-gelijk': return `${d} klinkt hetzelfde, maar dat is de persoonsvorm (hij ${d}). Er staat al een hulpwerkwoord, dus je zoekt het voltooid deelwoord.`;
    case 'vd-t-d-omgedraaid':
      if (isStamTd(ww) && ww.soort === 'zwak' && !ww.sch) return st.endsWith('d') ? `${d}: de stam ${st} eindigt al op een d. Die blijft staan, ook al hoor je een t.` : `${d}: de stam ${st} eindigt al op een t. Er komt niets meer achter, ook geen d.`;
      if (ww.soort === 'zwak' && (!ww.sch || c === zwakVd(ww))) return `${d}: kijk nog eens naar 't kofschip. ${kofschipZin(inf, ww, ww.klank === 't' ? 'een t' : 'een d')}`;
      return `${d}: het voltooid deelwoord van ${inf} is ${c}. Dat eindigt op een ${c.at(-1)}.`;
    case 'vd-dt': return /td$/.test(d) ? `${d}: er komt maar één letter achter de stam, een t óf een d. Niet allebei.` : `${d}: een voltooid deelwoord eindigt nooit op dt.`;
    case 'vd-ge-teveel': return ww.sch ? `${d}: ${inf.slice(ww.sch.length)} heeft al het voorvoegsel ${ww.vv}-. Dan komt er geen ge- bij.` : `${d}: ${inf} heeft het voorvoegsel ${ww.vv}- (zonder klemtoon). Dan komt er geen ge- voor.`;
    case 'vd-met-e': return `${d}: na een hulpwerkwoord komt er geen -e achter het voltooid deelwoord.`;
    case 'vd-zwak-gemaakt': return `${d}: zo zou het gaan bij een zwak werkwoord. Het voltooid deelwoord van ${inf} eindigt op -en: ${c}.`;
    case 'vd-sterk-spelling': return `${d}: je hoort een lange klank, en de lettergreep is open (${lettergrepen(c)}). Dan schrijf je één klinker: ${c}.`;
    case 'inf-vt-gelijk': return `${d} klinkt hetzelfde, maar dat is de verleden tijd meervoud. Na ${q(zin.sleutel)} komt het hele werkwoord.`;
    case 'inf-tt': return `${d} is een persoonsvorm${d === V.vd ? ' of een voltooid deelwoord' : ''}. Na ${q(zin.sleutel)} komt het hele werkwoord.`;
    case 'inf-vd': return `${d} is het voltooid deelwoord. Na ${q(zin.sleutel)} komt het hele werkwoord.`;
    case 'inf-z-als-s': return `${d}: het hele werkwoord schrijf je met een z. De s hoort alleen bij de stam (${st}).`;
    case 'inf-v-als-f': return `${d}: het hele werkwoord schrijf je met een v. De f hoort alleen bij de stam (${st}).`;
    case 'gw-met-t': return `${d} is de vorm voor hij, zij of u. Een opdracht zonder onderwerp schrijf je met alleen de stam.`;
    case 'gw-d-als-t': return `${d}: je hoort een t, maar de stam is ${st}, met een d.`;
    case 'gw-z-gehouden': return `${d}: de stam schrijf je met een s (${st}), niet met een z.`;
    case 'gw-v-gehouden': return `${d}: de stam schrijf je met een f (${st}), niet met een v.`;
    case 'od-e-vergeten': return `${d}: het hoort bij ${sl}. Dan komt er een -e achter.`;
    case 'od-e-teveel': return `${d}: na ${q('een')} met een het-woord komt er geen -e achter.`;
    case 'od-t-ipv-d': return `${d}: een onvoltooid deelwoord is het hele werkwoord + d. Dus -end, niet -ent.`;
    case 'od-dt': return `${d}: achter het hele werkwoord komt alleen een d.`;
    case 'bvd-e-vergeten': return `${d} is het voltooid deelwoord zonder -e. Bij ${sl} komt er nog een -e achter.`;
    case 'bvd-extra-t': return `${d}: hier staat een t te veel. Het voltooid deelwoord is ${V.vd}. Daar komt alleen een -e achter.`;
    case 'bvd-te-ipv-de': return `${d}: het voltooid deelwoord is ${V.vd}, met een d. Daar komt alleen een -e achter.`;
    case 'bvd-t-d-omgedraaid': return `${d}: het voltooid deelwoord is ${V.vd}. Dat eindigt op een ${V.vd.at(-1)}, en die blijft staan.`;
    case 'bvd-n-teveel': return `${d}: er komt alleen een -e achter, geen -en.`;
    case 'bvd-e-teveel-sterk': return `${d}: ${V.vd} eindigt al op -en. Daar komt geen -e meer achter.`;
    case 'bvd-e-teveel': return `${d}: na ${q('een')} met een het-woord komt er geen -e achter.`;
    case 'bvd-vt-gelijk': return `${d} is de verleden tijd (hij ${d}). Hier hoort het voltooid deelwoord bij een zelfstandig naamwoord: ${V.vd} + e.`;
    case 'bvd-zwak-gemaakt': return `${d}: deze vorm bestaat niet. Het voltooid deelwoord is ${V.vd}, en daar komt geen -e meer achter.`;
  }
  throw new Error('onbekend patroon ' + p);
}

// Hint 2: hulpvragen voor déze vraag (per regel), zonder het antwoord.
const EEN_HET = 'Bij welk zelfstandig naamwoord hoort het? Is dat een het-woord in het enkelvoud met een, geen of zo’n ervoor? Dan geen -e. Anders wel een -e.';
function hint2(regel, zin, inf, ww) {
  const s = zin.slot;
  const let_ = (w) => (w ? ` Let op ${q(w)}.` : '');
  const k = kofschipLetter(inf, ww);
  if (s.startsWith('tt.')) {
    const st1 = zin.jeBezit ? 'Wie of wat doet het? Dat is het onderwerp. Let op het woord na ‘je’.' : `Wie of wat doet het? Dat is het onderwerp.${let_(zin.sleutel)}`;
    return [st1, 'Is het onderwerp enkelvoud of meervoud? En staat het voor of achter het werkwoord?', 'Wat is de stam? Moet er een t bij, of niet?'];
  }
  if (s.startsWith('vt.')) {
    const st1 = `Speelt het zich nu af of in het verleden?${let_(zin.tijd)}`;
    if (['vt-sterk', 'vt-sterk-jij', 'vt-onregelmatig'].includes(regel)) return [st1, 'Zeg: gisteren … ik. Verandert de klinker, en hoor je geen -te of -de? Dan is het een sterk werkwoord. Een paar werkwoorden leer je los.', 'Bij een sterk werkwoord komt er geen -te of -de achter. Is het onderwerp meervoud? Dan komt er -en achter, en schrijf je het volgens de gewone spellingregels.'];
    const st2 = 'Zeg: gisteren … ik. Hoor je -te of -de? Dan is het een zwak werkwoord.';
    if (regel === 'vt-vz') return [st1, st2, 'Eindigt het hele werkwoord op -ven of -zen? Kijk dan naar de v of z, niet naar de f of s van de stam.'];
    if (regel === 'vt-leen-klank') return [st1, 'Is het een Engels werkwoord? De stam is dan het Engelse woord.', "Luister naar de laatste medeklinker in het hele werkwoord. Is die stemloos (trilt je keel niet)? Dan -te."];
    return [st1, st2, "Wat is de stam, en eindigt die op t, k, f, s, ch of p? Is het onderwerp meervoud? Dan komt er nog een -n achter."];
  }
  if (s === 'vd') {
    const st1 = `Staat er een hulpwerkwoord (hebben, zijn of worden) in de zin, en hoort het werkwoord daarbij?${let_(zin.sleutel)}`;
    if (['vd-sterk', 'vd-sterk-geen-ge', 'vd-gemengd', 'vd-onregelmatig'].includes(regel)) return [st1, 'Zeg: ik heb ge… Eindigt het op -en, of verandert de klinker? Dan is het een sterk of onregelmatig werkwoord.', 'Heeft het werkwoord een voorvoegsel zonder klemtoon (be-, ge-, her-, er-, ont-, ver-)? Dan komt er geen ge- voor.'];
    if (regel === 'vd-scheidbaar' || regel === 'vd-scheidbaar-geen-ge') return [st1, 'Kun je het werkwoord splitsen (ik bel op)? Dan is het scheidbaar en komt de ge- in het midden.', 'Heeft het tweede deel al een voorvoegsel zonder klemtoon (be-, ge-, her-, er-, ont-, ver-)? Dan komt er geen ge- bij.'];
    if (regel === 'vd-vz') return [st1, 'Wat is de stam? Eindigt het hele werkwoord op -ven of -zen?', 'Bij -ven of -zen kijk je naar de v of z, niet naar de f of s van de stam.'];
    if (regel === 'vd-leen-klank') return [st1, 'Is het een Engels werkwoord? De stam is dan het Engelse woord.', "Luister naar de laatste medeklinker in het hele werkwoord. Is die stemloos (trilt je keel niet)? Dan een t."];
    if (regel === 'vd-geen-ge') return [st1, 'Heeft het werkwoord een voorvoegsel zonder klemtoon (be-, ge-, her-, er-, ont-, ver-)? Dan komt er geen ge- voor.', k.vz ? 'Eindigt het hele werkwoord op -ven of -zen? Kijk dan naar de v of z.' : "Eindigt de stam al op t of d? Zo niet: eindigt de stam op t, k, f, s, ch of p?"];
    return [st1, 'Wat is de stam? Eindigt die al op een t of d?', "Zo niet: eindigt de stam op t, k, f, s, ch of p?"];
  }
  if (s === 'od.e' || s === 'od.kaal') return ['Eindigt het werkwoord op -end? Dan is het een onvoltooid deelwoord.', `Hoort het bij een zelfstandig naamwoord, of staat het los in de zin?${zin.eenHet || s === 'od.e' ? let_(zin.sleutel) : ''}`, s === 'od.kaal' && !zin.eenHet ? 'Het onvoltooid deelwoord is het hele werkwoord + d. Welke letter hoort er dan aan het eind?' : EEN_HET];
  if (s === 'inf') return [`Welk ander werkwoord staat er in de zin?${let_(zin.sleutel)}`, 'Staat de open plek achteraan, bij dat werkwoord?', 'Welke vorm komt er na zo’n werkwoord?'];
  if (s === 'gw') return ['Is dit een opdracht zonder onderwerp (geen jij of u erbij)?', 'Wat is de stam (ik …)?', 'Welke vorm hoort bij een opdracht?'];
  // bvd: eerst het juiste voltooid deelwoord, dan de -e
  let vd = 'Wat is het voltooid deelwoord? Zeg: ik heb ge… of: het is ge…';
  if (/en$/.test(ww.vormen.vd)) vd += ' Eindigt het op -en? Dan is het een sterk werkwoord.';
  else if (ww.vormen.vd !== zwakVd(ww)) vd += ' Sommige werkwoorden zijn onregelmatig; die leer je los.';
  else if (ww.sch) vd += ' Is het werkwoord scheidbaar? Dan komt de ge- in het midden.';
  else if (ww.vv) vd += ` Let op het voorvoegsel ${ww.vv}- zonder klemtoon: dan geen ge-.`;
  else if (k.vz) vd += ' Eindigt het hele werkwoord op -ven of -zen? Kijk dan naar de v of z.';
  return [`Hoort het werkwoord bij een zelfstandig naamwoord?${let_(zin.sleutel)}`, vd, /en$/.test(ww.vormen.vd) ? 'Eindigt het voltooid deelwoord op -en? Dan komt er geen -e meer bij.' : EEN_HET];
}

/** Bouwt alles voor één vraag. */
export function maakUitleg(inf, ww, zin, afleiders, regels) {
  const c = ww.vormen[zin.slot];
  const regel = regelVan(inf, ww, zin);
  const vormcat = zin.slot.split('.')[0];
  const opties = new Set([c, ...afleiders.map((a) => a.vorm)]);
  const r = regels.regels[regel];
  if (!r) throw new Error(`regels.json mist regel ${regel}`);
  // voorbeelden tussen haakjes in de regeltekst weglaten als ze een van de opties noemen
  const regelTekst = r.regel.replace(/\s*\(([^)]*)\)/g, (m, binnen) => ([...opties].some((o) => new RegExp(`(^|[^\\p{L}])${o}($|[^\\p{L}])`, 'iu').test(binnen)) ? '' : m));
  const stappen = [`Welke vorm? ${vormZin(zin, ww)}`];
  if (!['inf', 'od'].includes(vormcat) && ww.stam) stappen.push(stamZin(inf, ww));
  stappen.push(`De regel: ${regelTekst}`);
  const perAfleider = Object.fromEntries(afleiders.map((a) => [a.vorm, afleiderZin(a.patroon, a.vorm, inf, ww, zin, c)]));
  const kort = regelZin(regel, inf, ww, zin, c);

  // hint 3: de regel met een voorbeeld uit een andere zin (ander werkwoord, geen van de opties)
  const vb = r.voorbeelden.find((v) => v.ww !== inf && !opties.has(v.vorm) && ![...opties].some((o) => new RegExp(`(^|[^\\p{L}])${o}`, 'iu').test(v.zin)));
  if (!vb) throw new Error(`geen bruikbaar voorbeeld voor regel ${regel} (${inf})`);
  const hints = [
    'Welke vorm of tijd is dit? Let op de woorden om de open plek heen.',
    hint2(regel, zin, inf, ww).map((t) => `• ${t}`).join('\n'),
    `${regelTekst}\nVoorbeeld: ${vb.zin}`,
  ];
  return { regel, kort, stappen, perAfleider, onthoud: ONTHOUD[regel], hints };
}
