require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');

const COURSE_FIXTURES = [
  {
    title: 'AI-Powered Productivity for Teams',
    description: 'Learn how to deploy AI tools and workflows for higher team productivity, automation, and better decision-making.',
    language: 'en',
    targetAudience: 'Business teams, managers, and productivity coaches',
    estimatedWeeks: 5,
    learningGoals: [
      'Understand AI-assisted workflows',
      'Automate repetitive tasks with AI',
      'Build balanced team productivity systems',
    ],
    videos: [
      {
        title: 'AI Workflow for Productivity',
        url: 'https://www.youtube.com/watch?v=FwOTs4UxQS4',
      },
      {
        title: 'ChatGPT for Beginners',
        url: 'https://www.youtube.com/watch?v=uCIa6V4uF84',
      },
    ],
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
    learningGoals: [
      'Build reliable React components',
      'Use TypeScript effectively',
      'Ship apps with modern tooling',
    ],
    videos: [
      {
        title: 'React Tutorial Full Course - Beginner to Pro',
        url: 'https://www.youtube.com/watch?v=TtPXvEcE11E',
      },
      {
        title: 'React + TypeScript Tutorial',
        url: 'https://www.youtube.com/watch?v=Rh3tobg7hEo',
      },
      {
        title: 'TypeScript Full Course',
        url: 'https://www.youtube.com/watch?v=W3G4DuchKFY',
      },
    ],
    lessons: [
      { title: 'React Component Patterns', content: 'Build composable, accessible, and testable React components.' },
      { title: 'TypeScript for React', content: 'Use types, interfaces, and generics to improve developer productivity.' },
      { title: 'State Management and Effects', content: 'Handle local and remote data with hooks, context, and async effects.' },
      { title: 'Deploying Modern Frontends', content: 'Prepare apps for production with Vite, bundling, and deployment best practices.' },
    ],
  },
  {
    title: 'Project Management for Digital Teams',
    description: 'Master practical planning, coordination, communication, and delivery habits for modern product teams.',
    language: 'en',
    targetAudience: 'Project managers, team leads, and product owners',
    estimatedWeeks: 6,
    learningGoals: [
      'Plan work with realistic milestones',
      'Manage risks and blockers clearly',
      'Lead teams with communication discipline',
    ],
    videos: [
      {
        title: 'Project Management Full Course',
        url: 'https://www.youtube.com/watch?v=eZDkSNHaWh8',
      },
    ],
    lessons: [
      { title: 'Project Planning Essentials', content: 'Define scope, milestones, and delivery expectations before execution begins.' },
      { title: 'Risk and Priority Management', content: 'Identify blockers early and adjust priorities using a clear decision framework.' },
      { title: 'Team Communication Systems', content: 'Build weekly cadence, feedback loops, and stakeholder updates that keep work moving.' },
      { title: 'Quality Control and Delivery', content: 'Measure completion, improve handoffs, and close projects with strong retrospectives.' },
    ],
  },
  {
    title: 'Agronomy Foundations and Smart Farming',
    description: 'A foundational agronomy course covering soil, crops, irrigation, nutrition, and smart farming decisions.',
    language: 'ru',
    targetAudience: 'Students of agronomy and agricultural management',
    estimatedWeeks: 8,
    learningGoals: [
      'Understand soil and crop fundamentals',
      'Compare irrigation and nutrition strategies',
      'Apply smart farming methods in real scenarios',
    ],
    videos: [
      {
        title: 'What is Soil and Why is it Important?',
        url: 'https://www.youtube.com/watch?v=udseIcrUxvA',
      },
    ],
    lessons: [
      { title: 'Soil and Plant Fundamentals', content: 'Learn soil structure, plant growth stages, and the basics of field readiness.' },
      { title: 'Water, Irrigation, and Yield', content: 'Study irrigation strategies, water stress, and practical yield factors.' },
      { title: 'Plant Nutrition and Protection', content: 'Review nutrient planning, field scouting, and sustainable crop protection.' },
      { title: 'Digital Agronomy Decisions', content: 'Connect sensors, analytics, and field observations for smart farming.' },
    ],
  },
  {
    title: 'Drone Operations for Precision Agriculture',
    description: 'A practical course on drone safety, mapping, monitoring fields, and applying UAV data in modern farming.',
    language: 'en',
    targetAudience: 'Agronomy students and drone operators',
    estimatedWeeks: 6,
    learningGoals: [
      'Understand drone safety and flight planning',
      'Use aerial imagery for crop monitoring',
      'Interpret drone-based field analytics',
    ],
    videos: [
      {
        title: 'Precision Drone Mapping on a Budget',
        url: 'https://www.youtube.com/watch?v=y0TgQ8QJ5Bk',
      },
    ],
    lessons: [
      { title: 'Drone Basics and Safety', content: 'Understand UAV parts, pre-flight checks, risk zones, and legal safety basics.' },
      { title: 'Flight Planning for Fields', content: 'Plan agricultural routes, battery cycles, and survey logic for farms.' },
      { title: 'Crop Monitoring with Aerial Data', content: 'Use drone imagery to inspect crop stress, irrigation, and field variability.' },
      { title: 'Actionable Drone Reports', content: 'Turn field imagery into short reports and decisions for precision farming.' },
    ],
  },
];

async function ensureVideoAssets(prisma, course, teacherId, videos) {
  for (const video of videos) {
    const exists = await prisma.mediaAsset.findFirst({
      where: {
        courseId: course.id,
        kind: 'video_link',
        publicUrl: video.url,
      },
    });
    if (exists) continue;

    await prisma.mediaAsset.create({
      data: {
        userId: teacherId,
        courseId: course.id,
        kind: 'video_link',
        storageType: 'external',
        originalName: video.title,
        mimeType: 'text/uri-list',
        path: video.url,
        publicUrl: video.url,
      },
    });
  }
}

(async () => {
  const prisma = new PrismaClient();
  try {
    const teacher = await prisma.user.findFirst({ where: { role: { in: ['TEACHER', 'ADMIN'] } } });
    if (!teacher) {
      console.error('No TEACHER or ADMIN user found. Create a teacher account first, then rerun the seed script.');
      process.exit(1);
    }

    for (const courseData of COURSE_FIXTURES) {
      const existing = await prisma.course.findFirst({
        where: { title: courseData.title },
        include: { mediaAssets: true },
      });

      let course = existing;
      if (!existing) {
        course = await prisma.course.create({
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
      } else {
        console.log(`Skipping existing course: ${courseData.title}`);
      }

      await ensureVideoAssets(prisma, course, teacher.id, courseData.videos);
    }

    console.log('Course seeding finished.');
  } catch (error) {
    console.error('Seed error:', error.message || error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
