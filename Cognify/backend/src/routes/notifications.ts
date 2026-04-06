import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const items = await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        const unread = items.filter((item: { read: boolean }) => !item.read).length;
        res.json({ notifications: items, unread });
    } catch (error) {
        console.error('Notifications fetch error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

router.post('/me/read-all', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        await prisma.notification.updateMany({
            where: { userId, read: false },
            data: { read: true },
        });
        res.json({ ok: true });
    } catch (error) {
        console.error('Notifications update error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

export default router;
