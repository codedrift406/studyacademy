import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

router.get('/overview/:teacherId', authMiddleware, requireRole('TEACHER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
    try {
        const teacherId = String(req.params.teacherId);
        if (req.user!.role !== 'ADMIN' && req.user!.id !== teacherId) {
            res.status(403).json({ error: 'Forbidden.' });
            return;
        }

        const teacherCourses = await prisma.course.findMany({
            where: { teacherId },
            include: {
                lessons: { select: { id: true } },
                _count: { select: { enrollments: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        const courseIds = teacherCourses.map((course: { id: string }) => course.id);
        const lessonIds = teacherCourses.flatMap((course) => course.lessons.map((lesson: { id: string }) => lesson.id));

        const enrollments = courseIds.length
            ? await prisma.enrollment.findMany({
                  where: { courseId: { in: courseIds } },
                  include: {
                      student: { select: { id: true, name: true, email: true } },
                      course: { select: { id: true, title: true, dueDate: true } },
                  },
              })
            : [];

        const grades = lessonIds.length
            ? await prisma.grade.findMany({
                  where: {
                      lessonId: { in: lessonIds },
                      studentId: { in: enrollments.map((item: { studentId: string }) => item.studentId) },
                  },
                  include: { lesson: { select: { courseId: true } } },
              })
            : [];

        const progressRows = courseIds.length
            ? await prisma.progress.findMany({
                  where: { lesson: { courseId: { in: courseIds } } },
                  include: { lesson: { select: { courseId: true } } },
                  orderBy: { completedAt: 'desc' },
              })
            : [];

        const lastActivityByStudentCourse = new Map<string, Date>();
        const progressCountByStudentCourse = new Map<string, number>();
        for (const row of progressRows) {
            const key = `${row.studentId}:${row.lesson.courseId}`;
            if (!lastActivityByStudentCourse.has(key)) {
                lastActivityByStudentCourse.set(key, row.completedAt);
            }
            progressCountByStudentCourse.set(key, (progressCountByStudentCourse.get(key) || 0) + 1);
        }

        const aggregateByStudentCourse = new Map<string, { total: number; count: number }>();
        for (const grade of grades) {
            const key = `${grade.studentId}:${grade.lesson.courseId}`;
            const current = aggregateByStudentCourse.get(key) || { total: 0, count: 0 };
            aggregateByStudentCourse.set(key, { total: current.total + grade.score, count: current.count + 1 });
        }

        const riskStudents = enrollments
            .map((enrollment: { studentId: string; courseId: string; student: { id: string; name: string | null; email: string }; course: { id: string; title: string; dueDate: Date | null } }) => {
                const key = `${enrollment.studentId}:${enrollment.courseId}`;
                const aggregate = aggregateByStudentCourse.get(key);
                const averageScore = aggregate && aggregate.count > 0 ? Math.round((aggregate.total / aggregate.count) * 100) / 100 : null;
                const course = teacherCourses.find((c: { id: string; lessons: Array<{ id: string }> }) => c.id === enrollment.courseId);
                const totalLessons = course?.lessons.length || 0;
                const completedLessons = progressCountByStudentCourse.get(key) || 0;
                const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
                const lastActiveAt = lastActivityByStudentCourse.get(key) || null;
                const now = new Date();
                const daysSinceActive = lastActiveAt
                    ? Math.max(0, Math.floor((now.getTime() - new Date(lastActiveAt).getTime()) / (1000 * 60 * 60 * 24)))
                    : 14;
                const gradePenalty = averageScore === null ? 40 : Math.max(0, 100 - averageScore) * 0.45;
                const activityPenalty = Math.min(30, daysSinceActive * 3);
                const progressPenalty = Math.max(0, 100 - progressPercent) * 0.25;

                let deadlinePenalty = 0;
                if (enrollment.course.dueDate) {
                    const daysToDeadline = Math.floor((new Date(enrollment.course.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    if (daysToDeadline < 0 && progressPercent < 100) {
                        deadlinePenalty = 25;
                    } else if (daysToDeadline <= 7 && progressPercent < 70) {
                        deadlinePenalty = 15;
                    }
                }
                const riskScore = Math.min(100, Math.round(gradePenalty + activityPenalty + progressPenalty + deadlinePenalty));
                const isRisk = riskScore >= 50;

                return {
                    studentId: enrollment.student.id,
                    studentName: enrollment.student.name || enrollment.student.email,
                    studentEmail: enrollment.student.email,
                    courseId: enrollment.course.id,
                    courseTitle: enrollment.course.title,
                    averageScore,
                    riskScore,
                    risk: isRisk,
                    progressPercent,
                    recommendation:
                        riskScore >= 75
                            ? 'Urgent intervention: assign revision lesson and 1:1 meeting.'
                            : 'Send targeted recap and quick reassessment.',
                    lastActiveAt,
                };
            })
            .filter((item: { risk: boolean }) => item.risk)
            .sort((a: { riskScore: number }, b: { riskScore: number }) => b.riskScore - a.riskScore);

        const averageScore =
            grades.length > 0 ? Math.round((grades.reduce((sum: number, grade: { score: number }) => sum + grade.score, 0) / grades.length) * 100) / 100 : null;
        const completionRate =
            enrollments.length > 0
                ? Math.round(
                      (enrollments.reduce((sum: number, enrollment: { studentId: string; courseId: string }) => {
                          const course = teacherCourses.find((item: { id: string; lessons: Array<{ id: string }> }) => item.id === enrollment.courseId);
                          const totalLessons = course?.lessons.length || 0;
                          const completedLessons = progressCountByStudentCourse.get(`${enrollment.studentId}:${enrollment.courseId}`) || 0;
                          return sum + (totalLessons ? completedLessons / totalLessons : 0);
                      }, 0) /
                          enrollments.length) *
                          100
                  )
                : 0;

        const weakTopicMap = new Map<string, number>();
        for (const assessment of courseIds.length
            ? await prisma.courseAssessment.findMany({ where: { courseId: { in: courseIds } } })
            : []) {
            if (!assessment.weakLessons) continue;
            try {
                const parsed = JSON.parse(assessment.weakLessons);
                if (Array.isArray(parsed)) {
                    for (const lesson of parsed) {
                        const key = String(lesson);
                        weakTopicMap.set(key, (weakTopicMap.get(key) || 0) + 1);
                    }
                }
            } catch {
                // ignore malformed assessment payload
            }
        }
        const weakTopics = Array.from(weakTopicMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([lessonTitle, count]: [string, number]) => ({ lessonTitle, count }));

        const totalStudents = new Set(enrollments.map((item: { studentId: string }) => item.studentId)).size;
        const totalEnrollments = enrollments.length;

        res.json({
            totalCourses: teacherCourses.length,
            aiCourseCount: teacherCourses.filter((course: { aiGenerated: boolean }) => course.aiGenerated).length,
            totalStudents,
            totalEnrollments,
            averageScore,
            completionRate,
            riskCount: riskStudents.length,
            riskStudents,
            weakTopics,
        });
    } catch (error) {
        console.error('Teacher overview error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

export default router;
