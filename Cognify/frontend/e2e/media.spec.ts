import { expect, test } from '@playwright/test';
import { createCourseViaApi, registerViaApi } from './helpers';

test('teacher can upload avatar from profile', async ({ page, request }) => {
  const teacher = await registerViaApi(request, 'TEACHER', 'Teacher Avatar');

  await page.addInitScript((session) => {
    window.localStorage.setItem('user', JSON.stringify(session.user));
    window.localStorage.setItem('token', session.token);
    window.localStorage.setItem('refreshToken', session.refreshToken);
    window.localStorage.setItem('language', 'en');
    window.localStorage.setItem('theme', 'light');
  }, teacher);

  await page.goto('/teacher/profile');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'avatar.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sX6lz4AAAAASUVORK5CYII=',
      'base64'
    ),
  });
  await page.getByRole('button', { name: /Save Profile/i }).click();

  await expect(page.getByAltText('profile avatar preview')).toBeVisible();
});

test('teacher can upload course video and generate subtitles', async ({ page, request }) => {
  const teacher = await registerViaApi(request, 'TEACHER', 'Teacher Media');
  const course = await createCourseViaApi(request, teacher.token, `Media Course ${Date.now()}`, [
    {
      title: `Media Lesson ${Date.now()}`,
      content: 'Lesson content for media verification.',
    },
  ]);

  await page.addInitScript((session) => {
    window.localStorage.setItem('user', JSON.stringify(session.user));
    window.localStorage.setItem('token', session.token);
    window.localStorage.setItem('refreshToken', session.refreshToken);
    window.localStorage.setItem('language', 'en');
    window.localStorage.setItem('theme', 'light');
  }, teacher);

  await page.goto(`/course/${course.course.id}`);
  await page.locator('input[type="file"]').setInputFiles({
    name: 'lesson-video.mp4',
    mimeType: 'video/mp4',
    buffer: Buffer.from('000000206674797069736F6D0000020069736F6D69736F3261766331', 'hex'),
  });

  await page.getByRole('button', { name: /Upload video/i }).click();
  await expect(page.locator('video')).toBeVisible();

  await page.getByRole('button', { name: /Generate subtitles/i }).click();
  await expect(page.getByText(/Subtitles:/i)).toBeVisible();
});
