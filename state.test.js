import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, VEHICLE_CW, validate, effectiveAlpha, deriveC0, totalHourlyRate, loadState, saveState, resetState, fitQuadratic, effectiveCurve } from './script.js';

test('DEFAULTS match v3 fixture', () => {
  assert.strictEqual(DEFAULTS.consumption, 6.5);
  assert.strictEqual(DEFAULTS.consumptionSpeed, 130);
  assert.strictEqual(DEFAULTS.vehicleType, 'hatchback');
  assert.strictEqual(DEFAULTS.fuelType, 'gasoline');
  assert.strictEqual(DEFAULTS.fuelPrice, 610);
  assert.strictEqual(DEFAULTS.salary, 436200);
  assert.deepStrictEqual(DEFAULTS.passengers, []);
  assert.strictEqual(DEFAULTS.autoMode, true);
  assert.strictEqual(DEFAULTS.cw, 0.32);
});

test('validate keeps out-of-range values (no clamping)', () => {
  const v = validate({ ...DEFAULTS, salary: 999999999, consumption: 0, freeTime: 7 });
  assert.strictEqual(v.salary, 999999999);
  assert.strictEqual(v.consumption, 0);
  assert.strictEqual(v.freeTime, 7);
});

test('validate vehicleType and fuelType enums', () => {
  const v = validate({ ...DEFAULTS, vehicleType: 'truck', fuelType: 'electric' });
  assert.strictEqual(v.vehicleType, 'hatchback');
  assert.strictEqual(v.fuelType, 'gasoline');
});

test('validate passengers array clamps and limits', () => {
  const v = validate({ ...DEFAULTS, passengers: [300000, -50, 999999999, 'abc'] });
  assert.deepStrictEqual(v.passengers, [300000, 0, 50000000, 0]);
});

test('effectiveAlpha: auto mode derives from vehicle cw', () => {
  assert.ok(Math.abs(effectiveAlpha({ ...DEFAULTS, autoMode: true, vehicleType: 'sedan' }) - 0.28 * 0.000625) < 1e-9);
  assert.ok(Math.abs(effectiveAlpha({ ...DEFAULTS, autoMode: true, vehicleType: 'suv' }) - 0.38 * 0.000625) < 1e-9);
  assert.ok(Math.abs(effectiveAlpha({ ...DEFAULTS, autoMode: false, cw: 0.5 }) - 0.5 * 0.000625) < 1e-9);
});

test('deriveC0: measured at vRef=80 returns consumption as-is', () => {
  const c0 = deriveC0({ ...DEFAULTS, consumption: 6.5, consumptionSpeed: 80 });
  assert.ok(Math.abs(c0 - 6.5) < 0.001);
});

test('deriveC0: measured at 130 derives lower C0', () => {
  const c0 = deriveC0({ ...DEFAULTS, consumption: 8.58, consumptionSpeed: 130, autoMode: true, vehicleType: 'hatchback' });
  assert.ok(c0 < 8.58, `expected c0 < 8.58, got ${c0}`);
});

test('totalHourlyRate: salary only', () => {
  assert.strictEqual(totalHourlyRate(DEFAULTS), 2726.25);
});

test('totalHourlyRate: salary + passengers', () => {
  const hr = totalHourlyRate({ ...DEFAULTS, salary: 500000, passengers: [300000, 200000] });
  assert.strictEqual(hr, 6250);
});

test('loadState returns defaults on corrupt storage', () => {
  globalThis.localStorage = { getItem: () => '{bad json', setItem: () => {}, removeItem: () => {} };
  const s = loadState();
  assert.strictEqual(s.consumption, 6.5);
  delete globalThis.localStorage;
});

test('save/load roundtrip with v3 fields', () => {
  const store = {};
  globalThis.localStorage = {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = v; },
    removeItem: (k) => { delete store[k]; },
  };
  saveState({ ...DEFAULTS, vehicleType: 'suv', passengers: [400000], fuelType: 'diesel' });
  const loaded = loadState();
  assert.strictEqual(loaded.vehicleType, 'suv');
  assert.deepStrictEqual(loaded.passengers, [400000]);
  assert.strictEqual(loaded.fuelType, 'diesel');
  delete globalThis.localStorage;
});

test('resetState clears storage and returns defaults', () => {
  const store = { 'mennyivelmenjek:state:v3': '{"salary":999}' };
  globalThis.localStorage = {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = v; },
    removeItem: (k) => { delete store[k]; },
  };
  const s = resetState();
  assert.strictEqual(s.salary, 436200);
  assert.strictEqual(store['mennyivelmenjek:state:v3'], undefined);
  delete globalThis.localStorage;
});

test('storage key is v3', () => {
  const store = {};
  globalThis.localStorage = {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = v; },
    removeItem: (k) => { delete store[k]; },
  };
  saveState(DEFAULTS);
  assert.ok('mennyivelmenjek:state:v3' in store);
  delete globalThis.localStorage;
});

test('fitQuadratic: perfect quadratic data', () => {
  const measurements = [
    { speed: 90, liters: 6.5 },
    { speed: 110, liters: 6.5 * (1 + 0.0002 * 400) },
    { speed: 130, liters: 6.5 * (1 + 0.0002 * 1600) },
  ];
  const fit = fitQuadratic(measurements);
  assert.ok(fit !== null);
  assert.ok(fit.c0 > 5 && fit.c0 < 9, `c0 ${fit.c0} in reasonable range`);
  assert.ok(fit.alpha > 0, 'alpha positive');
  assert.ok(fit.vRef >= 90 && fit.vRef <= 130, `vRef ${fit.vRef} in measurement range`);
});

test('fitQuadratic: returns null with <3 points', () => {
  assert.strictEqual(fitQuadratic([{ speed: 90, liters: 5 }]), null);
  assert.strictEqual(fitQuadratic([{ speed: 90, liters: 5 }, { speed: 110, liters: 6 }]), null);
});

test('fitQuadratic: returns null for decreasing consumption', () => {
  const measurements = [
    { speed: 90, liters: 8 },
    { speed: 110, liters: 6 },
    { speed: 130, liters: 4 },
  ];
  assert.strictEqual(fitQuadratic(measurements), null);
});

test('effectiveCurve: uses fitted curve when ≥3 measurements and mode is measurements', () => {
  const state = {
    ...DEFAULTS,
    carAdvancedMode: 'measurements',
    measurements: [
      { speed: 90, liters: 6.5 },
      { speed: 110, liters: 7.0 },
      { speed: 130, liters: 8.0 },
    ],
  };
  const curve = effectiveCurve(state);
  assert.ok(curve.c0 > 0 && curve.alpha > 0, 'fitted curve params positive');
});

test('effectiveCurve: ignores measurements when mode is cw', () => {
  const state = {
    ...DEFAULTS,
    carAdvancedMode: 'cw',
    measurements: [
      { speed: 90, liters: 6.5 },
      { speed: 110, liters: 7.0 },
      { speed: 130, liters: 8.0 },
    ],
  };
  const curve = effectiveCurve(state);
  const expectedC0 = deriveC0(state);
  assert.ok(Math.abs(curve.c0 - expectedC0) < 0.001);
});

test('effectiveCurve: falls back to model with <3 measurements', () => {
  const state = { ...DEFAULTS, measurements: [{ speed: 90, liters: 6.5 }] };
  const curve = effectiveCurve(state);
  const expectedC0 = deriveC0(state);
  assert.ok(Math.abs(curve.c0 - expectedC0) < 0.001);
});

test('validate: measurements clamped and limited', () => {
  const v = validate({
    ...DEFAULTS,
    measurements: [
      { speed: 10, liters: 50 },
      { speed: 250, liters: 0.5 },
      { speed: 'abc', liters: 5 },
      null,
    ],
  });
  assert.strictEqual(v.measurements.length, 2);
  assert.strictEqual(v.measurements[0].speed, 40);
  assert.strictEqual(v.measurements[0].liters, 40);
  assert.strictEqual(v.measurements[1].speed, 200);
  assert.strictEqual(v.measurements[1].liters, 1);
});
