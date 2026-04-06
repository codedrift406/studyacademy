import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                nickname: true,
                bio: true,
                avatarUrl: true,
                role: true,
                xp: true,
                streakDays: true,
                createdAt: true,
            },
        });

        if (!user) {
            res.status(404).json({ error: 'User not found.' });
            return;
        }

        res.json({ profile: user });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

router.put('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { name, nickname, bio, avatarUrl } = req.body as {
            name?: string;
            nickname?: string;
            bio?: string;
            avatarUrl?: string;
        };

        const updated = await prisma.user.update({
            where: { id: userId },
            data: {
                name: typeof name === 'string' ? name.trim().slice(0, 80) : undefined,
                nickname: typeof nickname === 'string' ? nickname.trim().slice(0, 40) : undefined,
                bio: typeof bio === 'string' ? bio.trim().slice(0, 280) : undefined,
                avatarUrl: typeof avatarUrl === 'string' ? avatarUrl.trim().slice(0, 500) : undefined,
            },
            select: {
                id: true,
                email: true,
                name: true,
                nickname: true,
                bio: true,
                avatarUrl: true,
                role: true,
                xp: true,
                streakDays: true,
            },
        });

        res.json({ profile: updated });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

export default router;
