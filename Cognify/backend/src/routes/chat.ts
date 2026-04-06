import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

router.get('/course/:courseId', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const courseId = String(req.params.courseId);
        const messages = await prisma.courseMessage.findMany({
            where: { courseId, hidden: false },
            include: {
                user: { select: { id: true, name: true, nickname: true, avatarUrl: true, role: true } },
            },
            orderBy: [{ pinned: 'desc' }, { createdAt: 'asc' }],
            take: 200,
        });
        res.json({ messages });
    } catch (error) {
        console.error('Chat fetch error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

router.post('/course/:courseId', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const courseId = String(req.params.courseId);
        const content = String(req.body?.content || '').trim();
        if (!content) {
            res.status(400).json({ error: 'Message content is required.' });
            return;
        }

        const message = await prisma.courseMessage.create({
            data: {
                courseId,
                userId: req.user!.id,
                content: content.slice(0, 1000),
            },
            include: {
                user: { select: { id: true, name: true, nickname: true, avatarUrl: true, role: true } },
            },
        });

        res.status(201).json({ message });
    } catch (error) {
        console.error('Chat post error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

router.post('/message/:messageId/pin', authMiddleware, requireRole('TEACHER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
    try {
        const messageId = String(req.params.messageId);
        const message = await prisma.courseMessage.findUnique({
            where: { id: messageId },
            include: { course: true },
        });
        if (!message) {
            res.status(404).json({ error: 'Message not found.' });
            return;
        }
        if (req.user!.role !== 'ADMIN' && message.course.teacherId !== req.user!.id) {
            res.status(403).json({ error: 'Forbidden.' });
            return;
        }

        const updated = await prisma.courseMessage.update({
            where: { id: messageId },
            data: { pinned: !message.pinned },
        });
        res.json({ message: updated });
    } catch (error) {
        console.error('Pin message error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

router.post('/message/:messageId/moderate', authMiddleware, requireRole('TEACHER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
    try {
        const messageId = String(req.params.messageId);
        const hide = Boolean(req.body?.hide);
        const message = await prisma.courseMessage.findUnique({
            where: { id: messageId },
            include: { course: true },
        });
        if (!message) {
            res.status(404).json({ error: 'Message not found.' });
            return;
        }
        if (req.user!.role !== 'ADMIN' && message.course.teacherId !== req.user!.id) {
            res.status(403).json({ error: 'Forbidden.' });
            return;
        }

        const updated = await prisma.courseMessage.update({
            where: { id: messageId },
            data: { hidden: hide, moderatedBy: req.user!.id },
        });
        res.json({ message: updated });
    } catch (error) {
        console.error('Moderate message error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

export default router;
