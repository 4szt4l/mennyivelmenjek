import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildChartConfig, buildConsumptionChartConfig } from './script.js';

const fixture = { c0: 6.5, alpha: 0.0002, vRef: 90, price: 610, hourlyRate: 3125, theme: 'light' };

test('chart config has 281 data points', () => {
  const c = buildChartConfig(fixture);
  assert.strictEqual(c.data.datasets[0].data.length, 281);
  assert.strictEqual(c.data.datasets[0].data[0].x, 60);
  assert.strictEqual(c.data.datasets[0].data[280].x, 200);
});

test('chart config has 3 datasets (total, fuel, time)', () => {
  const c = buildChartConfig(fixture);
  assert.strictEqual(c.data.datasets.length, 3);
  assert.strictEqual(c.data.datasets[0].label, 'Összköltség (Ft/km)');
  assert.strictEqual(c.data.datasets[1].label, 'Üzemanyag (Ft/km)');
  assert.strictEqual(c.data.datasets[2].label, 'Idő (Ft/km)');
});

test('fuel + time = total at each point', () => {
  const c = buildChartConfig(fixture);
  for (let i = 0; i < 281; i += 50) {
    const sum = c.data.datasets[1].data[i].y + c.data.datasets[2].data[i].y;
    assert.ok(Math.abs(sum - c.data.datasets[0].data[i].y) < 0.01, `mismatch at index ${i}`);
  }
});

test('x scale is linear', () => {
  const c = buildChartConfig(fixture);
  assert.strictEqual(c.options.scales.x.type, 'linear');
});

test('y tick callback formats Ft', () => {
  const c = buildChartConfig(fixture);
  const formatted = c.options.scales.y.ticks.callback(71.15);
  assert.ok(formatted.endsWith('Ft'), `got ${formatted}`);
});

test('theme affects colors', () => {
  const light = buildChartConfig({ ...fixture, theme: 'light' });
  const dark = buildChartConfig({ ...fixture, theme: 'dark' });
  assert.notStrictEqual(light.options.scales.x.grid.color, dark.options.scales.x.grid.color);
});

test('annotation id is optimum', () => {
  const c = buildChartConfig(fixture);
  assert.ok(c.options.plugins.annotation.annotations.optimum, 'annotation named optimum exists');
  assert.strictEqual(typeof c.options.plugins.annotation.annotations.optimum.value, 'number');
});

test('consumption chart has 281 points', () => {
  const c = buildConsumptionChartConfig({ c0: 6.5, alpha: 0.0002, vRef: 90, theme: 'light' });
  assert.strictEqual(c.data.datasets.length, 1);
  assert.strictEqual(c.data.datasets[0].data.length, 281);
  assert.strictEqual(c.data.datasets[0].data[0].x, 60);
});

test('consumption chart with measurements adds scatter dataset', () => {
  const measurements = [{ speed: 90, liters: 4.5 }, { speed: 110, liters: 5.2 }, { speed: 130, liters: 6.5 }];
  const c = buildConsumptionChartConfig({ c0: 6.5, alpha: 0.0002, vRef: 90, theme: 'light', measurements });
  assert.strictEqual(c.data.datasets.length, 2);
  assert.strictEqual(c.data.datasets[1].type, 'scatter');
  assert.strictEqual(c.data.datasets[1].data.length, 3);
  assert.deepStrictEqual(c.data.datasets[1].data[0], { x: 90, y: 4.5 });
});
