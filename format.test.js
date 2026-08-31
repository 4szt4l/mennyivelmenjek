import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatSpeed, formatFt, parseDecimal } from './script.js';

test('formatSpeed', () => {
  assert.strictEqual(formatSpeed(107.1), '107 km/h');
});

test('formatFt pinned', () => {
  assert.match(formatFt(71.147), /^71\s*Ft$/);
});

test('formatFt structural', () => {
  const s = formatFt(1234.5);
  assert.ok(/\s/.test(s), 'has grouping separator');
  assert.ok(s.endsWith('Ft'), 'ends with Ft');
});

test('formatFt grouping', () => {
  const s = formatFt(500000);
  assert.match(s, /500[\s  ]000/, 'has grouping separator');
});

test('parseDecimal comma', () => assert.strictEqual(parseDecimal('6,5'), 6.5));
test('parseDecimal dot', () => assert.strictEqual(parseDecimal('6.5'), 6.5));
test('parseDecimal integer', () => assert.strictEqual(parseDecimal('6'), 6));
test('parseDecimal empty', () => assert.strictEqual(parseDecimal(''), null));
test('parseDecimal garbage', () => assert.strictEqual(parseDecimal('abc'), null));
test('parseDecimal double separator', () => assert.strictEqual(parseDecimal('6,5,5'), null));
test('parseDecimal whitespace', () => assert.strictEqual(parseDecimal(' 7,2 '), 7.2));
