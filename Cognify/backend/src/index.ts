import './env';
import express from 'express';
import cors from 'cors';
import path from 'path';

// Prevent backend crashes from unhandled errors
process.on('uncaughtException', (err) => {
    console.error('CRITICAL: Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

import prisma from './lib/prisma';
import authRoutes from './routes/auth';
import courseRoutes from './routes/courses';
import enrollmentRoutes from './routes/enrollment';
import aiRoutes from './routes/ai';
import statsRoutes from './routes/stats';
import progressRoutes from './routes/progress';
import gradesRoutes from './routes/grades';
import assessmentsRoutes from './routes/assessments';
import teacherRoutes from './routes/teacher';
import profileRoutes from './routes/profile';
import notificationsRoutes from './routes/notifications';
import chatRoutes from './routes/chat';
import integrationsRoutes from './routes/integrations';
import { apiRateLimit, auditLogMiddleware, authRateLimit } from './middleware/security';
import mediaRoutes from './routes/media';
import subtitlesRoutes from './routes/subtitles';
import quizzesRoutes from './routes/quizzes';
import gamificationRoutes from './routes/gamification';
import webhooksRoutes from './routes/webhooks';

const app = express();
const port = process.env.PORT || 3000;
const uploadsDir = path.resolve(process.cwd(), 'uploads');

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));
app.use(apiRateLimit);
app.use(auditLogMiddleware);

// Routes
app.use('/api/auth', authRateLimit, authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/enroll', enrollmentRoutes);
app.use('/api/student', enrollmentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/grades', gradesRoutes);
app.use('/api/assessments', assessmentsRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/subtitles', subtitlesRoutes);
app.use('/api/quizzes', quizzesRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/webhooks', webhooksRoutes);

// Health check
app.get('/api/health', async (_req, res) => {
    try {
        await prisma.$queryRawUnsafe('SELECT 1');

        res.json({
            status: 'ok',
            database: 'connected',
        });
    } catch (error) {
        console.error('Healthcheck failed:', error);
        res.status(500).json({ status: 'error', message: 'Service checks failed' });
    }
});

async function start() {
    try {
        await prisma.$connect();
        app.listen(port, () => {
            console.log(`Cognify API running on http://localhost:${port}`);
        });
    } catch (error) {
        console.error('Failed to start API:', error);
        process.exit(1);
    }
}

void start();

process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    process.exit(0);
});
