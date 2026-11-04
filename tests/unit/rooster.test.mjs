import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
globalThis.location = { search: '' };
const { rooster, maakIcs, mooieDatum } = await import('../../js/rooster.js');
const config = JSON.parse(readFileSync(new URL('../../data/config.json', import.meta.url)));

test('24 toetsen, twee per week, alle datums oplopend', () => {
  assert.equal(config.vrijgave.length, 24);
  const d = config.vrijgave.map((v) => v.datum);
  assert.deepEqual([...d].sort(), d);
  assert.equal(d[0], '2026-11-09');
  assert.equal(config.vrijgave.find((v) => v.toets === 22).datum, '2027-01-18');
});

test('testdatum bepaalt wat vrij is', () => {
  globalThis.location = { search: '?datum=2026-11-16' };
  const r = rooster(config, new Set([1, 2, 3, 4]));
  assert.deepEqual(r.filter((t) => t.vrij).map((t) => t.toets), [1, 2, 3]);
  assert.equal(r.find((t) => t.toets === 4).komtNog, true);
});

test('mooie datum en agenda', () => {
  assert.equal(mooieDatum('2026-11-16'), 'maandag 16 november');
  const ics = maakIcs(config, 'https://example.org/');
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 22); // op 18 jan en 21 jan komen er twee tegelijk
});
