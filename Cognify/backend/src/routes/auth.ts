import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { generateRefreshToken, generateToken, verifyRefreshToken } from '../middleware/auth';

const router = Router();

function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function parseRefreshExpiry(): Date {
    const days = Number(process.env.JWT_REFRESH_DAYS || 30);
    const now = new Date();
    now.setDate(now.getDate() + Math.max(1, days));
    return now;
}

async function createSession(user: { id: string; email: string; role: string }, req: Request) {
    const accessToken = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    await prisma.refreshToken.create({
        data: {
            userId: user.id,
            tokenHash: hashToken(refreshToken),
            userAgent: req.headers['user-agent'] || null,
            ipAddress: req.ip || null,
            expiresAt: parseRefreshExpiry(),
        },
    });
    return { accessToken, refreshToken };
}

function publicUser(user: {
    id: string;
    email: string;
    name: string | null;
    nickname: string | null;
    bio: string | null;
    avatarUrl: string | null;
    role: string;
    xp: number;
    streakDays: number;
}) {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        nickname: user.nickname,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        role: user.role,
        xp: user.xp,
        streakDays: user.streakDays,
    };
}

router.post('/register', async (req: Request, res: Response) => {
    try {
        const email = String(req.body.email || '').trim().toLowerCase();
        const password = String(req.body.password || '');
        const name = String(req.body.name || '').trim();
        const role = String(req.body.role || 'STUDENT').toUpperCase();

        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required.' });
            return;
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            res.status(409).json({ error: 'User with this email already exists.' });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name: name || null,
                role: role === 'TEACHER' ? 'TEACHER' : 'STUDENT',
            },
        });

        const { accessToken, refreshToken } = await createSession({ id: user.id, email: user.email, role: user.role }, req);
        res.status(201).json({
            user: publicUser(user),
            token: accessToken,
            refreshToken,
        });
    } catch (error: any) {
        console.error('Registration error details:', error);
        res.status(500).json({ error: 'Internal server error during registration.', details: error.message || error });
    }
});

router.post('/login', async (req: Request, res: Response) => {
    try {
        const email = String(req.body.email || '').trim().toLowerCase();
        const password = String(req.body.password || '');
        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required.' });
            return;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            res.status(401).json({ error: 'Invalid email or password.' });
            return;
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            res.status(401).json({ error: 'Invalid email or password.' });
            return;
        }

        const { accessToken, refreshToken } = await createSession({ id: user.id, email: user.email, role: user.role }, req);
        res.json({
            user: publicUser(user),
            token: accessToken,
            refreshToken,
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

router.post('/refresh', async (req: Request, res: Response) => {
    try {
        const refreshToken = String(req.body?.refreshToken || '');
        if (!refreshToken) {
            res.status(400).json({ error: 'refreshToken is required.' });
            return;
        }

        const decoded = verifyRefreshToken(refreshToken);
        const tokenHash = hashToken(refreshToken);
        const existing = await prisma.refreshToken.findUnique({
            where: { tokenHash },
            include: { user: true },
        });
        if (!existing || existing.revoked || existing.expiresAt < new Date()) {
            res.status(401).json({ error: 'Invalid refresh token.' });
            return;
        }
        if (existing.userId !== decoded.id) {
            res.status(401).json({ error: 'Refresh token mismatch.' });
            return;
        }

        await prisma.refreshToken.update({
            where: { tokenHash },
            data: { revoked: true },
        });

        const session = await createSession({ id: existing.user.id, email: existing.user.email, role: existing.user.role }, req);
        res.json({
            token: session.accessToken,
            refreshToken: session.refreshToken,
            user: publicUser(existing.user),
        });
    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(401).json({ error: 'Invalid or expired refresh token.' });
    }
});

router.post('/logout', async (req: Request, res: Response) => {
    try {
        const refreshToken = String(req.body?.refreshToken || '');
        if (refreshToken) {
            await prisma.refreshToken.updateMany({
                where: { tokenHash: hashToken(refreshToken) },
                data: { revoked: true },
            });
        }
        res.json({ ok: true });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

export default router;
