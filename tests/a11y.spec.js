import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Audit - Optimal Speed Calculator', () => {
  const evidenceDir = '.sisyphus/evidence';

  test.beforeEach(async ({ page }) => {
    // Ensure evidence directory exists
    await page.goto('/');
  });

  test.describe('Light Theme Accessibility', () => {
    test('should have 0 serious/critical axe violations in light theme', async ({ page }) => {
      // Ensure light theme (default)
      await page.evaluate(() => {
        document.documentElement.removeAttribute('data-theme');
      });

      // Wait for page to fully load
      await page.waitForLoadState('networkidle');

      // Run axe accessibility scan
      const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

      // Count serious and critical violations
      const seriousViolations = accessibilityScanResults.violations.filter(
        v => v.impact === 'serious'
      );
      const criticalViolations = accessibilityScanResults.violations.filter(
        v => v.impact === 'critical'
      );

      console.log('Light theme - Total violations:', accessibilityScanResults.violations.length);
      console.log('Light theme - Critical:', criticalViolations.length);
      console.log('Light theme - Serious:', seriousViolations.length);

      // Assert no serious or critical violations
      expect(seriousViolations.length).toBe(0);
      expect(criticalViolations.length).toBe(0);

      // Log all violations for debugging
      if (accessibilityScanResults.violations.length > 0) {
        console.log('All violations:', JSON.stringify(accessibilityScanResults.violations, null, 2));
      }
    });

    test('should capture light theme desktop screenshot', async ({ page }) => {
      // Ensure light theme
      await page.evaluate(() => {
        document.documentElement.removeAttribute('data-theme');
      });

      // Set desktop viewport
      await page.setViewportSize({ width: 1280, height: 800 });

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Take screenshot
      await page.screenshot({
        path: `${evidenceDir}/task-12-light-desktop.png`,
        fullPage: true,
      });

      console.log('Captured: task-12-light-desktop.png');
    });

    test('should capture light theme mobile screenshot', async ({ page }) => {
      // Ensure light theme
      await page.evaluate(() => {
        document.documentElement.removeAttribute('data-theme');
      });

      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Take screenshot
      await page.screenshot({
        path: `${evidenceDir}/task-12-light-mobile.png`,
        fullPage: true,
      });

      console.log('Captured: task-12-light-mobile.png');
    });
  });

  test.describe('Dark Theme Accessibility', () => {
    test('should have 0 serious/critical axe violations in dark theme', async ({ page }) => {
      // Toggle to dark theme
      await page.click('#theme-toggle');
      await page.waitForSelector('[data-theme="dark"]', { state: 'attached' });

      // Wait for page to fully load
      await page.waitForLoadState('networkidle');

      // Run axe accessibility scan
      const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

      // Count serious and critical violations
      const seriousViolations = accessibilityScanResults.violations.filter(
        v => v.impact === 'serious'
      );
      const criticalViolations = accessibilityScanResults.violations.filter(
        v => v.impact === 'critical'
      );

      console.log('Dark theme - Total violations:', accessibilityScanResults.violations.length);
      console.log('Dark theme - Critical:', criticalViolations.length);
      console.log('Dark theme - Serious:', seriousViolations.length);

      // Assert no serious or critical violations
      expect(seriousViolations.length).toBe(0);
      expect(criticalViolations.length).toBe(0);

      // Log all violations for debugging
      if (accessibilityScanResults.violations.length > 0) {
        console.log('All violations:', JSON.stringify(accessibilityScanResults.violations, null, 2));
      }
    });

    test('should capture dark theme desktop screenshot', async ({ page }) => {
      // Ensure dark theme
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });

      // Set desktop viewport
      await page.setViewportSize({ width: 1280, height: 800 });

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Take screenshot
      await page.screenshot({
        path: `${evidenceDir}/task-12-dark-desktop.png`,
        fullPage: true,
      });

      console.log('Captured: task-12-dark-desktop.png');
    });

    test('should capture dark theme mobile screenshot', async ({ page }) => {
      // Ensure dark theme
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });

      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Take screenshot
      await page.screenshot({
        path: `${evidenceDir}/task-12-dark-mobile.png`,
        fullPage: true,
      });

      console.log('Captured: task-12-dark-mobile.png');
    });
  });

  test.describe('Reduced Motion', () => {
    test('should disable smooth scrolling under prefers-reduced-motion', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const scrollBehavior = await page.evaluate(
        () => getComputedStyle(document.documentElement).scrollBehavior,
      );
      expect(scrollBehavior).toBe('auto');
    });
  });

  test.describe('Favicon', () => {
    test('should have a favicon link with a valid href', async ({ page }) => {
      await page.goto('/');
      const href = await page.locator('link[rel="icon"]').getAttribute('href');
      expect(href).toBeTruthy();
    });
  });
});