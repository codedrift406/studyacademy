import { expect, type APIRequestContext, type Page } from '@playwright/test';

type Role = 'STUDENT' | 'TEACHER';

export interface SessionPayload {
  user: {
    id: string;
    email: string;
    role: string;
  };
  token: string;
  refreshToken: string;
}

export interface CoursePayload {
  course: {
    id: string;
    title: string;
    description: string | null;
    lessons: Array<{
      id: string;
      title: string;
      content: string | null;
      order: number;
    }>;
  };
}

export function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export async function preparePage(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('language', 'en');
    window.localStorage.setItem('theme', 'light');
  });
}

export async function registerViaApi(
  request: APIRequestContext,
  role: Role,
  name: string,
  email = uniqueEmail(role.toLowerCase()),
  password = 'Password123!'
): Promise<SessionPayload & { password: string }> {
  const response = await request.post('http://127.0.0.1:3000/api/auth/register', {
    data: { name, email, password, role },
  });
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as SessionPayload;
  return { ...payload, password };
}

export async function createCourseViaApi(
  request: APIRequestContext,
  token: string,
  title: string,
  lessons: Array<{ title: string; content: string }>
): Promise<CoursePayload> {
  const response = await request.post('http://127.0.0.1:3000/api/courses', {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      title,
      description: `${title} description`,
      lessons,
    },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as CoursePayload;
}

export async function registerThroughUi(
  page: Page,
  options: { role: 'Teacher' | 'Student'; name: string; email: string; password: string }
) {
  await preparePage(page);
  await page.goto('/auth');
  await page.getByRole('button', { name: /Create Account|Registration|Регистрация|Тіркелу/i }).click();
  await page.getByRole('button', { name: new RegExp(options.role, 'i') }).click();
  await page.getByLabel(/Full Name|Имя|Аты-жөні/i).fill(options.name);
  await page.getByLabel(/Email/i).fill(options.email);
  await page.getByLabel(/Password|Пароль|Құпиясөз/i).fill(options.password);
  await page.getByRole('button', { name: /Create Account|Registration|Регистрация|Тіркелу/i }).click();
  await expect(page).toHaveURL(
    options.role === 'Teacher' ? /\/teacher\/dashboard/ : /\/student\/dashboard/
  );
}

export async function loginThroughUi(page: Page, email: string, password: string) {
  await preparePage(page);
  await page.goto('/auth');
  await page.getByLabel(/Email/i).fill(email);
  await page.getByLabel(/Password|Пароль|Құпиясөз/i).fill(password);
  await page.getByRole('button', { name: /Sign In|Войти|Кіру/i }).click();
  await expect(page).not.toHaveURL(/\/auth$/);
}
