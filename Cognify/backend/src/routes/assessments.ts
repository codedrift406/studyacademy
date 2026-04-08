import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../lib/prisma';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { sendTeacherIntegrationEvent } from './integrations';
import PDFDocument from 'pdfkit';

const router = Router();
const CERTIFICATE_TEMPLATE_PATH = path.resolve(process.cwd(), 'assets', 'certificate-template.png');
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

const CERTIFICATE_COLORS = {
    blue: '#1f8bd6',
    blueSoft: '#dcecf9',
    blueDeep: '#274c77',
    navy: '#234060',
    gray: '#667085',
    graySoft: '#97a3b3',
    border: '#e7edf4',
    badgeBorder: '#c7ddf4',
    badgeFill: '#f6fbff',
};

const CERTIFICATE_FONTS = {
    regular: resolveCertificateFont([
        'C:\\Windows\\Fonts\\arial.ttf',
        'C:\\Windows\\Fonts\\segoeui.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/Library/Fonts/Arial.ttf',
    ]),
    bold: resolveCertificateFont([
        'C:\\Windows\\Fonts\\arialbd.ttf',
        'C:\\Windows\\Fonts\\segoeuib.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        '/Library/Fonts/Arial Bold.ttf',
    ]),
    italic: resolveCertificateFont([
        'C:\\Windows\\Fonts\\ariali.ttf',
        'C:\\Windows\\Fonts\\segoeuii.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf',
        '/Library/Fonts/Arial Italic.ttf',
    ]),
    boldItalic: resolveCertificateFont([
        'C:\\Windows\\Fonts\\arialbi.ttf',
        'C:\\Windows\\Fonts\\segoeuiz.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-BoldOblique.ttf',
        '/Library/Fonts/Arial Bold Italic.ttf',
    ]),
};

function resolveCertificateFont(candidates: string[]): string | null {
    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }
    return null;
}

function registerCertificateFonts(doc: InstanceType<typeof PDFDocument>) {
    if (CERTIFICATE_FONTS.regular) {
        doc.registerFont('CertificateRegular', CERTIFICATE_FONTS.regular);
    }
    if (CERTIFICATE_FONTS.bold) {
        doc.registerFont('CertificateBold', CERTIFICATE_FONTS.bold);
    }
    if (CERTIFICATE_FONTS.italic) {
        doc.registerFont('CertificateItalic', CERTIFICATE_FONTS.italic);
    }
    if (CERTIFICATE_FONTS.boldItalic) {
        doc.registerFont('CertificateBoldItalic', CERTIFICATE_FONTS.boldItalic);
    }
}

function certificateFont(weight: 'regular' | 'bold' | 'italic' | 'boldItalic'): string {
    switch (weight) {
        case 'bold':
            return CERTIFICATE_FONTS.bold ? 'CertificateBold' : 'Helvetica-Bold';
        case 'italic':
            return CERTIFICATE_FONTS.italic ? 'CertificateItalic' : 'Helvetica-Oblique';
        case 'boldItalic':
            return CERTIFICATE_FONTS.boldItalic ? 'CertificateBoldItalic' : 'Helvetica-BoldOblique';
        default:
            return CERTIFICATE_FONTS.regular ? 'CertificateRegular' : 'Helvetica';
    }
}

function stripText(value: string | null | undefined): string {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function titleCaseCourseTitle(title: string): string {
    return stripText(title).replace(/\s+/g, ' ');
}

function deriveProficiencyLine(courseTitle: string, courseDescription: string | null): string {
    const description = stripText(courseDescription);
    if (description) {
        return description.endsWith('.') ? description : `${description}.`;
    }
    const fallback = courseTitle ? `the core concepts and practical skills covered in ${courseTitle}` : 'the course curriculum';
    return `the core concepts and practical skills covered in ${fallback}.`;
}

function getCertificateTopics(course: { lessons: Array<{ title: string }> }, courseTitle: string): string[] {
    const topics = course.lessons
        .map((lesson) => stripText(lesson.title))
        .filter(Boolean)
        .slice(0, 5);

    if (topics.length > 0) {
        return topics;
    }

    return [courseTitle || 'Course curriculum'];
}

function drawCertificateBackdrop(doc: InstanceType<typeof PDFDocument>) {
    const pageWidth = 595.28;
    const pageHeight = 841.89;

    doc.save();
    doc.rect(0, 0, pageWidth, pageHeight).fill('#ffffff');
    doc.restore();

    doc.save();
    doc.lineWidth(1.2).strokeColor(CERTIFICATE_COLORS.border);
    doc.rect(14, 14, pageWidth - 28, pageHeight - 28).stroke();
    doc.restore();

    doc.save();
    doc.strokeColor(CERTIFICATE_COLORS.blueSoft);
    doc.lineWidth(0.8);
    for (let i = 0; i < 18; i += 1) {
        const y = 38 + i * 13;
        doc.moveTo(260, y);
        doc.bezierCurveTo(330, y - 36, 470, y + 34, pageWidth - 10, y - 4);
        doc.stroke();
    }
    doc.restore();

    doc.save();
    doc.fillColor('#f9fcff').opacity(0.7);
    doc.circle(535, 90, 96).fill();
    doc.restore();

    doc.save();
    doc.fillColor('#f3f8fd').opacity(0.95);
    doc.circle(548, 110, 74).fill();
    doc.restore();

    doc.save();
    doc.strokeColor('#eef4fa').lineWidth(1);
    doc.circle(95, 178, 118).stroke();
    doc.restore();
}

function drawBrandMark(doc: InstanceType<typeof PDFDocument>, x: number, y: number) {
    doc.save();
    doc.circle(x, y, 19).fill(CERTIFICATE_COLORS.blue);
    doc.font(certificateFont('bold')).fontSize(24).fillColor('#ffffff');
    doc.text('C', x - 8, y - 14, { width: 16, align: 'center' });
    doc.restore();
}

function drawCertificateHeader(doc: InstanceType<typeof PDFDocument>, courseTitle: string, recipient: string, proficiency: string) {
    const left = 44;

    drawBrandMark(doc, 84, 86);

    doc.font(certificateFont('bold')).fontSize(28).fillColor(CERTIFICATE_COLORS.blueDeep);
    doc.text('Cognify', 118, 63);
    doc.font(certificateFont('regular')).fontSize(16).fillColor(CERTIFICATE_COLORS.blue);
    doc.text('Academy', 119, 95);

    doc.font(certificateFont('bold')).fontSize(34).fillColor(CERTIFICATE_COLORS.navy);
    doc.text('Certificate of Completion', left, 165, { width: 510, align: 'left' });

    doc.font(certificateFont('italic')).fontSize(31).fillColor(CERTIFICATE_COLORS.blue);
    doc.text(recipient || 'Learner', left, 255, { width: 510, align: 'left' });

    doc.font(certificateFont('regular')).fontSize(17).fillColor('#4b5563');
    doc.text(
        `has successfully completed the ${courseTitle}`,
        left,
        315,
        { width: 515, align: 'left' }
    );

    doc.font(certificateFont('regular')).fontSize(15).fillColor('#5b6470');
    doc.text(
        `and demonstrated proficiency in ${proficiency}`,
        left,
        348,
        { width: 515, align: 'left' }
    );
}

function drawLessonList(doc: InstanceType<typeof PDFDocument>, topics: string[]) {
    const left = 58;
    const startY = 410;
    doc.font(certificateFont('regular')).fontSize(11.5).fillColor('#5a6675');

    topics.forEach((topic, index) => {
        const y = startY + index * 27;
        doc.save();
        doc.circle(left, y + 5, 2.6).fill(CERTIFICATE_COLORS.blue);
        doc.restore();
        doc.text(topic, left + 13, y, { width: 470, align: 'left' });
    });
}

function drawCertificateFooter(doc: InstanceType<typeof PDFDocument>, code: string, issuedAt: Date) {
    const badgeX = 58;
    const badgeY = 703;

    doc.save();
    doc.roundedRect(badgeX, badgeY, 104, 36, 8).lineWidth(1).fillAndStroke(CERTIFICATE_COLORS.badgeFill, CERTIFICATE_COLORS.badgeBorder);
    doc.restore();

    doc.font(certificateFont('bold')).fontSize(14).fillColor('#4f7fb0');
    doc.text('Verified', badgeX, badgeY + 10, { width: 104, align: 'center' });

    doc.font(certificateFont('regular')).fontSize(9.5).fillColor(CERTIFICATE_COLORS.graySoft);
    doc.text(`Certificate code: ${code}`, 58, 756, { width: 300, align: 'left' });
    doc.text(`Issued: ${issuedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 58, 771, {
        width: 300,
        align: 'left',
    });

    doc.save();
    doc.strokeColor('#c3ccd7').lineWidth(1);
    doc.moveTo(383, 738).lineTo(549, 738).stroke();
    doc.restore();

    doc.font(certificateFont('italic')).fontSize(21).fillColor('#6b7280');
    doc.text('Cognify Academy', 390, 700, { width: 160, align: 'center' });
    doc.font(certificateFont('regular')).fontSize(10.5).fillColor('#8b94a1');
    doc.text('Director, Cognify', 390, 742, { width: 160, align: 'center' });
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
                course: {
                    select: {
                        title: true,
                        description: true,
                        lessons: {
                            select: { title: true },
                            orderBy: { order: 'asc' },
                        },
                    },
                },
            },
        });
        if (!item || !item.certificateIssued) {
            res.status(404).json({ error: 'Certificate not found.' });
            return;
        }

        if (!fs.existsSync(CERTIFICATE_TEMPLATE_PATH)) {
            res.status(500).json({ error: 'Certificate template is missing.' });
            return;
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="cognify-certificate-${code}.pdf"`);
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        const doc = new PDFDocument({ size: [1536, 1024], margin: 0 });
        doc.pipe(res);

        doc.image(CERTIFICATE_TEMPLATE_PATH, 0, 0, { width: 1536, height: 1024 });

        const recipient = item.student.name || item.student.email;
        const courseTitle = item.course.title || 'Course';
        const courseDescription = item.course.description || 'cybersecurity fundamentals and ethical hacking practices.';
        const lessonTitles = item.course.lessons.map((lesson) => lesson.title).filter(Boolean).slice(0, 5);
        const bullets =
            lessonTitles.length > 0
                ? lessonTitles
                : [
                      'Understanding ethical hacking methodologies',
                      'Network and system vulnerability analysis',
                      'Basic penetration testing techniques',
                      'Cybersecurity risk assessment',
                      'Secure system practices',
                  ];

        doc.save();
        doc.rect(100, 315, 560, 100).fill('#ffffff');
        doc.rect(100, 420, 1320, 120).fill('#ffffff');
        doc.rect(100, 570, 720, 250).fill('#ffffff');
        doc.restore();

        doc.font('Helvetica-Oblique').fontSize(54).fillColor('#2a9bd6');
        doc.text(recipient, 122, 355, { width: 600, align: 'left' });

        doc.font('Helvetica').fontSize(26).fillColor('#555555');
        doc.text('has successfully completed the ', 122, 438, { continued: true });
        doc.font('Helvetica-BoldOblique').fontSize(26).fillColor('#404040');
        doc.text(courseTitle, { continued: true });
        doc.font('Helvetica').fontSize(26).fillColor('#555555');
        doc.text('.', { continued: false });

        doc.font('Helvetica').fontSize(24).fillColor('#5d5d5d');
        doc.text(`and demonstrated proficiency in ${courseDescription}`, 122, 484, {
            width: 1290,
            align: 'left',
        });

        doc.font('Helvetica').fontSize(17).fillColor('#666666');
        bullets.forEach((bullet, index) => {
            doc.text(`• ${bullet}`, 132, 605 + index * 40, { width: 620, align: 'left' });
        });

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
