import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const DEMO_PASSWORD = 'AccessPathDemo!2026';
const accounts = [
  { role: 'student', email: 'student.demo@accesspath.example.edu', path: '/app' },
  { role: 'volunteer', email: 'volunteer.demo@accesspath.example.edu', path: '/app/volunteer' },
  { role: 'moderator', email: 'moderator.demo@accesspath.example.edu', path: '/app/admin' },
  { role: 'campus_admin', email: 'admin.demo@accesspath.example.edu', path: '/app/admin' },
  { role: 'super_admin', email: 'superadmin.demo@accesspath.example.edu', path: '/app/super-admin' },
] as const;

async function signIn(page: Page, email: string = accounts[0].email) {
  await page.goto('/auth/signin');
  await page.getByLabel('Email Address').fill(email);
  await page.getByLabel('Password').fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
}

async function signInWithApi(page: Page, email: string) {
  const response = await page.request.post('/api/v1/auth/login', {
    data: { email, password: DEMO_PASSWORD },
  });
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  return payload.data as { token: string; user: { institutionId: string; campusId: string } };
}

test.describe('AccessPath Phase 4 end-to-end coverage', () => {
  for (const account of accounts) {
    test(`signs in with the ${account.role} role`, async ({ page }) => {
      await signIn(page, account.email);
      await expect(page).toHaveURL(new RegExp(`${account.path.replaceAll('/', '\\/')}$`));
      await expect(page.getByRole('heading').first()).toBeVisible();
    });
  }

  test('calculates a route and announces the result to assistive technology', async ({ page }) => {
    await signIn(page);
    await page.goto('/app/planner');
    await expect(page.getByRole('heading', { name: 'Smart Accessible Route Planner' })).toBeVisible();
    await page.getByRole('button', { name: 'Calculate Top-3 Accessible Routes' }).click();
    const liveRegion = page.locator('[aria-live="polite"]').first();
    await expect(liveRegion).toContainText(/Route calculated|No verified accessible route found/i, { timeout: 20_000 });
  });

  test('submits a barrier report with image evidence', async ({ page }) => {
    await signIn(page);
    await page.goto('/app/report/new');
    await page.getByLabel('Location Label').fill('North Library entry ramp');
    await page.getByLabel('Short Barrier Title').fill('Temporary ramp obstruction');
    await page.getByLabel('Detailed Description (English or বাংলা)').fill(
      'A stack of maintenance materials blocks the clear approach to the north library ramp.'
    );
    await page.locator('#rep-photo').setInputFiles('e2e/fixtures/barrier-evidence.png');
    await page.getByRole('button', { name: 'Submit Barrier Report' }).click();
    await expect(page).toHaveURL(/\/app\/reports\//, { timeout: 20_000 });
  });

  test('denies campus-admin mutation of a different campus', async ({ page }) => {
    const superAdmin = await signInWithApi(page, 'superadmin.demo@accesspath.example.edu');
    const campusAdmin = await signInWithApi(page, 'admin.demo@accesspath.example.edu');

    const created = await page.request.post('/api/v1/campuses', {
      headers: { Authorization: `Bearer ${superAdmin.token}` },
      data: {
        institutionId: superAdmin.user.institutionId,
        name: 'Phase Four Isolation Test Campus',
        shortCode: `E2E${Date.now()}`,
        city: 'Sylhet',
        description: 'Synthetic test tenant only.',
        centerLat: 24.8949,
        centerLng: 91.8687,
        defaultZoom: 17,
      },
    });
    expect(created.status()).toBe(201);
    const campus = (await created.json()).data as { id: string };

    const denied = await page.request.patch(`/api/v1/campuses/${campus.id}`, {
      headers: { Authorization: `Bearer ${campusAdmin.token}` },
      data: { name: 'Unauthorized cross-campus mutation' },
    });
    expect(denied.status()).toBe(403);
  });

  test('runs a campus-scoped, non-persistent accessibility digital-twin scenario', async ({ page }) => {
    await signIn(page, 'admin.demo@accesspath.example.edu');
    await page.goto('/app/admin/accessibility-twin');
    await expect(page.getByRole('heading', { name: 'Accessibility Digital Twin' })).toBeVisible();
    await page.locator('#twin-edge').selectOption({ index: 0 });
    await page.locator('#twin-origin').selectOption({ index: 0 });
    await page.locator('#twin-destination').selectOption({ index: 1 });
    await page.getByRole('button', { name: 'Run simulation' }).click();
    await expect(page.getByRole('heading', { name: 'Scenario results' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/verification state is preserved/i)).toBeVisible();
  });

  test('switches language and theme with accessible controls', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await signIn(page);
    const languageButton = page.getByRole('button', { name: 'Switch language between English and Bengali' });
    await languageButton.click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'bn');

    await page.getByRole('button', { name: 'Switch to light theme' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('falls back to the 2D map when WebGL is unavailable', async ({ page }) => {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (kind: string, ...args: any[]) {
        if (kind === 'webgl' || kind === 'webgl2' || kind === 'experimental-webgl') return null;
        return original.apply(this, [kind, ...args] as any);
      } as typeof HTMLCanvasElement.prototype.getContext;
    });
    await signIn(page);
    await page.goto('/app/planner');
    await page.getByRole('button', { name: '3D Animated Route' }).click();
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 20_000 });
  });

  test('saves an offline draft and syncs it after reconnecting', async ({ page, context }) => {
    await signIn(page);
    await page.goto('/app/report/new');
    await expect(page.getByLabel('Location Label')).toBeVisible();
    await context.setOffline(true);
    await page.getByLabel('Location Label').fill('Offline north entrance');
    await page.getByLabel('Short Barrier Title').fill('Offline ramp report');
    await page.getByLabel('Detailed Description (English or বাংলা)').fill(
      'Offline draft for a ramp obstruction awaiting synchronization after reconnection.'
    );
    await page.getByRole('button', { name: 'Save Offline Draft' }).click();
    await expect(page.getByText(/saved with deduplication ID/i)).toBeVisible();

    await context.setOffline(false);
    await page.goto('/app/settings');
    await expect(page.getByText(/Pending Offline Report Drafts:\s*1/)).toBeVisible();
    await page.getByRole('button', { name: 'Sync Offline Drafts Now' }).click();
    await expect(page.getByText(/Synchronized 1 offline report draft/i)).toBeVisible({ timeout: 20_000 });
  });

  test('supports keyboard operation of FAQ accordions and help dialogs', async ({ page }) => {
    await page.goto('/');
    const accordion = page.locator('button[aria-expanded]').first();
    await accordion.focus();
    await page.keyboard.press('Enter');
    await expect(accordion).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('Space');
    await expect(accordion).toHaveAttribute('aria-expanded', 'true');
    const panelId = await accordion.getAttribute('aria-controls');
    await expect(page.locator(`#${panelId}`)).toHaveAttribute('role', 'region');

    await signIn(page);
    await page.goto('/app/planner');
    await page.getByRole('button', { name: /Open help documentation for/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('button', { name: 'Close dialog' })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('link', { name: 'Full Feature Specification' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Close dialog' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('announces notification read state in the live region', async ({ page }) => {
    await signIn(page);
    await page.goto('/app/notifications');
    const markRead = page.getByRole('button', { name: 'Mark Read' }).first();
    await expect(markRead).toBeVisible();
    await markRead.click();
    await expect(page.locator('[aria-live="polite"]').first()).toContainText('Notification marked as read.');
  });

  test('runs axe-core WCAG checks on key public and authenticated pages', async ({ page }) => {
    await page.goto('/');
    const homeScan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(homeScan.violations, JSON.stringify(homeScan.violations, null, 2)).toEqual([]);

    await signIn(page);
    for (const path of ['/app/planner', '/app/report/new']) {
      await page.goto(path);
      const scan = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(scan.violations, `${path}: ${JSON.stringify(scan.violations, null, 2)}`).toEqual([]);
    }
  });
});
