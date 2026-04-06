import { Router, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();
console.log('Stats route module loaded');

// GET /api/stats/system - quick statistics for dashboard/health
router.get('/system', async (_req, res: Response) => {
    try {
        const [users, courses, enrollments, lessons] = await Promise.all([
            prisma.user.count(),
            prisma.course.count(),
            prisma.enrollment.count(),
            prisma.lesson.count(),
        ]);

        res.json({
            userCount: users,
            courseCount: courses,
            enrollmentCount: enrollments,
            lessonCount: lessons,
        });
    } catch (error) {
        console.error('Stats route error:', error);
        res.status(500).json({ error: 'Failed to fetch stats.' });
    }
});

router.get('/recent', async (_req, res: Response) => {
    try {
        const now = new Date();
        const last7days = new Date(now);
        last7days.setDate(now.getDate() - 7);

        const [newUsers, newCourses, newEnrollments] = await Promise.all([
            prisma.user.count({ where: { createdAt: { gte: last7days } } }),
            prisma.course.count({ where: { createdAt: { gte: last7days } } }),
            prisma.enrollment.count({ where: { enrolledAt: { gte: last7days } } }),
        ]);

        res.json({
            last7days: {
                users: newUsers,
                courses: newCourses,
                enrollments: newEnrollments,
            },
        });
    } catch (error) {
        console.error('Recent stats error:', error);
        res.status(500).json({ error: 'Failed to fetch recent stats.' });
    }
});

export default router;
