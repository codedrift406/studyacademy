require('dotenv/config');
const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  try {
    const teacher = await prisma.user.findFirst({ where: { role: { in: ['TEACHER', 'ADMIN'] } } });
    if (!teacher) {
      console.error('No TEACHER or ADMIN user found. Create a teacher account first, then rerun the seed script.');
      process.exit(1);
    }

    const courses = [
      {
        title: 'AI-Powered Productivity for Teams',
        description: 'Learn how to deploy AI tools and workflows for higher team productivity, automation, and better decision-making.',
        language: 'en',
        targetAudience: 'Business teams, managers, and productivity coaches',
        estimatedWeeks: 5,
        learningGoals: ['Understand AI-assisted workflows', 'Automate repetitive tasks with AI', 'Build balanced team productivity systems'],
        lessons: [
          { title: 'AI Fundamentals for Business', content: 'Overview of AI capabilities, common tools, and practical use cases for teams.' },
          { title: 'Automating Repetitive Work', content: 'Identify repetitive processes and apply AI-driven automation with real scenarios.' },
          { title: 'AI for Team Collaboration', content: 'Use AI assistants to improve communication, task coordination, and status reporting.' },
          { title: 'Measuring Productivity Impact', content: 'Track outcomes, avoid automation pitfalls, and keep humans in control.' },
        ],
      },
      {
        title: 'Modern Frontend Development with React and TypeScript',
        description: 'A practical course on building maintainable frontend applications using React, TypeScript, and modern tooling.',
        language: 'en',
        targetAudience: 'Frontend developers and web engineers',
        estimatedWeeks: 7,
        learningGoals: ['Build reliable React components', 'Use TypeScript effectively', 'Ship apps with modern tooling'],
        lessons: [
          { title: 'React Component Patterns', content: 'Build composable, accessible, and testable React components.' },
          { title: 'TypeScript for React', content: 'Use types, interfaces, and generics to improve developer productivity.' },
          { title: 'State Management and Effects', content: 'Handle local and remote data with hooks, context, and async effects.' },
          { title: 'Deploying Modern Frontends', content: 'Prepare apps for production with Vite, bundling, and deployment best practices.' },
        ],
      },
      {
        title: 'Ефективне управління проєктами',
        description: 'Курс про сучасні підходи до планування, комунікації та виконання проєктів.',
        language: 'ru',
        targetAudience: 'Project managers, team leads, product owners',
        estimatedWeeks: 6,
        learningGoals: ['Планировать работу команды', 'Работать с рисками и сроками', 'Улучшать коммуникацию'],
        lessons: [
          { title: 'Построение дорожной карты', content: 'Как правильно формировать задачи и планировать релизы проекта.' },
          { title: 'Управление рисками и приоритетами', content: 'Методики оценки рисков, адаптация приоритетов и быстрого реагирования.' },
          { title: 'Командная коммуникация', content: 'Организация встреч, обратная связь и работа с заинтересованными лицами.' },
          { title: 'Контроль качества и результат', content: 'Проверка прогресса, метрики и финальный демонстрационный результат.' },
        ],
      },
    ];

    for (const courseData of courses) {
      const existing = await prisma.course.findFirst({ where: { title: courseData.title } });
      if (existing) {
        console.log(`Skipping existing course: ${courseData.title}`);
        continue;
      }

      await prisma.course.create({
        data: {
          title: courseData.title,
          description: courseData.description,
          language: courseData.language,
          targetAudience: courseData.targetAudience,
          estimatedWeeks: courseData.estimatedWeeks,
          learningGoals: JSON.stringify(courseData.learningGoals),
          teacherId: teacher.id,
          lessons: {
            create: courseData.lessons.map((lesson, index) => ({
              title: lesson.title,
              content: lesson.content,
              order: index,
            })),
          },
        },
      });
      console.log(`Created course: ${courseData.title}`);
    }

    console.log('Course seeding finished.');
  } catch (error) {
    console.error('Seed error:', error.message || error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
