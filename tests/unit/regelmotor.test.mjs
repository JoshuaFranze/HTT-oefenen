// De regelmotor (controle A) tegen een vaste lijst bekende vormen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vervoeg, buigVd } from '../../tools/lib/regelmotor.mjs';
import { lettergrepen } from '../../tools/lib/uitleg.mjs';

const v = (e) => vervoeg(e).vormen;

test('zwakke werkwoorden en t kofschip', () => {
  assert.equal(v({ inf: 'werken' })['vt.ev'], 'werkte');
  assert.equal(v({ inf: 'wonen' })['vt.ev'], 'woonde');
  assert.equal(v({ inf: 'leven' })['vt.ev'], 'leefde');
  assert.equal(v({ inf: 'reizen' }).vd, 'gereisd');
  assert.equal(v({ inf: 'zetten' })['vt.ev'], 'zette');
  assert.equal(v({ inf: 'landen' })['vt.mv'], 'landden');
  assert.equal(v({ inf: 'praten' }).vd, 'gepraat');
  assert.equal(v({ inf: 'faxen' })['vt.ev'], 'faxte');
});

test('tegenwoordige tijd', () => {
  const w = v({ inf: 'worden' });
  assert.equal(w['tt.ik'], 'word');
  assert.equal(w['tt.hij'], 'wordt');
  assert.equal(w['tt.jij.na'], 'word');
  assert.equal(w['tt.u'], 'wordt');
  assert.equal(v({ inf: 'zetten' })['tt.hij'], 'zet');
});

test('voorvoegsels, scheidbaar, leenwoorden', () => {
  assert.equal(v({ inf: 'verhuizen', vv: 'ver' }).vd, 'verhuisd');
  assert.equal(v({ inf: 'opbellen', sch: 'op' }).vd, 'opgebeld');
  assert.equal(v({ inf: 'voorbereiden', sch: 'voor', vv: 'be' }).vd, 'voorbereid');
  assert.equal(v({ inf: 'updaten', leen: true, stam: 'update', klank: 't' }).vd, 'geüpdatet');
  assert.equal(v({ inf: 'downloaden', leen: true }).vd, 'gedownload');
  assert.equal(v({ inf: 'downloaden', leen: true })['tt.hij'], 'downloadt');
});

test('bijvoeglijk voltooid deelwoord', () => {
  assert.equal(buigVd('geoogst'), 'geoogste');
  assert.equal(buigVd('gered'), 'geredde');
  assert.equal(buigVd('gezet'), 'gezette');
  assert.equal(buigVd('verbreed'), 'verbrede');
  assert.equal(buigVd('gebroken'), 'gebroken');
});

test('lettergrepen', () => {
  assert.equal(lettergrepen('beloven'), 'be-lo-ven');
  assert.equal(lettergrepen('verhuren'), 'ver-hu-ren');
  assert.equal(lettergrepen('betalen'), 'be-ta-len');
  assert.equal(lettergrepen('gelopen'), 'ge-lo-pen');
  assert.equal(lettergrepen('vergeleken'), 'ver-ge-le-ken');
});
