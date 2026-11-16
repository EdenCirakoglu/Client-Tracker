import { expect, type Page } from '@playwright/test';

export async function approveScope(page: Page, revision: number) {
  await page.getByRole('button', { name: `Approve revision ${revision}`, exact: true }).click();
  const review = page.getByRole('dialog', { name: `Approve revision ${revision}`, exact: true });
  const submit = review.getByRole('button', { name: 'Record scope decision', exact: true });
  await expect(submit).toBeDisabled();
  await review
    .getByRole('checkbox', {
      name: `I have reviewed the changes in revision ${revision}`,
      exact: true,
    })
    .check();
  await submit.click();
  await expect(review).toHaveCount(0);
}
