import { expect, test } from '@playwright/test';
import { registerThroughUi, uniqueEmail } from './helpers';

test('teacher can create a manual course and update profile', async ({ page }) => {
  const email = uniqueEmail('teacher-flow');
  const password = 'Password123!';
  const courseTitle = `Playwright Course ${Date.now()}`;

  await registerThroughUi(page, {
    role: 'Teacher',
    name: 'Flow Teacher',
    email,
    password,
  });

  await page.goto('/teacher/create');
  await page.getByRole('button', { name: /Classic Creator/i }).click();
  await page.getByLabel(/Course Title/i).fill(courseTitle);
  await page.locator('textarea').first().fill('Manual course created by E2E.');
  await page.getByPlaceholder(/Lesson Title/i).fill('Lesson One');
  await page.getByPlaceholder(/Lesson content or description/i).fill('Lesson content for testing.');
  await page.getByRole('button', { name: /Create Course Now/i }).click();

  await expect(page.getByText(/Course Created!/i)).toBeVisible();
  await page.getByRole('button', { name: /View Course/i }).click();
  await expect(page).toHaveURL(/\/course\//);
  await expect(page.getByText(courseTitle)).toBeVisible();

  await page.goto('/teacher/profile');
  await page.getByLabel(/Full name/i).fill('Flow Teacher Updated');
  await page.getByLabel(/Nickname/i).fill('mentor');
  await page.locator('textarea').fill('Testing profile updates.');
  await page.getByRole('button', { name: /Save Profile/i }).click();

  await expect(page.getByLabel(/Nickname/i)).toHaveValue('mentor');
  await expect(page.locator('textarea')).toHaveValue('Testing profile updates.');
});
