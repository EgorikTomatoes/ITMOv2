import { expect, test } from '@playwright/test';

const market = [
  { symbol: 'BTC', name: 'Bitcoin', price: 68000, change24h: 2.4, color: '#f7931a' },
  { symbol: 'ETH', name: 'Ethereum', price: 3600, change24h: -0.8, color: '#627eea' },
];

const users = [{ id: 'u1', name: 'Egor', avatar: 'EC' }];
const user = { id: 'u1', name: 'Egor', avatar: 'EC', cash: 10000, assets: {} };
const alerts = [
  { id: 'a1', userId: 'u1', symbol: 'BTC', condition: 'above', targetPrice: 75000, status: 'active', createdAt: '2026-11-22T12:00:00.000Z' },
  { id: 'a2', userId: 'u1', symbol: 'ETH', condition: 'below', targetPrice: 3200, status: 'active', createdAt: '2026-11-22T11:42:00.000Z' },
];

async function mockApi(page) {
  await page.route('**/api/**', async (route) => {
    const { pathname } = new URL(route.request().url());
    let body;

    if (pathname === '/api/market') body = market;
    else if (pathname === '/api/users') body = users;
    else if (pathname === '/api/users/u1') body = user;
    else if (pathname === '/api/notifications') body = [];
    else if (pathname === '/api/alerts') body = alerts;
    else body = {};

    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
}

async function openAlerts(page, viewport) {
  await page.setViewportSize(viewport);
  await mockApi(page);
  await page.goto('/alerts');
  await expect(page.getByRole('heading', { name: 'Ценовые уведомления' })).toBeVisible();
  await expect(page.getByText('2 активных', { exact: true })).toBeVisible();
}

test('desktop соответствует утверждённому визуальному эталону', async ({ page }) => {
  await openAlerts(page, { width: 1440, height: 900 });

  await expect(page).toHaveScreenshot('price-alerts-desktop.png', { fullPage: true });
});

test('mobile использует карточки и соответствует визуальному эталону', async ({ page }) => {
  await openAlerts(page, { width: 390, height: 844 });

  await expect(page.locator('table')).toBeHidden();
  await expect(page.locator('article')).toHaveCount(2);
  await expect(page).toHaveScreenshot('price-alerts-mobile.png', { fullPage: true });
});

test('ключевые размеры, цвета и фокус совпадают с дизайн-токенами', async ({ page }) => {
  await openAlerts(page, { width: 1440, height: 900 });

  const createButton = page.getByRole('button', { name: 'Создать уведомление' });
  const activeBadge = page.getByText('2 активных', { exact: true });

  await expect(createButton).toHaveCSS('height', '44px');
  await expect(createButton).toHaveCSS('background-color', 'oklch(0.89482 0.209645 126.603)');
  await expect(activeBadge).toHaveCSS('height', '32px');

  // Keyboard modality makes :focus-visible active, as it is for a real keyboard user.
  await page.keyboard.press('Tab');
  await createButton.focus();
  await expect(createButton).toHaveCSS('outline-width', '3px');
  await expect(createButton).toHaveCSS('outline-color', 'rgb(184, 244, 61)');
});
