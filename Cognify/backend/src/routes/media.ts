import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import prisma from '../lib/prisma';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth';

const router = Router();
const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname) || '';
        const base = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        cb(null, `${base}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 },
});

function makePublicUrl(req: AuthRequest, filePath: string): string {
    const rel = filePath.replace(/\\/g, '/').split('/uploads/').pop() || filePath;
    const cdn = process.env.CDN_BASE_URL?.trim();
    if (cdn) {
        return `${cdn.replace(/\/$/, '')}/uploads/${rel}`;
    }
    return `${req.protocol}://${req.get('host')}/uploads/${rel}`;
}

router.post('/avatar', authMiddleware, upload.single('file'), async (req: AuthRequest, res: Response) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'File is required.' });
            return;
        }
        const publicUrl = makePublicUrl(req, req.file.path);
        const media = await prisma.mediaAsset.create({
            data: {
                userId: req.user!.id,
                kind: 'avatar',
                storageType: process.env.CDN_BASE_URL ? 'cdn' : 'local',
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                sizeBytes: req.file.size,
                path: req.file.path,
                publicUrl,
            },
        });
        await prisma.user.update({
            where: { id: req.user!.id },
            data: { avatarUrl: publicUrl },
        });
        res.status(201).json({ media, avatarUrl: publicUrl });
    } catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

router.post('/course/:courseId/video', authMiddleware, requireRole('TEACHER', 'ADMIN'), upload.single('file'), async (req: AuthRequest, res: Response) => {
    try {
        const courseId = String(req.params.courseId);
        if (!req.file) {
            res.status(400).json({ error: 'File is required.' });
            return;
        }
        const course = await prisma.course.findUnique({ where: { id: courseId } });
        if (!course) {
            res.status(404).json({ error: 'Course not found.' });
            return;
        }
        if (req.user!.role !== 'ADMIN' && course.teacherId !== req.user!.id) {
            res.status(403).json({ error: 'Forbidden.' });
            return;
        }

        const publicUrl = makePublicUrl(req, req.file.path);
        const media = await prisma.mediaAsset.create({
            data: {
                userId: req.user!.id,
                courseId,
                kind: 'video',
                storageType: process.env.CDN_BASE_URL ? 'cdn' : 'local',
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                sizeBytes: req.file.size,
                path: req.file.path,
                publicUrl,
            },
        });
        res.status(201).json({ media });
    } catch (error) {
        console.error('Video upload error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

router.post('/course/:courseId/video-link', authMiddleware, requireRole('TEACHER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
    try {
        const courseId = String(req.params.courseId);
        const publicUrl = String(req.body?.publicUrl || '').trim();
        const title = String(req.body?.title || 'External video').trim();

        if (!publicUrl) {
            res.status(400).json({ error: 'publicUrl is required.' });
            return;
        }

        const course = await prisma.course.findUnique({ where: { id: courseId } });
        if (!course) {
            res.status(404).json({ error: 'Course not found.' });
            return;
        }
        if (req.user!.role !== 'ADMIN' && course.teacherId !== req.user!.id) {
            res.status(403).json({ error: 'Forbidden.' });
            return;
        }

        const media = await prisma.mediaAsset.create({
            data: {
                userId: req.user!.id,
                courseId,
                kind: 'video_link',
                storageType: 'external',
                originalName: title,
                mimeType: 'text/uri-list',
                path: publicUrl,
                publicUrl,
            },
        });
        res.status(201).json({ media });
    } catch (error) {
        console.error('External video link error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

router.get('/course/:courseId', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const courseId = String(req.params.courseId);
        const assets = await prisma.mediaAsset.findMany({
            where: { courseId },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ assets });
    } catch (error) {
        console.error('Media fetch error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

export default router;
