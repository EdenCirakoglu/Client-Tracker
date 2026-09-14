import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('compact mobile filters retain URL, history and access to ticket actions', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 640 });
  await page.goto('/login');
  await expect(page.getByText('Disposable demo access', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Continue as Admin', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto('/tickets');
  await expect(page.locator('tbody a').first()).toBeInViewport();
  await expect(page.getByLabel('Ticket status and priority').first()).toBeInViewport();
  const disclosure = page.getByRole('button', { name: /^Filters/ });
  await disclosure.focus();
  await page.keyboard.press('Enter');
  await expect(disclosure).toHaveAttribute('aria-expanded', 'true');
  await page.getByLabel('Filter by status').selectOption('UNRESOLVED');
  await page.getByLabel('Filter by priority').selectOption('HIGH');
  await expect(page).toHaveURL(/status=UNRESOLVED&priority=HIGH/);
  await disclosure.click();
  await expect(page.getByLabel('Active ticket filters')).toContainText('Unresolved, High');
  await page.reload();
  await expect(page.getByLabel('Active ticket filters')).toContainText('Unresolved, High');
  await page.goBack();
  await expect(page).toHaveURL(/status=UNRESOLVED$/);
  await expect(page.getByLabel('Active ticket filters')).not.toContainText('High');
  await page.getByRole('link', { name: 'Reset filters', exact: true }).click();
  await expect(page).toHaveURL(/\/tickets$/);
  await expect(page.locator('tbody a').first()).toBeInViewport();
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await test.info().attach('mobile-filters-collapsed', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
  await disclosure.click();
  await test.info().attach('mobile-filters-expanded', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
});
