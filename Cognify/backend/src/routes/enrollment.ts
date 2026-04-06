import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, authMiddleware, requireSelfOrRole } from '../middleware/auth';

const router = Router();

function parseWeakLessons(value: string | null | undefined): string[] {
    if (!value) return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map((item) => String(item)).filter(Boolean) : [];
    } catch {
        return [];
    }
}

type CourseAssessmentSummary = {
    courseId: string;
    score: number;
    weakLessons: string | null;
};

type EnrollmentCourseRow = {
    studentId: string;
    courseId: string;
    enrolledAt: Date;
    course: {
        id: string;
        title: string;
        description: string | null;
        teacher: {
            id: string;
            name: string | null;
            email: string;
        };
        lessons: Array<{
            id: string;
            title: string;
            order?: number;
        }>;
    };
};

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const studentId = req.user!.id;
        const { course_id } = req.body;

        if (!course_id) {
            res.status(400).json({ error: 'course_id is required.' });
            return;
        }

        const course = await prisma.course.findUnique({ where: { id: course_id } });
        if (!course) {
            res.status(404).json({ error: 'Course not found.' });
            return;
        }

        const existing = await prisma.enrollment.findUnique({
            where: { studentId_courseId: { studentId, courseId: course_id } },
        });
        if (existing) {
            res.status(409).json({ error: 'Already enrolled.' });
            return;
        }

        const enrollment = await prisma.enrollment.create({
            data: { studentId, courseId: course_id },
        });

        res.status(201).json({ enrollment });
    } catch (error) {
        console.error('Enrollment error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

router.get('/courses/:studentId', authMiddleware, requireSelfOrRole('studentId', 'TEACHER', 'ADMIN'), async (req, res: Response) => {
    try {
        const studentId = req.params.studentId as string;
        const page = Math.max(Number(req.query.page || 1), 1);
        const limit = Math.min(Math.max(Number(req.query.limit || 20), 5), 100);
        const offset = (page - 1) * limit;

        const [total, enrollments] = await Promise.all([
            prisma.enrollment.count({ where: { studentId } }),
            prisma.enrollment.findMany({
                where: { studentId },
                include: {
                    course: {
                        include: {
                            teacher: { select: { id: true, name: true, email: true } },
                            lessons: { select: { id: true, title: true, order: true }, orderBy: { order: 'asc' } },
                        },
                    },
                },
                orderBy: { enrolledAt: 'desc' },
                skip: offset,
                take: limit,
            }),
        ]);

        const lessonIds = enrollments.flatMap((item) => item.course.lessons.map((lesson) => lesson.id));
        const courseIds = enrollments.map((item) => item.course.id);
        const [progressRows, assessments] = await Promise.all([
            lessonIds.length
                ? prisma.progress.findMany({
                      where: { studentId, lessonId: { in: lessonIds } },
                      include: { lesson: { select: { courseId: true } } },
                  })
                : [],
            courseIds.length ? prisma.courseAssessment.findMany({ where: { studentId, courseId: { in: courseIds } } }) : [],
        ]);

        const progressByCourse = new Map<string, number>();
        for (const row of progressRows) {
            progressByCourse.set(row.lesson.courseId, (progressByCourse.get(row.lesson.courseId) || 0) + 1);
        }
        const assessmentsByCourse = new Map<string, CourseAssessmentSummary>(
            assessments.map((item: CourseAssessmentSummary) => [item.courseId, item]),
        );

        res.json({
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
            courses: enrollments.map((e: EnrollmentCourseRow) => ({
                id: e.course.id,
                title: e.course.title,
                description: e.course.description,
                teacher_name: e.course.teacher.name || e.course.teacher.email,
                lessons: e.course.lessons,
                progressPercent: e.course.lessons.length
                    ? Math.round(((progressByCourse.get(e.course.id) || 0) / e.course.lessons.length) * 100)
                    : 0,
                latestScore: assessmentsByCourse.get(e.course.id)?.score ?? null,
                weakLessons: parseWeakLessons(assessmentsByCourse.get(e.course.id)?.weakLessons),
                enrolledAt: e.enrolledAt,
            })),
        });
    } catch (error) {
        console.error('Fetch student courses error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

router.get('/recommendations/:studentId', authMiddleware, requireSelfOrRole('studentId', 'TEACHER', 'ADMIN'), async (req, res: Response) => {
    try {
        const studentId = req.params.studentId as string;
        const enrollments = await prisma.enrollment.findMany({
            where: { studentId },
            include: {
                course: {
                    include: {
                        teacher: { select: { id: true, name: true, email: true } },
                        lessons: { select: { id: true, title: true }, orderBy: { order: 'asc' } },
                    },
                },
            },
            orderBy: { enrolledAt: 'desc' },
        });

        const courseIds = enrollments.map((item) => item.courseId);
        const lessonIds = enrollments.flatMap((item) => item.course.lessons.map((lesson) => lesson.id));

        const [progressRows, grades, assessments, catalogCourses] = await Promise.all([
            lessonIds.length
                ? prisma.progress.findMany({
                      where: { studentId, lessonId: { in: lessonIds } },
                      include: { lesson: { select: { courseId: true } } },
                  })
                : [],
            lessonIds.length
                ? prisma.grade.findMany({
                      where: { studentId, lessonId: { in: lessonIds } },
                      include: { lesson: { select: { courseId: true } } },
                  })
                : [],
            courseIds.length ? prisma.courseAssessment.findMany({ where: { studentId, courseId: { in: courseIds } } }) : [],
            prisma.course.findMany({
                where: courseIds.length ? { id: { notIn: courseIds } } : undefined,
                include: {
                    teacher: { select: { name: true, email: true } },
                    lessons: { select: { id: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: 6,
            }),
        ]);

        const progressByCourse = new Map<string, number>();
        for (const row of progressRows) {
            progressByCourse.set(row.lesson.courseId, (progressByCourse.get(row.lesson.courseId) || 0) + 1);
        }

        const gradesByCourse = new Map<string, { total: number; count: number }>();
        for (const grade of grades) {
            const current = gradesByCourse.get(grade.lesson.courseId) || { total: 0, count: 0 };
            gradesByCourse.set(grade.lesson.courseId, { total: current.total + grade.score, count: current.count + 1 });
        }

        const assessmentsByCourse = new Map<string, CourseAssessmentSummary>(
            assessments.map((item: CourseAssessmentSummary) => [item.courseId, item]),
        );
        const focusAreas = new Set<string>();

        const actionPlan = enrollments
            .map((item: EnrollmentCourseRow) => {
                const totalLessons = item.course.lessons.length;
                const completedLessons = progressByCourse.get(item.course.id) || 0;
                const progressPercent = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
                const scoreAggregate = gradesByCourse.get(item.course.id);
                const averageGrade = scoreAggregate?.count ? Math.round((scoreAggregate.total / scoreAggregate.count) * 100) / 100 : null;
                const assessment = assessmentsByCourse.get(item.course.id);
                const weakLessons = parseWeakLessons(assessment?.weakLessons);
                weakLessons.forEach((lesson) => focusAreas.add(lesson));

                let priority: 'high' | 'medium' | 'low' = 'low';
                let message = 'Keep moving at the current pace.';

                if ((averageGrade !== null && averageGrade < 50) || progressPercent < 40) {
                    priority = 'high';
                    message = weakLessons.length
                        ? `Revisit ${weakLessons.slice(0, 2).join(', ')} and retry the adaptive practice.`
                        : 'Complete the next lesson and ask AI Tutor to explain the hardest topic.';
                } else if ((averageGrade !== null && averageGrade < 70) || progressPercent < 75) {
                    priority = 'medium';
                    message = weakLessons.length
                        ? `Focus on ${weakLessons[0]} before moving to the next assessment.`
                        : 'Complete one more lesson and do a short self-check quiz.';
                }

                return {
                    courseId: item.course.id,
                    courseTitle: item.course.title,
                    progressPercent,
                    averageGrade,
                    priority,
                    message,
                };
            })
            .sort((a: { priority: 'high' | 'medium' | 'low' }, b: { priority: 'high' | 'medium' | 'low' }) => {
                const order = { high: 3, medium: 2, low: 1 };
                return order[b.priority] - order[a.priority];
            });

        const recommendedCourses = catalogCourses.slice(0, 3).map((course: { id: string; title: string; description: string | null; teacher: { name: string | null; email: string }; lessons: Array<{ id: string }> }) => ({
            id: course.id,
            title: course.title,
            description: course.description,
            teacherName: course.teacher.name || course.teacher.email,
            lessonCount: course.lessons.length,
            reason:
                focusAreas.size > 0
                    ? `Suggested to strengthen ${Array.from(focusAreas).slice(0, 2).join(' and ')}.`
                    : 'Suggested as the next course to expand your learning path.',
        }));

        res.json({
            focusAreas: Array.from(focusAreas).slice(0, 5),
            actionPlan: actionPlan.slice(0, 5),
            recommendedCourses,
        });
    } catch (error) {
        console.error('Student recommendations error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

router.delete('/:courseId', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const studentId = req.user!.id;
        const courseId = req.params.courseId as string;

        await prisma.enrollment.delete({
            where: { studentId_courseId: { studentId, courseId } },
        });

        res.json({ message: 'Successfully unenrolled.' });
    } catch (error) {
        console.error('Unenroll error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

export default router;
