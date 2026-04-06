import { expect, test } from '@playwright/test';
import { createCourseViaApi, registerViaApi } from './helpers';

test('teacher can grade a student and see risk group update', async ({ page, request }) => {
  const teacher = await registerViaApi(request, 'TEACHER', 'Teacher Grader');
  const student = await registerViaApi(request, 'STUDENT', 'Student Risk');
  const courseTitle = `Risk Course ${Date.now()}`;
  const lessonTitle = `Risk Lesson ${Date.now()}`;
  const course = await createCourseViaApi(request, teacher.token, courseTitle, [
    { title: lessonTitle, content: 'Risk lesson content.' },
  ]);

  const enrollResponse = await request.post('http://127.0.0.1:3000/api/enroll', {
    headers: { Authorization: `Bearer ${student.token}` },
    data: { course_id: course.course.id },
  });
  expect(enrollResponse.ok()).toBeTruthy();

  await page.addInitScript((session) => {
    window.localStorage.setItem('user', JSON.stringify(session.user));
    window.localStorage.setItem('token', session.token);
    window.localStorage.setItem('refreshToken', session.refreshToken);
    window.localStorage.setItem('language', 'en');
    window.localStorage.setItem('theme', 'light');
  }, teacher);

  await page.goto('/teacher/students');
  await page.getByLabel(/Select course/i).selectOption(course.course.id);

  const scoreInput = page.getByRole('spinbutton').first();
  await scoreInput.fill('45');
  await page.getByRole('button', { name: /^Save$/i }).first().click();

  await expect(page.getByRole('cell', { name: '45' }).first()).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Student Risk' })).toBeVisible();
});
