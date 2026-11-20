import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { prepareShipmentDemo } from '../scripts/lib/shipment-demo.mjs';

async function documentTop(page: Page) {
  // Finish the record's deferred anchor positioning before a full-document capture.
  await page.evaluate(
    () =>
      new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))),
  );
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
}

test('shipment demo retains revision 2, release and resolution when the client requests changes', async ({
  page,
}) => {
  const records = await prepareShipmentDemo(process.env.VERIFY_URL ?? 'https://localhost:8443');
  const directory = resolve(process.env.E2E_SCREENSHOT_DIR ?? 'test-results/screenshots');
  await mkdir(directory, { recursive: true });
  await page.goto(`/tickets/${records.ticketId}#delivery`);
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.getByRole('button', { name: 'Continue as Client', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/tickets/${records.ticketId}#delivery$`));
  await expect(page.getByText('Revision 2: Approved', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Accept delivery', exact: true })).toBeVisible();
  await expect(page.getByText('1.5.0-demo', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('Resolved', { exact: true }).first()).toBeVisible();
  await documentTop(page);
  await page.screenshot({
    path: resolve(directory, 'shipment-demo-awaiting-client.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel('Request changes', { exact: true }).check();
  await page
    .getByLabel('What remains unresolved?')
    .fill('Archived NS-0921 works, but active NS-1042 still returns no result.');
  await expect(
    new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
      .then((r) => r.violations),
  ).resolves.toEqual([]);
  await page.getByRole('button', { name: 'Send feedback', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Changes requested', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Changes requested', { exact: true })).toBeVisible();
  await expect(page.getByText('Revision 2: Approved', { exact: true })).toBeVisible();
  await expect(page.getByText('Resolved', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('1.5.0-demo', { exact: false }).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await documentTop(page);
  await page.screenshot({
    path: resolve(directory, 'shipment-demo-changes-requested-mobile.png'),
    fullPage: true,
  });
});
