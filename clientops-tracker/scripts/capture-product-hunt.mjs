import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { prepareShipmentDemo } from './lib/shipment-demo.mjs';

const origin = process.env.VERIFY_URL ?? 'https://localhost:8470';
assert.equal(process.env.E2E_ALLOW_DISPOSABLE_DEMO, 'true');
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const dirty = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim();
assert.equal(dirty, '', 'Capture from a committed clean checkout; never mislabel working changes.');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const brand = await readFile('apps/web/public/brand/journal-v3.png');
assert.equal(hash(brand), '4e84301ab7fa39a2f9a80e65eebd8b494d04677149224608304f972083cd47bd');
const output = resolve('docs/product-hunt/gallery');
const evidence = resolve('test-results/product-hunt');
await mkdir(output, { recursive: true });
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || undefined });
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1270, height: 688 },
  colorScheme: 'light',
});
const page = await context.newPage();
const frames = [];
try {
  const record = await prepareShipmentDemo(origin);
  await page.goto(`${origin}/tickets/${record.ticketId}#scope`);
  await page.getByRole('button', { name: 'Light theme', exact: true }).click();
  await page.getByRole('button', { name: 'Continue as Client', exact: true }).click();
  await expect(page.getByText('Revision 2: Approved', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Accept delivery', exact: true })).toBeVisible();
  await expect(page.getByText('Resolved', { exact: true }).first()).toBeVisible();
  const servedBrand = await context.request.get(`${origin}/brand/journal-v3.png`);
  assert.equal(
    hash(await servedBrand.body()),
    hash(brand),
    'Running app must serve the selected v3.',
  );
  const resolvedBadge = await page.getByText('Resolved', { exact: true }).first().screenshot();
  const framePage = await browser.newPage({ viewport: { width: 1270, height: 760 } });
  async function capture(name, title, caption, alt, selector, includeStatus = false) {
    await page.evaluate(
      () =>
        new Promise((done) =>
          globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(done)),
        ),
    );
    await page.locator(selector).evaluate((element) => {
      globalThis.scrollTo({
        top: globalThis.scrollY + element.getBoundingClientRect().top - 96,
        behavior: 'instant',
      });
    });
    await expect(page.locator('#navigation img[src="/brand/journal-v3.png"]')).toBeVisible();
    const screenshot = await page.screenshot({ animations: 'disabled' });
    await writeFile(resolve(evidence, `source-${name}`), screenshot);
    // Editorial caption is outside an unaltered, full-width runtime viewport capture.
    await framePage.setContent(`<!doctype html><html lang="en"><meta charset="utf-8">
      <style>*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;color:#fff;background:#094c49}
      header{height:72px;padding:10px 24px;display:flex;align-items:center;justify-content:space-between;gap:20px}
      h1{margin:0;font-size:20px;line-height:25px}p{margin:3px 0 0;font-size:13px;line-height:18px}
      .preview{font-size:12px;text-align:right;white-space:nowrap}main img{display:block;width:1270px;height:688px}
      .status{display:flex;align-items:center;gap:8px;font-size:13px}.status img{height:24px;width:auto}
      </style><header><div><h1>${title}</h1><p>${caption}</p></div>
      ${includeStatus ? `<div class="status">Ticket <img alt="Resolved" src="data:image/png;base64,${resolvedBadge.toString('base64')}"></div>` : ''}
      <div class="preview">0.2.0 PREVIEW<br>Fictional client example</div></header>
      <main><img alt="${alt}" src="data:image/png;base64,${screenshot.toString('base64')}"></main></html>`);
    await framePage.locator('main img').evaluate((img) => img.decode());
    const final = await framePage.screenshot({ path: resolve(output, name) });
    assert.equal(final.readUInt32BE(16), 1270);
    assert.equal(final.readUInt32BE(20), 760);
    frames.push({
      filename: name,
      sha256: hash(final),
      width: 1270,
      height: 760,
      caption,
      alt,
      sourceRevision: revision,
      role: 'CLIENT',
      theme: 'light',
      viewport: { width: 1270, height: 688 },
      route: `/tickets/${record.ticketId}`,
      scrollTarget: selector,
      sourceScreenshotSha256: hash(screenshot),
      composition:
        '72px editorial preview caption; unaltered runtime viewport below. Ticket badge, where shown, is a separate crop from the same record.',
    });
  }
  await capture(
    '01-approved-scope.png',
    'The agreement includes active and archived shipments',
    'Revision 2 is approved. The comparison preserves what changed from revision 1.',
    'Client scope revision 2 approved, with active and archived shipment search and the previous scope comparison.',
    '#scope .space-y-4',
  );
  await capture(
    '02-awaiting-confirmation.png',
    'Shipped is not the same as accepted',
    'Release 1.5.0-demo is delivered. The client has not confirmed the agreed outcome.',
    'Resolved ticket with release 1.5.0-demo delivered, awaiting client confirmation, in the v3 branded application.',
    '#delivery',
    true,
  );
  await page.getByLabel('Request changes', { exact: true }).check();
  await page
    .getByLabel('What remains unresolved?')
    .fill('Archived NS-0921 works, but active NS-1042 still returns no result.');
  await page.getByRole('button', { name: 'Send feedback', exact: true }).click();
  await expect(page.getByText('Changes requested', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Changes requested', { exact: true })).toBeVisible();
  await expect(page.getByText('Revision 2: Approved', { exact: true })).toBeVisible();
  await expect(page.getByText('Resolved', { exact: true }).first()).toBeVisible();
  await capture(
    '03-changes-requested.png',
    'The client records what still fails',
    'After refresh: active NS-1042 still fails. Approved scope and the shipped release are retained.',
    'Persisted client Changes requested feedback reports active NS-1042 failing while archived NS-0921 works. Release delivery remains recorded.',
    '#delivery',
    true,
  );
  await framePage.setContent(`<html><body style="margin:0;font:16px Arial">
    ${['#ffffff', '#141917']
      .map(
        (
          background,
        ) => `<div style="background:${background};padding:24px;display:flex;align-items:center;gap:24px">
    ${[16, 32, 240].map((size) => `<img alt="" width="${size}" height="${size}" src="data:image/png;base64,${brand.toString('base64')}">`).join('')}</div>`,
      )
      .join('')}
    </body></html>`);
  await framePage.screenshot({ path: resolve(evidence, 'logo-sizes-light-dark.png') });
  await writeFile(
    resolve(output, 'manifest.json'),
    JSON.stringify(
      {
        sourceRevision: revision,
        workingTreeDirtyAtStart: false,
        capturedAt: new Date().toISOString(),
        previewVersion: '0.2.0 preview (unreleased)',
        canonicalLogoSha256: hash(brand),
        ticketId: record.ticketId,
        masterAndPriorGalleryPanelsAvailable: false,
        frames,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    JSON.stringify(
      {
        sourceRevision: revision,
        ticketId: record.ticketId,
        frames: frames.map((f) => ({ filename: f.filename, sha256: f.sha256 })),
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
