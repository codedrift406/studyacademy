import express, { Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = express.Router();

// Get settings for teacher
router.get('/:teacherId', async (req: Request, res: Response): Promise<void> => {
    try {
        const settings = await prisma.integrationSetting.findMany({
            where: { teacherId: String(req.params.teacherId) }
        });
        res.json({ settings });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch integrations' });
    }
});

// Configure new integration webhook
router.post('/config', async (req: Request, res: Response): Promise<void> => {
    try {
        const { teacherId, provider, webhook, enabled } = req.body;
        
        const setting = await prisma.integrationSetting.upsert({
            where: {
                teacherId_provider: {
                    teacherId: String(teacherId),
                    provider: String(provider)
                }
            },
            update: { webhook, enabled },
            create: { teacherId, provider, webhook, enabled }
        });
        
        res.json({ setting });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to configure integration' });
    }
});

// Fire webhook (Simulating dispatching data to external Discord/Telegram)
router.post('/trigger', async (req: Request, res: Response): Promise<void> => {
    try {
        const { teacherId, event, data } = req.body;
        
        const settings = await prisma.integrationSetting.findMany({
            where: { teacherId: String(teacherId), enabled: true }
        });

        const dispatchPromises = settings.map(async (setting: { provider: string; webhook: string | null }) => {
            if (!setting.webhook) return;
            try {
                // In a real app we would use fetch() to send the payload to Discord/Slack/Telegram
                console.log(`[Webhook -> ${setting.provider}] Sending event '${event}' to ${setting.webhook}`);
                // Example payload:
                // await fetch(setting.webhook, { method: 'POST', body: JSON.stringify({ event, data }) });
            } catch (err) {
                console.error(`Webhook failure to ${setting.provider}`);
            }
        });

        await Promise.all(dispatchPromises);
        res.json({ success: true, targetsNotified: settings.length });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to trigger webhooks' });
    }
});

export default router;
