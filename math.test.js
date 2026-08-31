import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeConsumption, computeFuelCostPerKm, computeTimeCostPerKm, findOptimalSpeed } from './script.js';

const c0 = 6.5;
const alpha = 0.0002;
const vRef = 90;
const price = 610;
const hourlyRate = 3125;

function approxEqual(actual, expected, delta = 0.01) {
  assert.ok(Math.abs(actual - expected) <= delta, `Expected ${expected} ±${delta}, got ${actual}`);
}

test('computeConsumption at 130', () => {
  const result = computeConsumption(c0, alpha, vRef, 130);
  approxEqual(result, 8.58, 0.01);
});

test('computeConsumption at reference speed', () => {
  const result = computeConsumption(c0, alpha, vRef, vRef);
  assert.strictEqual(result, c0);
});

test('computeFuelCostPerKm', () => {
  const result = computeFuelCostPerKm(c0, price);
  approxEqual(result, 39.65, 0.01);
});

test('computeTimeCostPerKm', () => {
  const result = computeTimeCostPerKm(hourlyRate, 100);
  assert.strictEqual(result, 31.25);
});

test('findOptimalSpeed basic', () => {
  const { speed, cost } = findOptimalSpeed(c0, alpha, vRef, price, hourlyRate);
  assert.ok(speed >= 106 && speed <= 108, `Speed ${speed} not in [106,108]`);
  approxEqual(cost, 71.15, 0.1);
});

test('findOptimalSpeed boundaries', () => {
  let opt = findOptimalSpeed(c0, alpha, vRef, price, 0);
  assert.ok(Math.abs(opt.speed - 90) < 0.5, `Expected ~90, got ${opt.speed}`);
  opt = findOptimalSpeed(c0, alpha, vRef, 0, hourlyRate);
  assert.ok(Math.abs(opt.speed - 200) < 0.5, `Expected ~200, got ${opt.speed}`);
  opt = findOptimalSpeed(c0, 0, vRef, price, hourlyRate);
  assert.ok(Math.abs(opt.speed - 200) < 0.5, `Expected ~200, got ${opt.speed}`);
  opt = findOptimalSpeed(c0, alpha, vRef, 2000, hourlyRate);
  assert.ok(Math.abs(opt.speed - 96.5) <= 1, `Expected ~96.5, got ${opt.speed}`);
});

test('optimal cost lower than edges', () => {
  const opt = findOptimalSpeed(c0, alpha, vRef, price, hourlyRate);
  const cost60 = findOptimalSpeed(c0, alpha, vRef, price, hourlyRate, { min: 60, max: 60 }).cost;
  const cost160 = findOptimalSpeed(c0, alpha, vRef, price, hourlyRate, { min: 160, max: 160 }).cost;
  assert.ok(opt.cost <= cost60 && opt.cost <= cost160, `Optimal cost ${opt.cost} not <= edges ${cost60}, ${cost160}`);
});
