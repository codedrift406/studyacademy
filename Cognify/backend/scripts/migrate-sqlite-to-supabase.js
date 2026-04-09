require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { PrismaClient } = require('@prisma/client');

const sqlitePath = path.resolve(__dirname, '..', 'prisma', 'dev.db');
const targetUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!targetUrl) {
  throw new Error('DIRECT_URL or DATABASE_URL must be set before migration.');
}

const sqlite = new DatabaseSync(sqlitePath, { open: true, readOnly: true });
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: targetUrl,
    },
  },
});

const tableConfigs = [
  { table: 'User', model: 'user', dateFields: ['lastActiveDate', 'createdAt', 'updatedAt'], boolFields: [] },
  { table: 'Badge', model: 'badge', dateFields: ['createdAt'], boolFields: [] },
  { table: 'Course', model: 'course', dateFields: ['dueDate', 'createdAt', 'updatedAt'], boolFields: ['aiGenerated'] },
  { table: 'Lesson', model: 'lesson', dateFields: ['createdAt', 'updatedAt'], boolFields: [] },
  { table: 'Enrollment', model: 'enrollment', dateFields: ['enrolledAt'], boolFields: [] },
  { table: 'Grade', model: 'grade', dateFields: ['createdAt', 'updatedAt'], boolFields: [] },
  { table: 'Progress', model: 'progress', dateFields: ['completedAt'], boolFields: [] },
  { table: 'CourseAssessment', model: 'courseAssessment', dateFields: ['createdAt', 'updatedAt'], boolFields: ['passed', 'certificateIssued'] },
  { table: 'Notification', model: 'notification', dateFields: ['createdAt'], boolFields: ['read'] },
  { table: 'CourseMessage', model: 'courseMessage', dateFields: ['createdAt', 'updatedAt'], boolFields: ['pinned', 'hidden'] },
  { table: 'IntegrationSetting', model: 'integrationSetting', dateFields: ['createdAt', 'updatedAt'], boolFields: ['enabled'] },
  { table: 'RefreshToken', model: 'refreshToken', dateFields: ['expiresAt', 'createdAt'], boolFields: ['revoked'] },
  { table: 'AuditLog', model: 'auditLog', dateFields: ['createdAt'], boolFields: [] },
  { table: 'MediaAsset', model: 'mediaAsset', dateFields: ['createdAt'], boolFields: [] },
  { table: 'SubtitleTrack', model: 'subtitleTrack', dateFields: ['createdAt'], boolFields: [] },
  { table: 'Quiz', model: 'quiz', dateFields: ['createdAt', 'updatedAt'], boolFields: [] },
  { table: 'Question', model: 'question', dateFields: [], boolFields: [] },
  { table: 'Answer', model: 'answer', dateFields: [], boolFields: ['isCorrect'] },
  { table: 'QuizAttempt', model: 'quizAttempt', dateFields: ['createdAt'], boolFields: [] },
  { table: 'UserBadge', model: 'userBadge', dateFields: ['earnedAt'], boolFields: [] },
];

const deleteOrder = [
  'userBadge',
  'quizAttempt',
  'answer',
  'question',
  'quiz',
  'subtitleTrack',
  'mediaAsset',
  'courseMessage',
  'notification',
  'courseAssessment',
  'progress',
  'grade',
  'enrollment',
  'lesson',
  'course',
  'refreshToken',
  'auditLog',
  'integrationSetting',
  'badge',
  'user',
];

function normalizeDate(value) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'bigint') return new Date(Number(value));
  if (typeof value === 'string' && /^\d+$/.test(value)) return new Date(Number(value));
  return new Date(value);
}

function normalizeRow(row, config) {
  const next = { ...row };
  for (const key of config.boolFields) {
    if (next[key] !== null && next[key] !== undefined) {
      next[key] = Boolean(next[key]);
    }
  }
  for (const key of config.dateFields) {
    next[key] = normalizeDate(next[key]);
  }
  return next;
}

function loadRows(config) {
  const stmt = sqlite.prepare(`SELECT * FROM "${config.table}"`);
  return stmt.all().map((row) => normalizeRow(row, config));
}

async function main() {
  const localData = new Map();
  const localCounts = {};

  for (const config of tableConfigs) {
    const rows = loadRows(config);
    localData.set(config.model, rows);
    localCounts[config.model] = rows.length;
  }

  console.log('Local SQLite counts:', JSON.stringify(localCounts, null, 2));

  await prisma.$connect();
  await prisma.$executeRawUnsafe('CREATE SCHEMA IF NOT EXISTS cognify');

  for (const model of deleteOrder) {
    await prisma[model].deleteMany();
  }

  for (const config of tableConfigs) {
    const rows = localData.get(config.model);
    if (!rows || rows.length === 0) continue;
    await prisma[config.model].createMany({ data: rows });
    console.log(`Imported ${rows.length} rows into ${config.model}`);
  }

  const remoteCounts = {};
  for (const config of tableConfigs) {
    remoteCounts[config.model] = await prisma[config.model].count();
  }

  console.log('Remote Supabase counts:', JSON.stringify(remoteCounts, null, 2));

  const mismatches = Object.keys(localCounts).filter((key) => localCounts[key] !== remoteCounts[key]);
  if (mismatches.length > 0) {
    throw new Error(`Count mismatch after migration for: ${mismatches.join(', ')}`);
  }

  console.log('SQLite -> Supabase migration completed successfully.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    sqlite.close();
    await prisma.$disconnect().catch(() => {});
  });
