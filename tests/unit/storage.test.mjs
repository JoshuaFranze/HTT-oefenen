// Opslag en samenvoegen: er mag nooit iets verloren gaan.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
globalThis.window = { dispatchEvent() {} };
globalThis.CustomEvent = class { constructor(n, o) { this.type = n; this.detail = o?.detail; } };
const S = await import('../../js/storage.js');

beforeEach(() => { mem.clear(); S._reset(); });
const vraag = (id, antwoord = 'goed', categorie = 'tt') => ({ id, antwoord, categorie, instinker: false });

test('antwoord wordt direct bewaard en overleeft herladen', () => {
  S.bewaarAntwoord('1', 'h1', vraag('tt-001'), 'goed', { positie: 3 });
  S._reset();
  const p = S.leesVoortgang();
  assert.equal(p.antwoorden['1|tt-001'].goed, true);
  assert.equal(p.toetsen['1'].positie, 3);
  assert.equal(p.antwoorden['1|tt-001'].h, 'h1');
});

test('samenvoegen van twee apparaten: per vraag de recentste, resultaten bij elkaar', () => {
  const a = S.legeVoortgang();
  const b = S.legeVoortgang();
  a.antwoorden['1|x'] = { k: 'a', goed: false, t: 100 };
  b.antwoorden['1|x'] = { k: 'b', goed: true, t: 200 };
  a.antwoorden['1|y'] = { k: 'a', goed: true, t: 50 };
  b.antwoorden['2|z'] = { k: 'z', goed: true, t: 60 };
  a.toetsen['1'] = { resultaten: [{ t: 10, goed: 30, totaal: 40 }], bijgewerkt: 10 };
  b.toetsen['1'] = { resultaten: [{ t: 20, goed: 35, totaal: 40 }], bijgewerkt: 20 };
  a.trainer.rondes.push({ t: 1 });
  b.trainer.rondes.push({ t: 2 });
  a.meldingen.m1 = { id: 'm1' };
  b.meldingen.m2 = { id: 'm2' };
  const s = S.samenvoegen(a, b);
  assert.equal(s.antwoorden['1|x'].k, 'b');
  assert.ok(s.antwoorden['1|y'] && s.antwoorden['2|z']);
  assert.equal(s.toetsen['1'].resultaten.length, 2);
  assert.equal(s.trainer.rondes.length, 2);
  assert.deepEqual(Object.keys(s.meldingen).sort(), ['m1', 'm2']);
  // samenvoegen is symmetrisch
  assert.deepEqual(S.samenvoegen(b, a).antwoorden, s.antwoorden);
});

test('opnieuw maken: oude resultaten blijven, nieuwe ronde begint leeg', () => {
  S.bewaarAntwoord('3', 'h', vraag('a'), 'goed');
  S.rondToetsAf('3', { t: 5, goed: 1, totaal: 1 });
  S.begintOpnieuw('3');
  const p = S.leesVoortgang();
  assert.equal(S.huidigAntwoord(p, '3', 'a'), null);
  assert.equal(p.toetsen['3'].resultaten.length, 1);
  assert.ok(p.antwoorden['3|a']);
});

test('kapotte opslag valt terug op de vorige versie', () => {
  S.bewaarAntwoord('1', 'h', vraag('a'), 'goed');
  S.bewaarAntwoord('1', 'h', vraag('b'), 'goed');
  mem.set('htt.voortgang.v1', '{kapot');
  S._reset();
  const p = S.leesVoortgang();
  assert.ok(p.antwoorden['1|a']);
});

test('import voegt samen en overschrijft niets', () => {
  S.bewaarAntwoord('1', 'h', vraag('a'), 'goed');
  const ander = S.legeVoortgang();
  ander.antwoorden['2|b'] = { k: 'x', goed: true, t: 1 };
  S.importeer(JSON.stringify({ voortgang: ander }));
  const p = S.leesVoortgang();
  assert.ok(p.antwoorden['1|a'] && p.antwoorden['2|b']);
});

test('het token komt nooit in de voortgang terecht', () => {
  S.schrijfGeheim({ token: 'ghp_geheim' });
  S.bewaarAntwoord('1', 'h', vraag('a'), 'goed');
  assert.ok(!JSON.stringify(S.leesVoortgang()).includes('ghp_geheim'));
  assert.ok(!S.exporteer().includes('ghp_geheim'));
});
