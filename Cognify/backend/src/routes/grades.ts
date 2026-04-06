import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

router.post('/', authMiddleware, requireRole('TEACHER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
    try {
        const { studentId, lessonId, score, feedback } = req.body as {
            studentId?: string;
            lessonId?: string;
            score?: number;
            feedback?: string;
        };

        if (!studentId || !lessonId || typeof score !== 'number') {
            res.status(400).json({ error: 'studentId, lessonId and numeric score are required.' });
            return;
        }

        if (score < 0 || score > 100) {
            res.status(400).json({ error: 'Score must be between 0 and 100.' });
            return;
        }

        const lesson = await prisma.lesson.findUnique({
            where: { id: lessonId },
            include: { course: true },
        });

        if (!lesson) {
            res.status(404).json({ error: 'Lesson not found.' });
            return;
        }

        if (req.user!.role !== 'ADMIN' && lesson.course.teacherId !== req.user!.id) {
            res.status(403).json({ error: 'You can grade only your own course lessons.' });
            return;
        }

        const enrollment = await prisma.enrollment.findUnique({
            where: { studentId_courseId: { studentId, courseId: lesson.courseId } },
        });
        if (!enrollment) {
            res.status(400).json({ error: 'Student is not enrolled in this course.' });
            return;
        }

        const grade = await prisma.grade.upsert({
            where: { studentId_lessonId: { studentId, lessonId } },
            update: { score, feedback: feedback || null },
            create: { studentId, lessonId, score, feedback: feedback || null },
        });

        if (score < 50) {
            await prisma.notification.createMany({
                data: [
                    {
                        userId: studentId,
                        type: 'RISK_ALERT',
                        title: 'Risk alert',
                        message: `Your score for "${lesson.title}" is ${score}%. Please review this lesson.`,
                    },
                    {
                        userId: lesson.course.teacherId,
                        type: 'RISK_ALERT',
                        title: 'Student at risk',
                        message: `Student score ${score}% in "${lesson.title}".`,
                    },
                ],
            });
        }

        res.json({ grade });
    } catch (error) {
        console.error('Grade upsert error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

router.get('/course/:courseId', authMiddleware, requireRole('TEACHER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
    try {
        const courseId = String(req.params.courseId);
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            include: {
                lessons: { select: { id: true, title: true, order: true }, orderBy: { order: 'asc' } },
            },
        });

        if (!course) {
            res.status(404).json({ error: 'Course not found.' });
            return;
        }

        if (req.user!.role !== 'ADMIN' && course.teacherId !== req.user!.id) {
            res.status(403).json({ error: 'Forbidden.' });
            return;
        }

        const enrollments = await prisma.enrollment.findMany({
            where: { courseId },
            include: { student: { select: { id: true, name: true, email: true } } },
            orderBy: { enrolledAt: 'asc' },
        });

        const lessonIds = course.lessons.map((lesson: { id: string }) => lesson.id);
        const grades = lessonIds.length
            ? await prisma.grade.findMany({
                  where: {
                      lessonId: { in: lessonIds },
                      studentId: { in: enrollments.map((enrollment: { studentId: string }) => enrollment.studentId) },
                  },
              })
            : [];

        const byStudent = new Map<string, { total: number; count: number }>();
        const gradeMap = new Map<string, number>();
        for (const grade of grades) {
            const current = byStudent.get(grade.studentId) || { total: 0, count: 0 };
            byStudent.set(grade.studentId, { total: current.total + grade.score, count: current.count + 1 });
            gradeMap.set(`${grade.studentId}:${grade.lessonId}`, grade.score);
        }

        const students = enrollments.map((enrollment: { studentId: string; student: { id: string; name: string | null; email: string } }) => {
            const aggregate = byStudent.get(enrollment.studentId);
            const averageScore = aggregate && aggregate.count > 0 ? Math.round((aggregate.total / aggregate.count) * 100) / 100 : null;
            return {
                student: enrollment.student,
                averageScore,
                risk: averageScore !== null && averageScore < 50,
                grades: course.lessons.map((lesson) => ({
                    lessonId: lesson.id,
                    lessonTitle: lesson.title,
                    score: gradeMap.get(`${enrollment.studentId}:${lesson.id}`) ?? null,
                })),
            };
        });

        res.json({
            course: { id: course.id, title: course.title, lessons: course.lessons },
            students,
        });
    } catch (error) {
        console.error('Fetch course grades error:', error);
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

        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: {
                id: true,
                title: true,
                teacherId: true,
                lessons: { select: { id: true, title: true }, orderBy: { order: 'asc' } },
            },
        });

        if (!course) {
            res.status(404).json({ error: 'Course not found.' });
            return;
        }

        if (req.user!.role === 'TEACHER' && req.user!.id !== course.teacherId) {
            res.status(403).json({ error: 'Forbidden.' });
            return;
        }

        const grades = await prisma.grade.findMany({
            where: {
                studentId,
                lessonId: { in: course.lessons.map((lesson: { id: string }) => lesson.id) },
            },
        });

        const total = grades.reduce((acc: number, item: { score: number }) => acc + item.score, 0);
        const averageScore = grades.length ? Math.round((total / grades.length) * 100) / 100 : null;

        const gradeByLesson = new Map<string, { score: number; feedback: string | null }>(
            grades.map((grade: { lessonId: string; score: number; feedback: string | null }) => [grade.lessonId, grade]),
        );

        res.json({
            course: { id: course.id, title: course.title },
            averageScore,
            gradedLessons: grades.length,
            lessons: course.lessons.map((lesson: { id: string; title: string }) => ({
                lessonId: lesson.id,
                lessonTitle: lesson.title,
                score: gradeByLesson.get(lesson.id)?.score ?? null,
                feedback: gradeByLesson.get(lesson.id)?.feedback ?? null,
            })),
        });
    } catch (error) {
        console.error('Fetch student grades error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

export default router;
