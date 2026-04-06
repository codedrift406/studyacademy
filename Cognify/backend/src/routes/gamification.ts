import express, { Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = express.Router();

// Get leaderboard
router.get('/leaderboard', async (req: Request, res: Response): Promise<void> => {
    try {
        const topStudents = await prisma.user.findMany({
            where: { role: 'STUDENT' },
            orderBy: { xp: 'desc' },
            take: 10,
            select: {
                id: true,
                name: true,
                nickname: true,
                xp: true,
                streakDays: true,
                avatarUrl: true
            }
        });
        res.json({ leaderboard: topStudents });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// Get user profile gamification stats (XP, level, badges)
router.get('/student/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findUnique({
            where: { id: String(id) },
            select: {
                xp: true,
                streakDays: true,
                badges: {
                    include: { badge: true }
                }
            }
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const level = Math.floor(user.xp / 1000) + 1;
        const xpProgress = user.xp % 1000;

        res.json({
            level,
            xp: user.xp,
            xpProgress,
            streakDays: user.streakDays,
            badges: user.badges.map((ub: any) => ub.badge)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch gamification stats' });
    }
});

// Check and award badges (e.g. called after quiz pass)
router.post('/award/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { badgeName } = req.body;

        const badge = await prisma.badge.findUnique({
            where: { name: badgeName }
        });

        if (!badge) {
            res.status(404).json({ error: 'Badge not found' });
            return;
        }

        const existing = await prisma.userBadge.findUnique({
            where: {
                userId_badgeId: {
                    userId: String(id),
                    badgeId: badge.id
                }
            }
        });

        if (existing) {
            res.json({ awarded: false, message: 'Already has badge' });
            return;
        }

        await prisma.userBadge.create({
            data: {
                userId: String(id),
                badgeId: badge.id
            }
        });

        // Award XP
        await prisma.user.update({
            where: { id: String(id) },
            data: { xp: { increment: badge.xpReward } }
        });

        res.json({ awarded: true, badge });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to award badge' });
    }
});

export default router;
