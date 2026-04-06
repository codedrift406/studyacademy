import { test, expect } from '@playwright/test';

test('public certificate verification page handles unknown code', async ({ page }) => {
  await page.goto('/verify/UNKNOWN-CODE-12345');
  await expect(page.getByText(/Cognify Certificate Verification/i)).toBeVisible();
});
