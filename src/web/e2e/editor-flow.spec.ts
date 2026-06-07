import { expect, test } from '@playwright/test';

test('shows local-auth feed shell and opens the new entry editor', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Mermaid Notes' })).toBeVisible();
  await page.getByRole('button', { name: 'New entry' }).click();

  await expect(page.getByRole('heading', { name: 'New entry' })).toBeVisible();
  await expect(page.getByPlaceholder('Write a quick Markdown summary for this diagram')).toBeVisible();
});
