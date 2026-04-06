import { expect, test } from '@playwright/test';
import { createCourseViaApi, registerViaApi } from './helpers';

test('student can use AI tutor actions inside a lesson', async ({ page, request }) => {
  const teacher = await registerViaApi(request, 'TEACHER', 'Teacher Tutor');
  const student = await registerViaApi(request, 'STUDENT', 'Student Tutor');
  const course = await createCourseViaApi(request, teacher.token, `Tutor Course ${Date.now()}`, [
    {
      title: `Tutor Lesson ${Date.now()}`,
      content: 'This lesson explains how adaptive tutoring supports online learning and better outcomes.',
    },
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
  }, student);

  await page.goto(`/course/${course.course.id}`);
  await page.getByRole('button', { name: /Explain simpler/i }).click();

  const tutorReply = page.getByPlaceholder(/Write your answer draft for AI feedback/i).locator('xpath=following-sibling::div[1]');
  await expect(tutorReply).toBeVisible();
  await expect(tutorReply).not.toHaveText('');
});
