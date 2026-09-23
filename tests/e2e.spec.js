import { test, expect } from '@playwright/test';

const FIXTURE = { consumption: '6,5', consumptionSpeed: '90', fuelPrice: '610', salary: '436200' };

async function fillFixture(page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator('#fuel-type .seg-btn[data-value="manual"]').click();
  await page.fill('#consumption', FIXTURE.consumption);
  await page.fill('#consumption-speed', FIXTURE.consumptionSpeed);
  await page.fill('#fuel-price', FIXTURE.fuelPrice);
  await page.fill('#salary', FIXTURE.salary);
}

test('smoke - page loads and contains required elements', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err));

  await page.goto('/');

  expect(pageErrors).toHaveLength(0);

  const lang = await page.evaluate(() => document.documentElement.lang);
  expect(lang).toBe('hu');

  await expect(page).toHaveTitle(/Mennyivel menjek/);

  const ids = [
    'consumption', 'consumption-speed', 'fuel-price', 'salary', 'work-hours',
    'free-time', 'distance', 'cw', 'optimal-speed',
    'trip-cost', 'trip-time', 'results', 'chart',
    'chart-fallback', 'range-limit-note', 'theme-toggle', 'reset',
    'fuel-type', 'vehicle-type', 'passengers', 'add-passenger',
    'fuel-price-note', 'fuel-section', 'car-section', 'time-section',
    'car-tab-simple', 'car-tab-advanced', 'time-tab-simple', 'time-tab-advanced',
    'car-simple', 'car-advanced', 'time-simple', 'time-advanced',
    'consumption-chart', 'consumption-chart-wrapper', 'measurements', 'add-measurement',
    'trip-section', 'trip-toggle', 'trip-content', 'trip-diff', 'trip-cost-130', 'trip-time-130',
'car-advanced-mode', 'cw-panel', 'measurements-panel',
    'legal-limit-note', 'fuel-price-unit', 'salary-unit',
    'theoretical-optimum', 'defaults-note', 'trip-toggle-label', 'trip-ref-header'
  ];
  for (const id of ids) {
    const count = await page.locator(`#${id}`).count();
    expect(count).toBe(1);
  }
});

test.describe('Optimal Speed Calculator E2E', () => {
  test('happy path: fixture renders correct optimum', async ({ page }) => {
    await fillFixture(page);
    await expect(page.locator('#optimal-speed')).toContainText(/10[3-5] km\/h/);
    await expect(page.locator('#range-limit-note')).toBeHidden();
  });

  test('directional sensitivity: higher consumption → slower', async ({ page }) => {
    await fillFixture(page);
    const initialSpeed = await page.locator('#optimal-speed').textContent();
    await page.fill('#consumption', '8');
    const newSpeed = await page.locator('#optimal-speed').textContent();
    const initial = parseFloat(initialSpeed.replace(',', '.'));
    const updated = parseFloat(newSpeed.replace(',', '.'));
    expect(updated).toBeLessThan(initial);
  });

  test('directional sensitivity: higher salary → faster', async ({ page }) => {
    await fillFixture(page);
    const initialSpeed = await page.locator('#optimal-speed').textContent();
    await page.fill('#salary', '1000000');
    const newSpeed = await page.locator('#optimal-speed').textContent();
    const initial = parseFloat(initialSpeed.replace(',', '.'));
    const updated = parseFloat(newSpeed.replace(',', '.'));
    expect(updated).toBeGreaterThan(initial);
  });

  test('boundary: salary=0 → 80 km/h, no range note', async ({ page }) => {
    await fillFixture(page);
    await page.fill('#salary', '0');
    await expect(page.locator('#optimal-speed')).toContainText('80 km/h');
    await expect(page.locator('#range-limit-note')).toBeHidden();
  });

  test('boundary: very high salary → recommended capped at 130, theoretical shown', async ({ page }) => {
    await fillFixture(page);
    await page.fill('#salary', '5000000');
    await expect(page.locator('#optimal-speed')).toContainText('130 km/h');
    await expect(page.locator('#theoretical-optimum')).toBeVisible();
    await expect(page.locator('#theoretical-optimum')).toContainText(/1[3-9]\d km\/h/);
    await expect(page.locator('#legal-limit-note')).toBeVisible();
    await expect(page.locator('#legal-limit-note')).toContainText(/130/);
  });

  test('persistence: values survive reload', async ({ page }) => {
    await fillFixture(page);
    await page.fill('#consumption', '7,2');
    await page.reload();
    await expect(page.locator('#consumption')).toHaveValue('7,2');
  });

  test('reset: restores defaults and clears storage', async ({ page }) => {
    await fillFixture(page);
    await page.fill('#consumption', '9,9');
    await page.click('#reset');
    await expect(page.locator('#consumption')).toHaveValue('6,5');
    await expect(page.locator('#optimal-speed')).toContainText(/11[01] km\/h/);
  });

  test('theme toggle: switches and persists', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    const initialTheme = await page.evaluate(() => document.documentElement.dataset.theme);
    await page.click('#theme-toggle');
    const newTheme = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(newTheme).not.toBe(initialTheme);
    await page.reload();
    const persistedTheme = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(persistedTheme).toBe(newTheme);
  });

  test('mobile: no horizontal scroll, sticky results', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await fillFixture(page);
    const scrollWidth = await page.evaluate(() => document.scrollingElement.scrollWidth);
    const innerWidth = await page.evaluate(() => window.innerWidth);
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
    const position = await page.evaluate(() => getComputedStyle(document.getElementById('results')).position);
    expect(position).toBe('sticky');
  });

  test('chart: canvas rendered with annotation at optimum', async ({ page }) => {
    await fillFixture(page);
    const canvas = page.locator('#chart');
    const box = await canvas.boundingBox();
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
await page.waitForFunction(() => {
      const opt = parseFloat(document.getElementById('optimal-speed').textContent.replace(',', '.'));
      const ann = window.chart?.options?.plugins?.annotation?.annotations?.optimum?.value;
      return typeof ann === 'number' && Math.abs(ann - opt) < 0.6;
    });
  });

  test('CDN failure: results still render, fallback shown', async ({ page }) => {
    await page.route('**/chart.umd.min.js', route => route.abort());
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator('#fuel-type .seg-btn[data-value="manual"]').click();
    await page.fill('#consumption', FIXTURE.consumption);
    await page.fill('#consumption-speed', FIXTURE.consumptionSpeed);
    await page.fill('#fuel-price', FIXTURE.fuelPrice);
    await page.fill('#salary', FIXTURE.salary);
    await expect(page.locator('#chart-fallback')).toBeVisible();
    await expect(page.locator('#optimal-speed')).toContainText(/10[3-5] km\/h/);
  });

  test('trip totals: toggle on, distance shows cost, time, and 130 comparison', async ({ page }) => {
    await fillFixture(page);
    await expect(page.locator('#trip-content')).toBeHidden();
    await page.locator('#trip-toggle').evaluate((el) => el.click());
    await expect(page.locator('#trip-content')).toBeVisible();
    await page.fill('#distance', '300');
    await expect(page.locator('#trip-cost')).not.toHaveText('');
    await expect(page.locator('#trip-cost')).toContainText(/13\s*0\d\d\s*Ft/);
    await expect(page.locator('#trip-time')).toContainText(/2 óra 5\d perc/);
    await expect(page.locator('#trip-cost-130')).toBeVisible();
    await expect(page.locator('#trip-time-130')).toBeVisible();
    await expect(page.locator('#trip-diff')).toBeVisible();
    const diff = await page.locator('#trip-diff').textContent();
    expect(diff).toMatch(/üzemanyag megtakarítás|üzemanyag többlet/);
    expect(diff).toMatch(/perc|azonos/);
  });

  test('trip toggle: off hides content', async ({ page }) => {
    await fillFixture(page);
    await page.locator('#trip-toggle').evaluate((el) => el.click());
    await expect(page.locator('#trip-content')).toBeVisible();
    await page.locator('#trip-toggle').evaluate((el) => el.click());
    await expect(page.locator('#trip-content')).toBeHidden();
  });

  test('zero console errors on normal load', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await fillFixture(page);
    expect(errors).toEqual([]);
  });

  test('vehicle type switch changes optimum', async ({ page }) => {
    await fillFixture(page);
    const hatchbackSpeed = await page.locator('#optimal-speed').textContent();
    await page.locator('#vehicle-type .seg-btn[data-value="suv"]').click();
    const suvSpeed = await page.locator('#optimal-speed').textContent();
    const hatch = parseFloat(hatchbackSpeed.replace(',', '.'));
    const suv = parseFloat(suvSpeed.replace(',', '.'));
    expect(suv).toBeLessThan(hatch);
  });

  test('consumption speed affects curve', async ({ page }) => {
    await fillFixture(page);
    const at90 = await page.locator('#optimal-speed').textContent();
    await page.fill('#consumption-speed', '130');
    const at130 = await page.locator('#optimal-speed').textContent();
    const speed90 = parseFloat(at90.replace(',', '.'));
    const speed130 = parseFloat(at130.replace(',', '.'));
    expect(speed130).toBeGreaterThan(speed90);
  });

  test('passengers: add, fill, remove', async ({ page }) => {
    await fillFixture(page);
    await page.locator('#time-tab-advanced').click();
    const soloSpeed = await page.locator('#optimal-speed').textContent();
    await page.click('#add-passenger');
    await expect(page.locator('#passengers input')).toHaveCount(1);
    await page.fill('#passengers input[data-index="0"]', '300000');
    const withPassenger = await page.locator('#optimal-speed').textContent();
    const solo = parseFloat(soloSpeed.replace(',', '.'));
    const withP = parseFloat(withPassenger.replace(',', '.'));
    expect(withP).toBeGreaterThan(solo);
    await page.click('.remove-passenger[data-index="0"]');
    await expect(page.locator('#passengers input')).toHaveCount(0);
  });

  test('car tab: simple/advanced switch', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#car-simple')).toBeVisible();
    await expect(page.locator('#car-advanced')).toBeHidden();
    await page.locator('#car-tab-advanced').click();
    await expect(page.locator('#car-simple')).toBeHidden();
    await expect(page.locator('#car-advanced')).toBeVisible();
    await expect(page.locator('#cw-panel')).toBeVisible();
    await expect(page.locator('#measurements-panel')).toBeHidden();
    await page.locator('#car-tab-simple').click();
    await expect(page.locator('#car-simple')).toBeVisible();
    await expect(page.locator('#car-advanced')).toBeHidden();
  });

  test('car advanced mode: cw/measurements switch', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator('#car-tab-advanced').click();
    await expect(page.locator('#cw-panel')).toBeVisible();
    await expect(page.locator('#measurements-panel')).toBeHidden();
    await page.locator('#car-advanced-mode .seg-btn[data-value="measurements"]').click();
    await expect(page.locator('#cw-panel')).toBeHidden();
    await expect(page.locator('#measurements-panel')).toBeVisible();
    await page.locator('#car-advanced-mode .seg-btn[data-value="cw"]').click();
    await expect(page.locator('#cw-panel')).toBeVisible();
    await expect(page.locator('#measurements-panel')).toBeHidden();
  });

  test('time tab: simple/advanced switch', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#time-shared')).toBeVisible();
    await expect(page.locator('#time-advanced')).toBeHidden();
    await page.locator('#time-tab-advanced').click();
    await expect(page.locator('#time-shared')).toBeVisible();
    await expect(page.locator('#time-advanced')).toBeVisible();
    await expect(page.locator('#work-hours')).toBeVisible();
    await expect(page.locator('#free-time')).toBeVisible();
    await page.locator('#time-tab-simple').click();
    await expect(page.locator('#time-advanced')).toBeHidden();
  });

  test('car advanced tab: cw input affects optimum', async ({ page }) => {
    await fillFixture(page);
    const defaultSpeed = await page.locator('#optimal-speed').textContent();
    await page.locator('#car-tab-advanced').click();
    await page.fill('#cw', '0.5');
    const highCwSpeed = await page.locator('#optimal-speed').textContent();
    const def = parseFloat(defaultSpeed.replace(',', '.'));
    const high = parseFloat(highCwSpeed.replace(',', '.'));
    expect(high).toBeLessThan(def);
  });

  test('fuel type switch: manual enables input, others disable', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#fuel-price')).toBeDisabled();
    await page.locator('#fuel-type .seg-btn[data-value="manual"]').click();
    await expect(page.locator('#fuel-price')).toBeEnabled();
    await page.locator('#fuel-type .seg-btn[data-value="gasoline"]').click();
    await expect(page.locator('#fuel-price')).toBeDisabled();
  });

  test('desktop layout: inputs left, outputs right', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    const inputsBox = await page.locator('.col-inputs').boundingBox();
    const outputsBox = await page.locator('.col-outputs').boundingBox();
    expect(inputsBox.x).toBeLessThan(outputsBox.x);
  });

test('app is hungarian only', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('h1')).toContainText('Mennyivel menjek');
    await expect(page.locator('html')).toHaveAttribute('lang', 'hu');
  });

  test('info button shows tooltip on hover', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    const infoBtn = page.locator('.info-btn').first();
    await infoBtn.hover();
    await expect(page.locator('.info-tooltip')).toBeVisible();
    await page.mouse.move(0, 0);
    await expect(page.locator('.info-tooltip')).toHaveCount(0);
  });

  test('info button toggles tooltip on tap (touch)', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    const infoBtn = page.locator('.info-btn').first();
    await infoBtn.tap();
    await expect(page.locator('.info-tooltip')).toBeVisible();
    await infoBtn.tap();
    await expect(page.locator('.info-tooltip')).toHaveCount(0);
    await infoBtn.tap();
    await expect(page.locator('.info-tooltip')).toBeVisible();
    await context.close();
  });

test('fuel price uses Ft currency by default', async ({ page }) => {
    await fillFixture(page);
    await expect(page.locator('#fuel-price-unit')).toHaveText('Ft/l');
    await expect(page.locator('#salary-unit')).toContainText('Ft');
    await expect(page.locator('#fuel-price')).toBeEnabled();
    await page.fill('#fuel-price', '1,5');
    await page.locator('#trip-toggle').evaluate((el) => el.click());
    await page.fill('#distance', '300');
    await expect(page.locator('#trip-cost')).toContainText(/Ft/);
  });

  test('consumption uses l/100km in metric', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#consumption-unit-label')).toHaveText('l/100 km');
    await expect(page.locator('#consumption')).toHaveValue('6,5');
  });

test('currency stays Ft across reload', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#fuel-price-unit')).toHaveText('Ft/l');
  });

  test('legal limit warning when optimum > 130', async ({ page }) => {
    await fillFixture(page);
    await page.fill('#salary', '5000000');
    await expect(page.locator('#optimal-speed')).toContainText('130 km/h');
    await expect(page.locator('#theoretical-optimum')).toBeVisible();
    await expect(page.locator('#legal-limit-note')).toBeVisible();
    await expect(page.locator('#legal-limit-note')).toContainText(/130/);
  });

  test('no legal limit warning when optimum ≤ 130', async ({ page }) => {
    await fillFixture(page);
    await expect(page.locator('#legal-limit-note')).toBeHidden();
  });

  test('cost chart shows fuel and time sub-curves', async ({ page }) => {
    await fillFixture(page);
    const datasetCount = await page.evaluate(() => window.chart?.data?.datasets?.length);
    expect(datasetCount).toBe(3);
    const labels = await page.evaluate(() => window.chart?.data?.datasets?.map(d => d.label));
    expect(labels).toContain('Üzemanyag (Ft/km)');
    expect(labels).toContain('Idő (Ft/km)');
  });

  test('consumption chart renders in car advanced tab', async ({ page }) => {
    await fillFixture(page);
    await expect(page.locator('#consumption-chart')).toBeHidden();
    await page.locator('#car-tab-advanced').click();
    await expect(page.locator('#consumption-chart')).toBeVisible();
    const canvas = page.locator('#consumption-chart');
    const box = await canvas.boundingBox();
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
    const chartExists = await page.evaluate(() => !!window.consumptionChart);
    expect(chartExists).toBe(true);
  });

  test('measurements: add 3 points, curve fits, scatter appears', async ({ page }) => {
    await fillFixture(page);
    await page.locator('#car-tab-advanced').click();
    await page.locator('#car-advanced-mode .seg-btn[data-value="measurements"]').click();
    await page.click('#add-measurement');
    await page.click('#add-measurement');
    await page.click('#add-measurement');
    await expect(page.locator('#measurements .measurement-row')).toHaveCount(3);
    await page.fill('#measurements input[data-index="0"][data-field="speed"]', '90');
    await page.fill('#measurements input[data-index="0"][data-field="liters"]', '4,5');
    await page.fill('#measurements input[data-index="1"][data-field="speed"]', '110');
    await page.fill('#measurements input[data-index="1"][data-field="liters"]', '5,2');
    await page.fill('#measurements input[data-index="2"][data-field="speed"]', '130');
    await page.fill('#measurements input[data-index="2"][data-field="liters"]', '6,5');
    await page.waitForFunction(() => window.consumptionChart?.data?.datasets?.length === 2);
    const scatterCount = await page.evaluate(() => window.consumptionChart?.data?.datasets?.length);
    expect(scatterCount).toBe(2);
    const scatterType = await page.evaluate(() => window.consumptionChart?.data?.datasets?.[1]?.type);
    expect(scatterType).toBe('scatter');
  });

  test('measurements: remove point', async ({ page }) => {
    await fillFixture(page);
    await page.locator('#car-tab-advanced').click();
    await page.locator('#car-advanced-mode .seg-btn[data-value="measurements"]').click();
    await page.click('#add-measurement');
    await page.click('#add-measurement');
    await expect(page.locator('#measurements .measurement-row')).toHaveCount(2);
    await page.click('.remove-measurement[data-index="0"]');
    await expect(page.locator('#measurements .measurement-row')).toHaveCount(1);
  });

  test('consumption slider updates input and result', async ({ page }) => {
    await fillFixture(page);
    const before = await page.locator('#optimal-speed').textContent();
    await page.locator('#consumption-slider').fill('9');
    await expect(page.locator('#consumption')).toHaveValue('9');
    const after = await page.locator('#optimal-speed').textContent();
    expect(parseFloat(after.replace(',', '.'))).toBeLessThan(parseFloat(before.replace(',', '.')));
  });

  test('invalid input shows visible error note', async ({ page }) => {
    await fillFixture(page);
    await page.fill('#consumption', 'abc');
    await expect(page.locator('#consumption-error')).toBeVisible();
    await expect(page.locator('#consumption-error')).toContainText(/Érvénytelen|Invalid/);
    await expect(page.locator('#consumption')).toHaveAttribute('aria-invalid', 'true');
  });

  test('out-of-range input keeps value, slider clamps to max', async ({ page }) => {
    await fillFixture(page);
    await page.fill('#consumption', '50');
    await expect(page.locator('#consumption')).toHaveValue('50');
    await expect(page.locator('#consumption-slider')).toHaveValue('30');
    await expect(page.locator('#consumption-slider-max')).toHaveText('30');
  });

  test('defaults note visible on fresh load, hidden after change', async ({ page }) => {
    await page.route('**/openvan.camp/**', (route) => route.abort());
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#defaults-note')).toBeVisible();
    await page.fill('#consumption', '7');
    await expect(page.locator('#defaults-note')).toBeHidden();
  });

  test('trip toggle shows visible on/off label', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#trip-toggle-label')).toHaveText('Ki');
    await page.locator('#trip-toggle').evaluate((el) => el.click());
    await expect(page.locator('#trip-toggle-label')).toHaveText('Be');
  });

test('trip reference header shows 130 km/h', async ({ page }) => {
    await fillFixture(page);
    await page.locator('#trip-toggle').evaluate((el) => el.click());
    await expect(page.locator('#trip-ref-header')).toHaveText('130 km/h');
  });

  test('fuel fetch failure falls back to default price', async ({ page }) => {
    await page.route('**/openvan.camp/**', (route) => route.abort());
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator('#fuel-type .seg-btn[data-value="gasoline"]').click();
    await expect(page.locator('#fuel-price')).toHaveValue('610');
    await expect(page.locator('#fuel-price-note')).toContainText(/alapértelmezett|default/);
  });

  test('starts in gasoline mode with disabled price input', async ({ page }) => {
    await page.route('**/openvan.camp/**', (route) => route.abort());
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(
      page.locator('#fuel-type .seg-btn[data-value="gasoline"]'),
    ).toHaveClass(/active/);
    await expect(page.locator('#fuel-price')).toBeDisabled();
    await expect(page.locator('#fuel-price')).toHaveValue('610');
  });

  test('fuel price slider visible only in manual mode', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#fuel-price-slider')).toBeHidden();
    await page.locator('#fuel-type .seg-btn[data-value="gasoline"]').click();
    await expect(page.locator('#fuel-price-slider')).toBeHidden();
    await page.locator('#fuel-type .seg-btn[data-value="manual"]').click();
    await expect(page.locator('#fuel-price-slider')).toBeVisible();
  });

  test('sliders show min/max bounds', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#consumption-slider-min')).toHaveText('1');
    await expect(page.locator('#consumption-slider-max')).toHaveText('30');
  });

  test('distance slider has reasonable range and empty state', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#distance-slider-max')).toHaveText('1000');
    await expect(page.locator('#distance')).toHaveValue('');
    await expect(page.locator('#distance-slider')).toHaveValue('0');
  });
});
