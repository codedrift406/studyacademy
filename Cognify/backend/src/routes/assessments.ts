import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { sendTeacherIntegrationEvent } from './integrations';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

const router = Router();
function generateCertificateCode(studentId: string, courseId: string): string {
    const shortStudent = studentId.slice(0, 6).toUpperCase();
    const shortCourse = courseId.slice(0, 6).toUpperCase();
    const stamp = Date.now().toString(36).toUpperCase();
    return `CGF-${shortCourse}-${shortStudent}-${stamp}`;
}

function parseWeakLessons(value: string | null | undefined): string[] {
    if (!value) return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
    } catch {
        return [];
    }
}

router.post('/submit', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const studentId = req.user!.id;
        const { courseId, score, weakLessons } = req.body as { courseId?: string; score?: number; weakLessons?: string[] };

        if (!courseId || typeof score !== 'number') {
            res.status(400).json({ error: 'courseId and numeric score are required.' });
            return;
        }

        if (score < 0 || score > 100) {
            res.status(400).json({ error: 'Score must be between 0 and 100.' });
            return;
        }

        const [course, enrollment] = await Promise.all([
            prisma.course.findUnique({ where: { id: courseId } }),
            prisma.enrollment.findUnique({ where: { studentId_courseId: { studentId, courseId } } }),
        ]);

        if (!course) {
            res.status(404).json({ error: 'Course not found.' });
            return;
        }

        if (!enrollment) {
            res.status(403).json({ error: 'You must be enrolled in course to submit test.' });
            return;
        }

        const passed = score >= 50;
        const certificateIssued = Boolean(course.aiGenerated && passed);
        const certificateCode = certificateIssued ? generateCertificateCode(studentId, courseId) : null;

        const assessment = await prisma.courseAssessment.upsert({
            where: { studentId_courseId: { studentId, courseId } },
            update: {
                score,
                passed,
                certificateIssued,
                certificateCode,
                weakLessons: JSON.stringify((weakLessons || []).slice(0, 20)),
                riskScore: Math.max(0, Math.min(100, Math.round((100 - score) * 0.7 + (weakLessons?.length || 0) * 6))),
            },
            create: {
                studentId,
                courseId,
                score,
                passed,
                certificateIssued,
                certificateCode,
                weakLessons: JSON.stringify((weakLessons || []).slice(0, 20)),
                riskScore: Math.max(0, Math.min(100, Math.round((100 - score) * 0.7 + (weakLessons?.length || 0) * 6))),
            },
        });

        if (passed) {
            await prisma.user.update({
                where: { id: studentId },
                data: { xp: { increment: 40 } },
            });
        }

        await prisma.notification.create({
            data: {
                userId: studentId,
                type: passed ? 'ASSESSMENT_PASSED' : 'ASSESSMENT_FAILED',
                title: passed ? 'Test passed' : 'Test result',
                message: passed
                    ? `You passed "${course.title}" with ${score}%.`
                    : `Your score for "${course.title}" is ${score}%. Review and retry.`,
            },
        });

        if (certificateIssued) {
            await sendTeacherIntegrationEvent(course.teacherId, 'CERTIFICATE_ISSUED', {
                studentId,
                courseId,
                courseTitle: course.title,
                certificateCode: certificateCode,
                score,
            });
        }

        res.json({
            assessment,
            certificate: certificateIssued
                ? {
                      studentId,
                      courseId,
                      courseTitle: course.title,
                      code: assessment.certificateCode,
                      issuedAt: assessment.updatedAt,
                  }
                : null,
        });
    } catch (error) {
        console.error('Assessment submit error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

router.get('/adaptive-question/:courseId', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const courseId = String(req.params.courseId);
        const studentId = req.user!.id;
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            include: { lessons: { orderBy: { order: 'asc' } } },
        });
        if (!course) {
            res.status(404).json({ error: 'Course not found.' });
            return;
        }
        const assessment = await prisma.courseAssessment.findUnique({
            where: { studentId_courseId: { studentId, courseId } },
        });
        const weak = parseWeakLessons(assessment?.weakLessons).filter(Boolean);
        const targetLessonTitle = weak.length ? weak[0] : (course.lessons[0]?.title || course.title);
        const distractors = course.lessons
            .map((lesson: { title: string }) => lesson.title)
            .filter((title: string) => title !== targetLessonTitle)
            .slice(0, 3);
        while (distractors.length < 3) {
            distractors.push(`Related concept ${distractors.length + 1}`);
        }
        const options = [targetLessonTitle, ...distractors].sort(() => Math.random() - 0.5);

        res.json({
            question: {
                prompt: `Choose the module most relevant to your weak topic in "${course.title}".`,
                options,
                expected: targetLessonTitle,
                weakLessons: weak,
            },
        });
    } catch (error) {
        console.error('Adaptive question error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

router.post('/adaptive-answer/:courseId', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const courseId = String(req.params.courseId);
        const studentId = req.user!.id;
        const answer = String(req.body?.answer || '');
        const expected = String(req.body?.expected || '');
        const weakLessons = Array.isArray(req.body?.weakLessons) ? (req.body.weakLessons as string[]) : [];

        const correct = answer === expected;
        const nextWeak = correct ? weakLessons.slice(1) : [expected, ...weakLessons.filter((item) => item !== expected)];

        await prisma.courseAssessment.upsert({
            where: { studentId_courseId: { studentId, courseId } },
            update: {
                weakLessons: JSON.stringify(nextWeak.slice(0, 20)),
                adaptiveState: JSON.stringify({ lastAnswerCorrect: correct, updatedAt: new Date().toISOString() }),
            },
            create: {
                studentId,
                courseId,
                score: 0,
                passed: false,
                weakLessons: JSON.stringify(nextWeak.slice(0, 20)),
                adaptiveState: JSON.stringify({ lastAnswerCorrect: correct, updatedAt: new Date().toISOString() }),
            },
        });

        res.json({ correct, nextWeak });
    } catch (error) {
        console.error('Adaptive answer error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

router.post('/issue-on-completion/:courseId', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const courseId = String(req.params.courseId);
        const studentId = req.user!.id;

        const course = await prisma.course.findUnique({
            where: { id: courseId },
            include: { lessons: { select: { id: true } } },
        });
        if (!course) {
            res.status(404).json({ error: 'Course not found.' });
            return;
        }

        const lessonIds = course.lessons.map((lesson: { id: string }) => lesson.id);
        const completedCount = await prisma.progress.count({
            where: {
                studentId,
                lessonId: { in: lessonIds },
            },
        });
        const fullyCompleted = lessonIds.length > 0 && completedCount >= lessonIds.length;
        if (!fullyCompleted) {
            res.status(400).json({ error: 'Course is not fully completed yet.' });
            return;
        }

        const existing = await prisma.courseAssessment.findUnique({
            where: { studentId_courseId: { studentId, courseId } },
        });
        const canIssue = course.aiGenerated ? Boolean(existing?.passed) : true;
        if (!canIssue) {
            res.status(400).json({ error: 'Pass final test to get certificate for AI-generated course.' });
            return;
        }

        const code = existing?.certificateCode || generateCertificateCode(studentId, courseId);
        const item = await prisma.courseAssessment.upsert({
            where: { studentId_courseId: { studentId, courseId } },
            update: { certificateIssued: true, certificateCode: code, passed: existing?.passed || false },
            create: {
                studentId,
                courseId,
                score: existing?.score || (course.aiGenerated ? 0 : 100),
                passed: existing?.passed || !course.aiGenerated,
                certificateIssued: true,
                certificateCode: code,
            },
        });

        await prisma.notification.create({
            data: {
                userId: studentId,
                type: 'CERTIFICATE_READY',
                title: 'Certificate ready',
                message: `Your certificate for "${course.title}" is ready.`,
            },
        });

        await sendTeacherIntegrationEvent(course.teacherId, 'CERTIFICATE_ISSUED', {
            studentId,
            courseId,
            courseTitle: course.title,
            certificateCode: code,
            score: item.score,
        });

        res.json({
            certificate: {
                code,
                courseId,
                courseTitle: course.title,
                issuedAt: item.updatedAt,
            },
        });
    } catch (error) {
        console.error('Issue certificate error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

router.get('/certificate/:code', async (req, res: Response) => {
    try {
        const code = String(req.params.code);
        const item = await prisma.courseAssessment.findUnique({
            where: { certificateCode: code },
            include: {
                student: { select: { id: true, name: true, email: true } },
                course: { select: { id: true, title: true } },
            },
        });

        if (!item || !item.certificateIssued) {
            res.status(404).json({ error: 'Certificate not found.' });
            return;
        }

        res.json({
            valid: true,
            certificate: {
                code,
                score: item.score,
                issuedAt: item.updatedAt,
                student: item.student,
                course: item.course,
            },
        });
    } catch (error) {
        console.error('Certificate verify error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

router.get('/certificate/:code/pdf', async (req, res: Response) => {
    try {
        const code = String(req.params.code);
        const item = await prisma.courseAssessment.findUnique({
            where: { certificateCode: code },
            include: {
                student: { select: { name: true, email: true } },
                course: { select: { title: true } },
            },
        });
        if (!item || !item.certificateIssued) {
            res.status(404).json({ error: 'Certificate not found.' });
            return;
        }

        const verifyUrl = `${req.protocol}://${req.get('host')}/verify/${code}`;
        const qrDataUrl = await QRCode.toDataURL(verifyUrl);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="cognify-certificate-${code}.pdf"`);

        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        doc.pipe(res);

        doc.rect(30, 30, 535, 780).lineWidth(2).stroke('#2ea6ff');
        doc.fontSize(28).fillColor('#0f172a').text('Cognify Certificate', 0, 90, { align: 'center' });
        doc.moveDown();
        doc.fontSize(14).fillColor('#334155').text('This certifies successful course completion', { align: 'center' });
        doc.moveDown(1.5);
        doc.fontSize(24).fillColor('#111827').text(item.student.name || item.student.email, { align: 'center' });
        doc.moveDown();
        doc.fontSize(18).fillColor('#1f2937').text(item.course.title, { align: 'center' });
        doc.moveDown(1.2);
        doc.fontSize(12).fillColor('#475569').text(`Certificate Code: ${code}`, { align: 'center' });
        doc.fontSize(12).fillColor('#475569').text(`Issued At: ${item.updatedAt.toISOString()}`, { align: 'center' });
        doc.moveDown(1.5);
        doc.image(qrDataUrl, 235, 430, { width: 120, height: 120 });
        doc.moveDown(7);
        doc.fontSize(10).fillColor('#64748b').text('Scan QR to verify authenticity', { align: 'center' });
        doc.fontSize(9).fillColor('#94a3b8').text(verifyUrl, { align: 'center' });
        doc.end();
    } catch (error) {
        console.error('Certificate PDF error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

router.get('/student/:studentId/course/:courseId', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const studentId = String(req.params.studentId);
        const courseId = String(req.params.courseId);
        if (req.user!.role === 'STUDENT' && req.user!.id !== studentId) {
            res.status(403).json({ error: 'Forbidden.' });
            return;
        }

        const assessment = await prisma.courseAssessment.findUnique({
            where: { studentId_courseId: { studentId, courseId } },
        });

        res.json({ assessment });
    } catch (error) {
        console.error('Assessment fetch error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

export default router;
