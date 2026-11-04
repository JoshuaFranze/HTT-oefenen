// Werkwoordspelling oefenen voor de HTT (4F). Schermen en routering.

import { laadConfig, laadRegels, laadTrainer, laadBlocklist, laadGebouwd, laadToets, actieveVragen } from './data.js';
import { leesVoortgang, leesInstellingen, schrijfInstellingen, leesGeheim, schrijfGeheim, opslagWerkt, huidigAntwoord, begintOpnieuw, exporteer, importeer, wisAlles } from './storage.js';
import { startAutoSync, synchroniseer, opStatus, testToken } from './sync.js';
import { rooster, mooieDatum, vandaag, dagenTussen, maakIcs, testDatumActief } from './rooster.js';
import { startToets, eindScherm } from './toets.js';
import { CATEGORIE, KORT, perOnderdeel, groei, aanmoediging, mijlpalen, telling, oefenTip, resultaten } from './stats.js';
import { esc, modal, sluitModal, rustmoment, melding, pasToegankelijkheidToe, download, zinMetGat } from './ui.js';

const app = document.getElementById('app');
const D = {};

async function init() {
  pasToegankelijkheidToe();
  try {
    [D.config, D.regels, D.gebouwd, D.blocklist] = await Promise.all([laadConfig(), laadRegels(), laadGebouwd(), laadBlocklist()]);
  } catch (e) {
    app.innerHTML = `<div class="kaart p-6 max-w-xl mx-auto mt-10"><h1 class="text-xl font-extrabold mb-2">Even geduld</h1><p>De oefenvragen konden niet worden geladen. Controleer je internet en laad de pagina opnieuw. Je voortgang is veilig.</p><p class="text-sm text-zacht mt-3">${esc(e.message)}</p></div>`;
    return;
  }
  opStatus(toonSync);
  startAutoSync();
  window.addEventListener('hashchange', route);
  window.addEventListener('htt:gesynchroniseerd', () => {
    if (/^#\/?$|^#\/(instellingen)?$/.test(location.hash || '#/')) route();
  });
  route();
}

function toonSync(s) {
  const el = document.getElementById('sync-pill');
  if (!el) return;
  const kleur = { ok: 'bg-accent', bezig: 'bg-warm', wacht: 'bg-warm', fout: 'bg-warm', uit: 'bg-grijs' }[s.staat];
  el.querySelector('[data-dot]').className = `inline-block w-2 h-2 rounded-full mr-1 align-middle ${kleur}`;
  el.querySelector('[data-tekst]').textContent = s.staat === 'ok' ? 'Opgeslagen' : s.staat === 'uit' ? 'Niet gekoppeld' : s.staat === 'fout' ? 'Alleen op dit apparaat' : 'Opslaan…';
  el.title = s.tekst;
}

function zetNav(naam) {
  document.querySelectorAll('[data-nav]').forEach((a) => a.toggleAttribute('aria-current', a.dataset.nav === naam));
  document.body.classList.toggle('in-toets', naam === 'toets');
}

function route() {
  sluitModal();
  const h = location.hash.replace(/^#\/?/, '');
  const [deel, arg, arg2] = h.split('/');
  window.scrollTo(0, 0);
  if (deel === 'toets' && arg) return toetsIntro(Number(arg));
  if (deel === 'maak' && arg) return maakToets(Number(arg), arg2 === 'simulatie' ? 'simulatie' : 'oefen');
  if (deel === 'stappenplan') return stappenplan();
  if (deel === 'trainer') return trainer(arg);
  if (deel === 'instellingen') return instellingen();
  return dashboard();
}

const naar = (h) => { location.hash = h; };

// ---------- dashboard ----------

function toetsStatus(p, n) {
  const t = p.toetsen[n];
  if (!t) return { staat: 'nieuw' };
  const r = (t.resultaten || []).at(-1);
  const pog = t.poging || 1;
  const beantwoord = Object.entries(p.antwoorden).filter(([k, a]) => k.startsWith(n + '|') && (a.p || 1) === pog).length;
  if (t.afgerond) return { staat: 'gemaakt', r, beantwoord };
  if (beantwoord) return { staat: 'bezig', r, beantwoord, modus: t.modus };
  return { staat: r ? 'gemaakt' : 'nieuw', r, beantwoord: 0 };
}

function dashboard() {
  zetNav('home');
  document.title = 'Werkwoordspelling oefenen';
  const p = leesVoortgang();
  const inst = leesInstellingen();
  const lijst = rooster(D.config, D.gebouwd);
  const vrij = lijst.filter((t) => t.vrij);
  const bezig = vrij.find((t) => toetsStatus(p, t.toets).staat === 'bezig');
  const eerstNieuw = vrij.find((t) => toetsStatus(p, t.toets).staat === 'nieuw');
  const komend = lijst.find((t) => t.komtNog);
  const geheim = leesGeheim();
  const po = perOnderdeel(p);
  const tip = oefenTip(p);
  const tel = telling(p);
  const mp = mijlpalen(p);
  const zinnen = aanmoediging(p);
  const groeiZinnen = groei(p);

  let volgende;
  if (bezig) {
    const s = toetsStatus(p, bezig.toets);
    volgende = `<p class="text-zacht">Je was bezig met oefentoets ${bezig.toets}. Je hebt ${s.beantwoord} van de 40 vragen gedaan.</p><a class="knop knop-primair mt-4" href="#/maak/${bezig.toets}">Verder met toets ${bezig.toets}</a>`;
  } else if (eerstNieuw) {
    volgende = `<p class="text-zacht">Oefentoets ${eerstNieuw.toets} staat voor je klaar sinds ${mooieDatum(eerstNieuw.datum)}.</p><a class="knop knop-primair mt-4" href="#/toets/${eerstNieuw.toets}">Start toets ${eerstNieuw.toets}</a>`;
  } else if (komend) {
    volgende = `<p class="text-zacht">Je hebt alle toetsen gemaakt die nu klaarstaan. Knap! Oefentoets ${komend.toets} komt op ${mooieDatum(komend.datum)}.</p><a class="knop knop-zacht mt-4" href="#/trainer">Intussen even de valkuilen oefenen</a>`;
  } else {
    volgende = `<p class="text-zacht">Alle toetsen staan klaar. Je kunt elke toets nog eens maken, of de toets-simulatie doen.</p>`;
  }

  const aftel = inst.aftellen && D.config.htt.vensterVan ? (() => {
    const doel = D.config.htt.datum || D.config.htt.vensterVan;
    const n = dagenTussen(vandaag(D.config.tijdzone), doel);
    return n >= 0 ? `<p class="text-sm text-zacht mt-3">Nog ${n} ${n === 1 ? 'dag' : 'dagen'} tot ${D.config.htt.datum ? 'de HTT' : 'de week van de HTT'}.</p>` : '';
  })() : '';

  app.innerHTML = `<div class="space-y-6">
    ${!opslagWerkt() ? `<div class="kaart p-4 feedback-info"><strong>Let op:</strong> deze browser kan niets bewaren (misschien een privévenster). Open de site in een gewoon venster, dan gaat er niets verloren.</div>` : ''}
    ${testDatumActief() ? `<div class="kaart p-3 text-sm feedback-info">Testweergave: de site doet alsof het ${mooieDatum(vandaag(), { jaar: true })} is. Je voortgang verandert hier niet door.</div>` : ''}
    ${!geheim.token ? `<div class="kaart p-4 sm:p-5 feedback-info flex flex-wrap items-center gap-3"><p class="mr-auto"><strong>Koppel je account</strong>, dan gaat je voortgang nooit verloren, ook niet op een ander apparaat.</p><a class="knop knop-warm" href="#/instellingen">Koppelen</a></div>` : ''}
    <section class="kaart p-6 sm:p-8">
      <p class="text-sm font-bold text-accent uppercase tracking-wide">Jouw volgende oefentoets</p>
      ${volgende}
      <ul class="mt-5 space-y-1">${zinnen.map((z) => `<li class="aanmoediging">${esc(z)}</li>`).join('')}</ul>
      ${aftel}
    </section>

    <section>
      <h2 class="text-xl font-extrabold mb-3">Alle oefentoetsen</h2>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">${lijst.map((t) => toetsKaart(p, t, inst)).join('')}</div>
    </section>

    <section class="grid md:grid-cols-2 gap-6">
      <div class="kaart p-6">
        <h2 class="text-xl font-extrabold mb-1">Per onderdeel</h2>
        <p class="text-sm text-zacht mb-4">${resultaten(p).length ? 'Gebaseerd op je laatste toetsen.' : 'Dit vult zich vanzelf als je toetsen maakt.'}</p>
        <ul class="space-y-3">${Object.entries(CATEGORIE).map(([c]) => balk(c, po[c], inst)).join('')}</ul>
        ${groeiZinnen.length ? `<div class="mt-5 space-y-1">${groeiZinnen.slice(0, 3).map((g) => `<p class="groei">${esc(g.tekst)}</p>`).join('')}</div>` : ''}
        ${tip ? `<div class="mt-5 p-4 rounded-2xl feedback-info"><p><strong>${esc(KORT[tip])}</strong> is een onderdeel om rustig nog eens te oefenen.</p><a class="knop knop-zacht mt-3" href="#/trainer/${tip}">Oefen dit onderdeel</a></div>` : ''}
      </div>
      <div class="kaart p-6">
        <h2 class="text-xl font-extrabold mb-3">Wat je al gedaan hebt</h2>
        <div class="grid grid-cols-3 gap-3 text-center">
          <div class="stat"><div class="stat-getal">${tel.gemaakt}</div><div class="stat-tekst">toetsen</div></div>
          <div class="stat"><div class="stat-getal">${tel.vragen}</div><div class="stat-tekst">vragen</div></div>
          <div class="stat"><div class="stat-getal">${tel.trainerRondes}</div><div class="stat-tekst">trainerrondes</div></div>
        </div>
        ${mp.length ? `<h3 class="font-extrabold mt-5 mb-2">Mijlpalen</h3><ul class="flex flex-wrap gap-2">${mp.map((m) => `<li class="badge">${esc(m)}</li>`).join('')}</ul>` : ''}
        <div class="flex flex-wrap gap-2 mt-6">
          <a class="knop knop-rand" href="#/stappenplan">Stappenplan</a>
          <a class="knop knop-rand" href="#/trainer">Valkuilen-trainer</a>
          <button class="knop knop-rand" data-rust>Rustmoment</button>
          <button class="knop knop-rand" data-ics>Herinneringen in je agenda</button>
        </div>
      </div>
    </section>
  </div>`;
  app.querySelector('[data-rust]').addEventListener('click', rustmoment);
  app.querySelector('[data-ics]').addEventListener('click', () => {
    download('werkwoordspelling-oefentoetsen.ics', maakIcs(D.config, location.origin + location.pathname), 'text/calendar');
    melding('Agendabestand gedownload. Open het om de herinneringen toe te voegen.');
  });
}

function balk(c, x, inst) {
  const pct = x.totaal ? Math.round((x.goed / x.totaal) * 100) : 0;
  return `<li><div class="flex justify-between text-sm font-bold"><span>${esc(KORT[c])}</span><span class="text-zacht">${x.totaal ? (inst.scoreTonen ? `${x.goed} van ${x.totaal}` : '') : 'nog niet geoefend'}</span></div>
    <div class="balkje"><span style="width:${x.totaal ? Math.max(pct, 4) : 0}%"></span></div></li>`;
}

function toetsKaart(p, t, inst) {
  if (!t.vrij) {
    return `<div class="toetskaart toetskaart-later" aria-disabled="true"><div class="font-extrabold">Toets ${t.toets}</div><div class="text-sm">${t.nietKlaar ? 'Komt binnenkort' : `Beschikbaar vanaf ${mooieDatum(t.datum)}`}</div></div>`;
  }
  const s = toetsStatus(p, t.toets);
  const sub = s.staat === 'bezig' ? `Bezig: ${s.beantwoord} van 40` : s.staat === 'gemaakt' ? (inst.scoreTonen && s.r ? `Gemaakt: ${s.r.goed} van ${s.r.totaal}` : 'Gemaakt') : 'Klaar om te maken';
  return `<a class="toetskaart toetskaart-${s.staat}" href="#/toets/${t.toets}"><div class="font-extrabold">Toets ${t.toets}${t.reserve ? ' <span class="text-xs font-bold">(extra)</span>' : ''}</div><div class="text-sm">${sub}</div></a>`;
}

// ---------- toets ----------

async function toetsIntro(n) {
  zetNav('home');
  const t = rooster(D.config, D.gebouwd).find((x) => x.toets === n);
  if (!t || !t.vrij) {
    app.innerHTML = `<div class="kaart p-6 max-w-xl mx-auto"><h1 class="text-xl font-extrabold mb-2">Oefentoets ${n}</h1><p>${t && t.komtNog ? `Deze toets komt op ${mooieDatum(t.datum)}. Tot die tijd kun je de andere toetsen maken of de valkuilen oefenen.` : 'Deze toets is nog niet klaar.'}</p><a class="knop knop-rand mt-4" href="#/">Terug naar het overzicht</a></div>`;
    return;
  }
  const p = leesVoortgang();
  const s = toetsStatus(p, n);
  const simAanbevolen = n >= D.config.simulatieAanbevolenVanaf;
  app.innerHTML = `<section class="max-w-2xl mx-auto kaart p-6 sm:p-8">
    <p class="text-sm font-bold text-accent uppercase tracking-wide">Werkwoordspelling</p>
    <h1 class="text-3xl font-extrabold mt-1">Oefentoets ${n}</h1>
    <ul class="mt-4 space-y-1 text-lg">
      <li>40 vragen, net als bij de HTT.</li>
      <li>Geen tijdsdruk. Neem de tijd die je nodig hebt.</li>
      <li>Je kunt altijd stoppen. Alles wordt na elk antwoord bewaard.</li>
      ${n <= D.config.hint.kleinTot ? '<li>Bij elke vraag kun je hulp bij de regel krijgen.</li>' : ''}
    </ul>
    ${s.staat === 'gemaakt' && s.r ? `<p class="mt-4 text-zacht">Je hebt deze toets al gemaakt${leesInstellingen().scoreTonen ? ` (${s.r.goed} van ${s.r.totaal})` : ''}. Nog een keer maken mag altijd.</p>` : ''}
    <div class="flex flex-wrap gap-3 mt-6">
      ${s.staat === 'bezig' ? `<a class="knop knop-primair" href="#/maak/${n}">Verder waar je was</a>` : s.staat === 'gemaakt' ? `<button class="knop knop-primair" data-opnieuw>Nog een keer maken</button>` : `<a class="knop knop-primair" href="#/maak/${n}">Start de toets</a>`}
      <button class="knop knop-rand" data-rust>Eerst even rustmoment</button>
    </div>
    <details class="mt-6" ${simAanbevolen ? 'open' : ''}><summary class="font-bold cursor-pointer">Liever als echte toets? (toets-simulatie)</summary>
      <p class="mt-2 text-zacht">Precies zoals de HTT: geen hint en de uitleg pas aan het eind. ${simAanbevolen ? 'Fijn om te doen vlak voor de echte toets.' : ''}</p>
      <button class="knop knop-zacht mt-3" data-sim>Start als simulatie</button></details>
  </section>`;
  app.querySelector('[data-rust]').addEventListener('click', rustmoment);
  app.querySelector('[data-opnieuw]')?.addEventListener('click', () => { begintOpnieuw(String(n)); naar(`/maak/${n}`); });
  app.querySelector('[data-sim]').addEventListener('click', () => {
    if (s.staat === 'gemaakt' || s.staat === 'bezig') begintOpnieuw(String(n));
    naar(`/maak/${n}/simulatie`);
  });
}

async function maakToets(n, modus) {
  zetNav('toets');
  const t = rooster(D.config, D.gebouwd).find((x) => x.toets === n);
  if (!t?.vrij) return naar(`/toets/${n}`);
  app.innerHTML = '<p class="text-center text-zacht mt-10">Even laden…</p>';
  let toets;
  try {
    toets = await laadToets(n);
  } catch {
    app.innerHTML = '<div class="kaart p-6 max-w-xl mx-auto mt-10">De toets kon niet worden geladen. Probeer het zo nog eens. Je voortgang is veilig.</div>';
    return;
  }
  const vragen = actieveVragen(toets, D.blocklist);
  // een simulatie die nog bezig is, gaat verder als simulatie; anders telt wat er gekozen is
  const s = toetsStatus(leesVoortgang(), n);
  const m = modus === 'simulatie' || (s.staat === 'bezig' && s.modus === 'simulatie') ? 'simulatie' : 'oefen';
  if (s.staat === 'gemaakt') begintOpnieuw(String(n));
  startToets(app, {
    modus: m,
    nummer: n,
    hash: toets.hash,
    vragen,
    config: D.config,
    terug: () => naar('/'),
    naarEind: (r) => {
      zetNav('home');
      history.replaceState(null, '', `#/toets/${n}`); // herladen toont dan de introductie, niet een nieuwe ronde
      const pp = leesVoortgang();
      const antw = Object.fromEntries(vragen.map((v) => [v.id, huidigAntwoord(pp, String(n), v.id)]).filter(([, a]) => a));
      eindScherm(app, {
        vragen, antwoorden: antw, resultaat: r, titel: `Oefentoets ${n}${m === 'simulatie' ? ' (simulatie)' : ''}`, scoreTonen: leesInstellingen().scoreTonen,
        knoppen: `<a class="knop knop-primair" href="#/">Naar het overzicht</a><a class="knop knop-rand" href="#/trainer">Valkuilen oefenen</a><button class="knop knop-rand" onclick="document.dispatchEvent(new Event('htt:rust'))">Rustmoment</button>`,
      });
    },
  });
}
document.addEventListener('htt:rust', rustmoment);

// ---------- stappenplan ----------

function stappenplan() {
  zetNav('stappenplan');
  document.title = 'Stappenplan werkwoordspelling';
  const s = D.regels.stappenplan;
  const regels = D.regels.regels;
  const groepen = [
    ['Tegenwoordige tijd', ['tt-ik', 'tt-t', 'tt-dt', 'tt-stam-t', 'tt-inversie', 'tt-inversie-d', 'tt-u-inversie', 'tt-je-bezit', 'tt-mv']],
    ['Verleden tijd', ['vt-te', 'vt-de', 'vt-vz', 'vt-stam-t', 'vt-stam-d', 'vt-sterk', 'vt-sterk-jij', 'vt-onregelmatig', 'vt-leen-klank']],
    ['Voltooid deelwoord', ['vd-t', 'vd-d', 'vd-vz', 'vd-stam-td', 'vd-geen-ge', 'vd-scheidbaar', 'vd-scheidbaar-geen-ge', 'vd-sterk', 'vd-sterk-geen-ge', 'vd-gemengd', 'vd-onregelmatig', 'vd-leen-klank']],
    ['Voltooid deelwoord voor een zelfstandig naamwoord', ['bvd-e', 'bvd-stam-t', 'bvd-spelling', 'bvd-sterk', 'bvd-een-het']],
    ['Onvoltooid deelwoord', ['od-e', 'od-kaal', 'od-een-het']],
    ['Infinitief en gebiedende wijs', ['inf', 'gw', 'gw-d']],
  ];
  app.innerHTML = `<article class="max-w-3xl mx-auto space-y-6">
    <div class="kaart p-6 sm:p-8"><h1 class="text-3xl font-extrabold">${esc(s.titel)}</h1><p class="mt-3 text-lg">${esc(s.intro)}</p></div>
    ${s.stappen.map((st) => `<section class="kaart p-6"><h2 class="text-xl font-extrabold">${esc(st.titel)}</h2><p class="mt-2">${esc(st.tekst)}</p><ul class="stappenlijst mt-3">${st.punten.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></section>`).join('')}
    <section class="kaart p-6"><h2 class="text-xl font-extrabold mb-3">Alle regels met voorbeelden</h2>
      ${groepen.map(([g, ids]) => `<details class="regelgroep"><summary class="font-bold cursor-pointer">${esc(g)}</summary><ul class="mt-3 space-y-3">${ids.filter((i) => regels[i]).map((i) => `<li><p>${esc(regels[i].regel)}</p><p class="text-sm text-zacht mt-1">Voorbeeld: ${esc(regels[i].voorbeelden[0].zin)}</p></li>`).join('')}</ul></details>`).join('')}
    </section>
  </article>`;
}

// ---------- trainer ----------

async function trainer(cat) {
  zetNav('trainer');
  document.title = 'Valkuilen-trainer';
  const bank = await laadTrainer();
  const p = leesVoortgang();
  const tip = oefenTip(p);
  if (!cat) {
    app.innerHTML = `<section class="max-w-2xl mx-auto kaart p-6 sm:p-8">
      <h1 class="text-3xl font-extrabold">Valkuilen-trainer</h1>
      <p class="mt-3 text-lg">Korte rondes van ${D.config.trainerRonde} vragen over één onderdeel. Geen druk, en bij elke vraag krijg je meteen uitleg.</p>
      ${tip ? `<p class="mt-3">Tip: <strong>${esc(KORT[tip])}</strong> is een mooi onderdeel om nu te oefenen.</p>` : ''}
      <div class="grid sm:grid-cols-2 gap-3 mt-5">${Object.keys(CATEGORIE).map((c) => `<a class="toetskaart toetskaart-nieuw" href="#/trainer/${c}"><div class="font-extrabold">${esc(KORT[c])}</div></a>`).join('')}
      <a class="toetskaart toetskaart-nieuw" href="#/trainer/mix"><div class="font-extrabold">Van alles een beetje</div></a></div>
    </section>`;
    return;
  }
  const pool = bank.vragen.filter((v) => cat === 'mix' || v.categorie === cat);
  // eerst vragen die ze nog niet deed, dan vragen met een valkuil, dan de rest
  const score = (v) => {
    const a = p.trainer.antwoorden[v.id];
    return !a ? 0 : !a.goed ? 1 : 2 + (a.t || 0) / 1e15;
  };
  const r = Math.random;
  const gekozen = [...pool].sort((a, b) => score(a) - score(b) || r() - 0.5).slice(0, D.config.trainerRonde).sort(() => r() - 0.5);
  if (!gekozen.length) return naar('/trainer');
  startToets(app, {
    modus: 'trainer', nummer: 0, hash: bank.hash, vragen: gekozen, config: D.config,
    terug: () => naar('/'),
    naarEind: (res) => {
      zetNav('trainer');
      const pp = leesVoortgang();
      const antw = Object.fromEntries(gekozen.map((v) => [v.id, pp.trainer.antwoorden[v.id]]).filter(([, a]) => a));
      eindScherm(app, {
        vragen: gekozen, antwoorden: antw, resultaat: res, titel: `Valkuilen-trainer: ${cat === 'mix' ? 'van alles een beetje' : KORT[cat]}`, scoreTonen: leesInstellingen().scoreTonen,
        knoppen: `<a class="knop knop-primair" href="#/trainer/${cat}" onclick="setTimeout(()=>dispatchEvent(new HashChangeEvent('hashchange')),0)">Nog een ronde</a><a class="knop knop-rand" href="#/">Naar het overzicht</a>`,
      });
    },
  });
}

// ---------- instellingen ----------

function instellingen() {
  zetNav('instellingen');
  document.title = 'Instellingen';
  const inst = leesInstellingen();
  const g = leesGeheim();
  const p = leesVoortgang();
  const meldingen = Object.values(p.meldingen).sort((a, b) => b.t - a.t);
  const keuze = (naam, waarde, tekst) => `<label class="keuze"><input type="radio" name="${naam}" value="${waarde}" ${String(inst[naam]) === String(waarde) ? 'checked' : ''}> ${tekst}</label>`;
  app.innerHTML = `<div class="max-w-3xl mx-auto space-y-6">
    <section class="kaart p-6">
      <h1 class="text-2xl font-extrabold mb-2">Voortgang bewaren</h1>
      <p>Je voortgang wordt na elk antwoord op dit apparaat bewaard. Koppel je GitHub-account, dan staat alles ook veilig online en kun je op een ander apparaat verder.</p>
      <ol class="stappenlijst mt-3 text-sm">
        <li>Ga op github.com naar Settings, dan Developer settings, dan Personal access tokens, dan Tokens (classic).</li>
        <li>Maak een token met alleen het vinkje <strong>gist</strong> aan. Hetzelfde token als bij de RWT-site werkt ook.</li>
        <li>Plak het token hieronder. Het blijft alleen op dit apparaat.</li>
      </ol>
      <label class="block font-bold mt-4" for="token">GitHub-token</label>
      <input id="token" class="invoer mt-1" type="password" autocomplete="off" value="${esc(g.token)}" placeholder="ghp_…">
      <div class="flex flex-wrap gap-2 mt-3"><button class="knop knop-primair" data-koppel>Opslaan en koppelen</button>${g.token ? '<button class="knop knop-rand" data-sync>Nu opslaan</button><button class="knop knop-rand" data-ontkoppel>Ontkoppelen op dit apparaat</button>' : ''}</div>
      <p class="text-sm mt-3" data-syncstatus></p>
      <div class="flex flex-wrap gap-2 mt-5 pt-5 border-t border-lijn">
        <button class="knop knop-rand" data-export>Voortgang downloaden</button>
        <label class="knop knop-rand cursor-pointer">Voortgang importeren<input type="file" accept=".json,application/json" class="sr-only" data-import></label>
      </div>
      <p class="text-sm text-zacht mt-2">Importeren voegt samen met wat er al is. Er wordt nooit iets overschreven.</p>
    </section>
    <section class="kaart p-6 space-y-5" data-inst>
      <h2 class="text-2xl font-extrabold">Zo werkt de site voor jou</h2>
      <fieldset><legend class="font-bold mb-1">Uitleg bij een antwoord</legend>${keuze('feedback', 'direct', 'Meteen na elke vraag')}${keuze('feedback', 'eind', 'Pas aan het eind van de toets')}</fieldset>
      <fieldset><legend class="font-bold mb-1">Score</legend>${keuze('scoreTonen', 'true', 'Laten zien')}${keuze('scoreTonen', 'false', 'Verbergen')}</fieldset>
      <fieldset><legend class="font-bold mb-1">Hulp bij de regel in latere toetsen</legend>${keuze('hintAltijd', 'false', 'Zoals gepland (steeds minder)')}${keuze('hintAltijd', 'true', 'Altijd laten zien')}</fieldset>
      <fieldset><legend class="font-bold mb-1">Aftellen naar de HTT</legend>${keuze('aftellen', 'false', 'Uit')}${keuze('aftellen', 'true', 'Aan')}</fieldset>
      <fieldset><legend class="font-bold mb-1">Lettergrootte</legend>${keuze('lettergrootte', 'normaal', 'Normaal')}${keuze('lettergrootte', 'groot', 'Groot')}${keuze('lettergrootte', 'extra', 'Extra groot')}</fieldset>
      <fieldset><legend class="font-bold mb-1">Lettertype</legend>${keuze('lettertype', 'standaard', 'Standaard')}${keuze('lettertype', 'leesbaar', 'Extra leesbaar')}</fieldset>
      <label class="keuze"><input type="checkbox" data-contrast ${inst.contrast ? 'checked' : ''}> Hoog contrast</label>
    </section>
    <section class="kaart p-6">
      <h2 class="text-xl font-extrabold mb-2">Meldingen ‘Klopt dit wel?’</h2>
      ${meldingen.length ? `<ul class="space-y-2 text-sm">${meldingen.map((m) => `<li class="p-3 rounded-xl bg-zacht"><strong>${esc(m.qid)}</strong> (${esc(m.toets)}): ${esc(m.zin)}<br>${esc(m.tekst || '(geen toelichting)')}</li>`).join('')}</ul><button class="knop knop-rand mt-3" data-kopieer>Kopieer de meldingen</button>` : '<p class="text-zacht">Nog geen meldingen.</p>'}
    </section>
    <section class="kaart p-6">
      <h2 class="text-xl font-extrabold mb-2">Alles wissen</h2>
      <p class="text-zacht">Begint helemaal opnieuw op dit apparaat. Wat online staat, blijft bewaard en komt bij de volgende keer koppelen gewoon terug.</p>
      <button class="knop knop-rand mt-3" data-wis>Wis de voortgang op dit apparaat</button>
    </section>
  </div>`;
  const st = app.querySelector('[data-syncstatus]');
  opStatus((s) => { if (document.body.contains(st)) st.textContent = s.tekst; });
  app.querySelector('[data-koppel]').addEventListener('click', async () => {
    const token = app.querySelector('#token').value.trim();
    if (!token) return melding('Plak eerst een token.');
    st.textContent = 'Token controleren…';
    const t = await testToken(token);
    if (!t.ok) { st.textContent = t.reden; return; }
    schrijfGeheim({ token });
    await synchroniseer();
    melding('Gekoppeld. Je voortgang staat nu ook online.');
    instellingen();
  });
  app.querySelector('[data-sync]')?.addEventListener('click', () => synchroniseer());
  app.querySelector('[data-ontkoppel]')?.addEventListener('click', () => { schrijfGeheim({ token: '', gistId: '' }); synchroniseer(); instellingen(); });
  app.querySelector('[data-export]').addEventListener('click', () => download(`werkwoordspelling-voortgang-${vandaag()}.json`, exporteer()));
  app.querySelector('[data-import]').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      importeer(await f.text());
      melding('Voortgang toegevoegd.');
      instellingen();
    } catch (err) {
      melding(err.message);
    }
  });
  app.querySelector('[data-inst]').addEventListener('change', (e) => {
    const el = e.target;
    if (el.matches('[data-contrast]')) schrijfInstellingen({ contrast: el.checked });
    else if (el.type === 'radio') schrijfInstellingen({ [el.name]: el.value === 'true' ? true : el.value === 'false' ? false : el.value });
    pasToegankelijkheidToe();
  });
  app.querySelector('[data-kopieer]')?.addEventListener('click', async () => {
    const tekst = meldingen.map((m) => `${m.qid} (${m.toets}): ${m.zin} — ${m.tekst}`).join('\n');
    try { await navigator.clipboard.writeText(tekst); melding('Gekopieerd.'); } catch { download('meldingen.txt', tekst, 'text/plain'); }
  });
  app.querySelector('[data-wis]').addEventListener('click', () => {
    const m = modal('<p>Weet je het zeker? Op dit apparaat begint alles dan opnieuw.</p><div class="flex gap-3 mt-5"><button class="knop knop-rand" data-ja>Ja, wissen</button><button class="knop knop-primair" data-sluit>Nee, toch niet</button></div>', { titel: 'Voortgang wissen' });
    m.querySelector('[data-ja]').addEventListener('click', () => { wisAlles(); schrijfGeheim({ gistId: '' }); sluitModal(); naar('/'); });
  });
}

init();
