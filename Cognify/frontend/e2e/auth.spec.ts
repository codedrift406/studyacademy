import { expect, test } from '@playwright/test';
import { loginThroughUi, registerThroughUi, uniqueEmail } from './helpers';

test('teacher can register and reach dashboard', async ({ page }) => {
  const email = uniqueEmail('teacher-ui');
  const password = 'Password123!';

  await registerThroughUi(page, {
    role: 'Teacher',
    name: 'Teacher UI',
    email,
    password,
  });

  await expect(page).toHaveURL(/\/teacher\/dashboard/);
  await expect(page.getByText(/Welcome back/i)).toBeVisible();
});

test('student can login after registration', async ({ page, request }) => {
  const email = uniqueEmail('student-login');
  const password = 'Password123!';

  const response = await request.post('http://127.0.0.1:3000/api/auth/register', {
    data: {
      name: 'Student Login',
      email,
      password,
      role: 'STUDENT',
    },
  });
  expect(response.ok()).toBeTruthy();

  await loginThroughUi(page, email, password);

  await expect(page).toHaveURL(/\/student\/dashboard/);
  await expect(page.getByText('AI Tutor Active')).toBeVisible();
});
