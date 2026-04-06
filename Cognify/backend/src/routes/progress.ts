import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, authMiddleware, requireSelfOrRole } from '../middleware/auth';

const router = Router();

// POST /api/progress — mark lesson as completed
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const studentId = req.user!.id;
        const { lessonId } = req.body;

        if (!lessonId) {
            return res.status(400).json({ error: 'lessonId is required' });
        }

        const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
        if (!lesson) {
            return res.status(404).json({ error: 'Lesson not found' });
        }

        const [enrollment, existing] = await Promise.all([
            prisma.enrollment.findUnique({ where: { studentId_courseId: { studentId, courseId: lesson.courseId } } }),
            prisma.progress.findUnique({ where: { studentId_lessonId: { studentId, lessonId } } }),
        ]);

        if (!enrollment) {
            return res.status(403).json({ error: 'You must be enrolled in the course to mark progress' });
        }

        if (existing) {
            return res.status(200).json({ progress: existing, message: 'Lesson already marked as completed' });
        }

        const progress = await prisma.progress.create({
            data: {
                studentId,
                lessonId,
            },
        });

        const today = new Date();
        const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        const user = await prisma.user.findUnique({
            where: { id: studentId },
            select: { xp: true, streakDays: true, lastActiveDate: true },
        });

        let gamification: { xp: number; streakDays: number } | null = null;
        if (user) {
            let streakDays = user.streakDays;
            const last = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
            const lastDay = last ? new Date(last.getFullYear(), last.getMonth(), last.getDate()) : null;
            const diffDays = lastDay ? Math.floor((dayStart.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24)) : null;

            if (diffDays === 1) {
                streakDays += 1;
            } else if (diffDays === null || diffDays > 1) {
                streakDays = 1;
            }

            const updated = await prisma.user.update({
                where: { id: studentId },
                data: {
                    xp: user.xp + 10,
                    streakDays,
                    lastActiveDate: today,
                },
                select: { xp: true, streakDays: true },
            });
            gamification = updated;
        }

        res.status(201).json({ progress, gamification });
    } catch (error) {
        console.error('Progress mark error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/progress/student/:studentId/course/:courseId — get completed lessons for student in course
router.get('/student/:studentId/course/:courseId', authMiddleware, requireSelfOrRole('studentId', 'TEACHER', 'ADMIN'), async (req, res: Response) => {
    try {
        const studentId = String(req.params.studentId);
        const courseId = String(req.params.courseId);

        const lessons = await prisma.lesson.findMany({
            where: { courseId },
            select: { id: true }
        });

        const completed = await prisma.progress.findMany({
            where: {
                studentId,
                lesson: { courseId }
            },
            select: { lessonId: true }
        });

        const completedSet = new Set(completed.map((p: { lessonId: string }) => p.lessonId));

        res.json({
            totalLessons: lessons.length,
            completedLessons: completedSet.size,
            completedIds: [...completedSet],
            progressPercent: lessons.length > 0 ? Math.round((completedSet.size / lessons.length) * 100) : 0,
        });
    } catch (error) {
        console.error('Fetch progress error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
