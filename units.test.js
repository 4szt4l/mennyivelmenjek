import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CURRENCIES,
  CONSUMPTION_UNITS,
  currencySymbol,
  consumptionUnitLabel,
  defaultConsumptionUnit,
  formatFt,
  formatSpeed,
  validate,
  DEFAULTS,
  buildChartConfig,
  buildConsumptionChartConfig,
} from './script.js';

test('CURRENCIES has expected entries', () => {
  assert.ok(CURRENCIES.Ft);
  assert.ok(CURRENCIES.EUR);
  assert.ok(CURRENCIES.USD);
  assert.strictEqual(currencySymbol('EUR'), '€');
  assert.strictEqual(currencySymbol('USD'), '$');
  assert.strictEqual(currencySymbol('unknown'), 'Ft');
});

test('CONSUMPTION_UNITS conversions roundtrip', () => {
  for (const key of Object.keys(CONSUMPTION_UNITS)) {
    const unit = CONSUMPTION_UNITS[key];
    const l100 = 6.5;
    const converted = unit.fromL100(l100);
    const back = unit.toL100(converted);
    assert.ok(Math.abs(back - l100) < 1e-9, `${key} roundtrip failed`);
  }
});

test('CONSUMPTION_UNITS known values', () => {
  assert.strictEqual(CONSUMPTION_UNITS.l100.fromL100(6.5), 6.5);
  assert.ok(Math.abs(CONSUMPTION_UNITS.kml.fromL100(6.5) - 100 / 6.5) < 1e-9);
  assert.ok(Math.abs(CONSUMPTION_UNITS.mpgUS.fromL100(6.5) - 235.215 / 6.5) < 1e-9);
  assert.ok(Math.abs(CONSUMPTION_UNITS.mpgUK.fromL100(6.5) - 282.481 / 6.5) < 1e-9);
  assert.strictEqual(consumptionUnitLabel('kml'), 'km/l');
  assert.strictEqual(consumptionUnitLabel('nope'), 'l/100 km');
});

test('defaultConsumptionUnit follows unit system', () => {
  assert.strictEqual(defaultConsumptionUnit('metric'), 'l100');
  assert.strictEqual(defaultConsumptionUnit('imperial'), 'mpgUS');
});

test('formatSpeed converts for imperial unit system', () => {
  assert.strictEqual(formatSpeed(107.1), '107 km/h');
  assert.strictEqual(formatSpeed(107.1, 'imperial'), '67 mph');
});

test('formatFt with different currencies', () => {
  assert.match(formatFt(71, 'EUR'), /€/);
  assert.match(formatFt(71, 'USD'), /\$/);
  assert.match(formatFt(71, 'GBP'), /£/);
  assert.match(formatFt(71, 'Ft'), /Ft/);
});

test('validate accepts currency and consumptionUnit', () => {
  const v = validate({ ...DEFAULTS, currency: 'EUR', consumptionUnit: 'kml' });
  assert.strictEqual(v.currency, 'EUR');
  assert.strictEqual(v.consumptionUnit, 'kml');
});

test('validate falls back to defaults for invalid units', () => {
  const v = validate({ ...DEFAULTS, currency: 'XXX', consumptionUnit: 'nope' });
  assert.strictEqual(v.currency, 'Ft');
  assert.strictEqual(v.consumptionUnit, 'l100');
});

test('buildChartConfig uses currency in labels and ticks', () => {
  const c = buildChartConfig({ ...DEFAULTS, currency: 'EUR', c0: 6.5, alpha: 0.0002, vRef: 90, price: 610, hourlyRate: 3125 });
  assert.match(c.data.datasets[0].label, /€\/km/);
  const tick = c.options.scales.y.ticks.callback(71.15);
  assert.match(tick, /€/);
});

test('buildConsumptionChartConfig converts to selected unit', () => {
  const c = buildConsumptionChartConfig({ c0: 6.5, alpha: 0.0002, vRef: 90, theme: 'light', consumptionUnit: 'kml' });
  assert.match(c.options.scales.y.title.text, /km\/l/);
  assert.ok(c.data.datasets[0].data[0].y > 10, 'km/l values are larger than l/100km');
});
