import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../lib/prisma';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

function toVttTime(seconds: number): string {
    const safe = Math.max(0, seconds);
    const h = Math.floor(safe / 3600);
    const m = Math.floor((safe % 3600) / 60);
    const s = Math.floor(safe % 60);
    const ms = Math.floor((safe - Math.floor(safe)) * 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

function segmentsToVtt(segments: Array<{ start: number; end: number; text: string }>): string {
    const lines = ['WEBVTT', ''];
    segments.forEach((segment, index) => {
        lines.push(String(index + 1));
        lines.push(`${toVttTime(segment.start)} --> ${toVttTime(segment.end)}`);
        lines.push(segment.text.trim());
        lines.push('');
    });
    return lines.join('\n');
}

function buildFallbackVtt(mediaName: string, language: string): string {
    return segmentsToVtt([
        {
            start: 0,
            end: 4,
            text: `Auto subtitles generated locally for ${mediaName || 'lesson video'}.`,
        },
        {
            start: 4,
            end: 8,
            text: `Language track: ${language.toUpperCase()}.`,
        },
    ]);
}

async function transcribeWithOpenAI(filePath: string, filename: string, mimetype: string, language: string) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY is missing.');

    const buffer = fs.readFileSync(filePath);
    const form = new FormData();
    form.append('model', process.env.WHISPER_MODEL || 'whisper-1');
    form.append('response_format', 'verbose_json');
    form.append('language', language || 'en');
    form.append('file', new Blob([buffer], { type: mimetype || 'audio/mpeg' }), filename);

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}` },
        body: form,
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(`OpenAI transcription failed: ${JSON.stringify(data)}`);
    }
    return data;
}

async function transcribeWithAzure(filePath: string, filename: string, mimetype: string, language: string) {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const deployment = process.env.AZURE_OPENAI_WHISPER_DEPLOYMENT;
    const key = process.env.AZURE_OPENAI_API_KEY;
    if (!endpoint || !deployment || !key) {
        throw new Error('Azure OpenAI subtitle env vars are missing.');
    }

    const buffer = fs.readFileSync(filePath);
    const form = new FormData();
    form.append('file', new Blob([buffer], { type: mimetype || 'audio/mpeg' }), filename);
    form.append('response_format', 'verbose_json');
    form.append('language', language || 'en');

    const url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${deployment}/audio/transcriptions?api-version=2024-02-01`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'api-key': key },
        body: form,
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(`Azure transcription failed: ${JSON.stringify(data)}`);
    }
    return data;
}

router.post('/generate/:mediaAssetId', authMiddleware, requireRole('TEACHER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
    try {
        const mediaAssetId = String(req.params.mediaAssetId);
        const language = String(req.body?.language || 'en');
        const media = await prisma.mediaAsset.findUnique({ where: { id: mediaAssetId } });
        if (!media || media.kind !== 'video' || !media.courseId) {
            res.status(404).json({ error: 'Video media asset not found.' });
            return;
        }
        const course = await prisma.course.findUnique({ where: { id: media.courseId } });
        if (!course) {
            res.status(404).json({ error: 'Course not found.' });
            return;
        }
        if (req.user!.role !== 'ADMIN' && course.teacherId !== req.user!.id) {
            res.status(403).json({ error: 'Forbidden.' });
            return;
        }

        const filePath = path.resolve(media.path);
        if (!fs.existsSync(filePath)) {
            res.status(404).json({ error: 'Media file missing on disk.' });
            return;
        }

        const provider = (process.env.SUBTITLE_PROVIDER || 'openai').toLowerCase();
        let vttContent = '';
        try {
            const data =
                provider === 'azure'
                    ? await transcribeWithAzure(filePath, media.originalName || path.basename(filePath), media.mimeType || 'video/mp4', language)
                    : await transcribeWithOpenAI(filePath, media.originalName || path.basename(filePath), media.mimeType || 'video/mp4', language);

            const segments = Array.isArray(data.segments)
                ? data.segments.map((segment: any) => ({
                      start: Number(segment.start || 0),
                      end: Number(segment.end || (segment.start || 0) + 3),
                      text: String(segment.text || ''),
                  }))
                : [
                      {
                          start: 0,
                          end: 10,
                          text: String(data.text || '').slice(0, 2000),
                      },
                  ];

            vttContent = segmentsToVtt(segments);
        } catch (error) {
            if (process.env.NODE_ENV === 'production') throw error;
            vttContent = buildFallbackVtt(media.originalName || path.basename(filePath), language);
        }
        const track = await prisma.subtitleTrack.create({
            data: {
                courseId: media.courseId,
                mediaAssetId: media.id,
                language,
                provider,
                vttContent,
            },
        });

        res.json({ track });
    } catch (error) {
        console.error('Subtitle generation error:', error);
        res.status(500).json({ error: 'Internal server error during subtitle generation.' });
    }
});

router.get('/course/:courseId', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const courseId = String(req.params.courseId);
        const tracks = await prisma.subtitleTrack.findMany({
            where: { courseId },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ tracks });
    } catch (error) {
        console.error('Subtitle fetch error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

export default router;
