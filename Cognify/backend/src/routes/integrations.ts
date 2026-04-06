import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth';

const router = Router();
const PROVIDERS = ['telegram', 'email', 'google_classroom', 'moodle'];

router.get('/me', authMiddleware, requireRole('TEACHER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
    try {
        const teacherId = req.user!.id;
        const items = await prisma.integrationSetting.findMany({
            where: { teacherId },
            orderBy: { provider: 'asc' },
        });
        res.json({ integrations: items });
    } catch (error) {
        console.error('Integration fetch error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

router.put('/me/:provider', authMiddleware, requireRole('TEACHER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
    try {
        const teacherId = req.user!.id;
        const provider = String(req.params.provider).toLowerCase();
        const enabled = Boolean(req.body?.enabled);
        const webhook = req.body?.webhook ? String(req.body.webhook).trim() : null;

        if (!PROVIDERS.includes(provider)) {
            res.status(400).json({ error: 'Unsupported provider.' });
            return;
        }

        const item = await prisma.integrationSetting.upsert({
            where: { teacherId_provider: { teacherId, provider } },
            update: { enabled, webhook },
            create: { teacherId, provider, enabled, webhook },
        });
        res.json({ integration: item });
    } catch (error) {
        console.error('Integration update error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

router.post('/me/:provider/test', authMiddleware, requireRole('TEACHER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
    try {
        const teacherId = req.user!.id;
        const provider = String(req.params.provider).toLowerCase();
        const item = await prisma.integrationSetting.findUnique({
            where: { teacherId_provider: { teacherId, provider } },
        });
        if (!item || !item.enabled || !item.webhook) {
            res.status(400).json({ error: 'Integration is not configured.' });
            return;
        }

        const payload = {
            source: 'Cognify',
            type: 'TEST_MESSAGE',
            provider,
            text: 'Cognify integration test message.',
            timestamp: new Date().toISOString(),
        };

        const response = await fetch(item.webhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        res.json({ ok: response.ok, status: response.status });
    } catch (error) {
        console.error('Integration test error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

export async function sendTeacherIntegrationEvent(teacherId: string, type: string, data: Record<string, unknown>) {
    try {
        const items = await prisma.integrationSetting.findMany({
            where: { teacherId, enabled: true },
        });
        await Promise.all(
            items
                .filter((item: { webhook: string | null }) => Boolean(item.webhook))
                .map((item: { webhook: string | null; provider: string }) =>
                    fetch(String(item.webhook), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            source: 'Cognify',
                            provider: item.provider,
                            type,
                            data,
                            timestamp: new Date().toISOString(),
                        }),
                    }).catch(() => null),
                ),
        );
    } catch {
        // integration errors are non-critical
    }
}

export default router;
