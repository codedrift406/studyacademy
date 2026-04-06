import { expect, test } from '@playwright/test';
import { registerThroughUi, uniqueEmail } from './helpers';

test('teacher can generate a course through AI Course Builder 2.0', async ({ page }) => {
  const email = uniqueEmail('teacher-ai-builder');
  const password = 'Password123!';

  await registerThroughUi(page, {
    role: 'Teacher',
    name: 'AI Builder Teacher',
    email,
    password,
  });

  await page.goto('/teacher/create');
  await page.getByPlaceholder(/Advanced Artificial Intelligence in Modern Education/i).fill('AI for Student Success');
  await page.getByLabel(/Target Audience/i).fill('university lecturers');
  await page.getByLabel(/Course Goal/i).fill('build practical AI-supported teaching workflows');
  await page.getByLabel(/Duration \(weeks\)/i).fill('6');
  await page.getByRole('button', { name: /Generate Course Structure/i }).click();

  await expect(page.getByText(/Course Created!/i)).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: /View Course/i }).click();
  await expect(page).toHaveURL(/\/course\//);
  await expect(page.getByText(/AI for Student Success|Fundamentals/i)).toBeVisible();
});
