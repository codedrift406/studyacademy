import { expect, test } from '@playwright/test';
import { createCourseViaApi, registerThroughUi, registerViaApi, uniqueEmail } from './helpers';

test('student can enroll, complete a course, chat, and generate certificate', async ({ page, request }) => {
  const teacher = await registerViaApi(request, 'TEACHER', 'Teacher Seed');
  const courseTitle = `Course ${Date.now()}`;
  const lessonTitle = `Lesson ${Date.now()}`;
  const course = await createCourseViaApi(request, teacher.token, courseTitle, [
    {
      title: lessonTitle,
      content: 'This is the first lesson content used for E2E verification.',
    },
  ]);

  const studentEmail = uniqueEmail('student-flow');
  const studentPassword = 'Password123!';
  await registerThroughUi(page, {
    role: 'Student',
    name: 'Student Flow',
    email: studentEmail,
    password: studentPassword,
  });

  await page.goto('/student/catalog');
  await expect(page.getByRole('heading', { name: courseTitle })).toBeVisible();
  await page.getByRole('button', { name: /^Enroll$/i }).first().click();
  await expect(page.getByRole('button', { name: /Continue/i }).first()).toBeVisible();
  await page.getByRole('button', { name: /Continue/i }).first().click();

  await expect(page).toHaveURL(new RegExp(`/course/${course.course.id}`));
  await page.getByRole('button', { name: /Mark as Completed/i }).click();
  await expect(page.getByText(/Progress: 100%/i)).toBeVisible();

  await page.getByRole('button', { name: new RegExp(`^${lessonTitle}$`) }).click();
  await page.getByRole('button', { name: /Submit Test/i }).click();
  await expect(page.getByText(/Test score:/i)).toBeVisible();

  await page.getByRole('button', { name: /Generate Certificate/i }).click();
  await expect(page.getByRole('button', { name: /Verify Certificate/i })).toBeVisible();

  await page.getByPlaceholder(/Ask a question about this course/i).fill('Is there homework?');
  await page.getByRole('button', { name: /^Send$/i }).click();
  await expect(page.getByText('Is there homework?')).toBeVisible();
});
