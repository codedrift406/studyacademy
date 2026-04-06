import express, { Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = express.Router();

// Get quizzes for a lesson
router.get('/lesson/:lessonId', async (req: Request, res: Response): Promise<void> => {
    try {
        const { lessonId } = req.params;
        const quizzes = await prisma.quiz.findMany({
            where: { lessonId: String(lessonId) },
            include: {
                questions: {
                    include: {
                        answers: {
                            select: {
                                id: true,
                                text: true,
                                isCorrect: false // Hide correct answer from students
                            }
                        }
                    }
                }
            }
        });
        res.json({ quizzes });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch quizzes' });
    }
});

// Teacher creates a quiz
router.post('/lesson/:lessonId', async (req: Request, res: Response): Promise<void> => {
    try {
        const { lessonId } = req.params;
        const { title, questions } = req.body;

        const quiz = await prisma.quiz.create({
            data: {
                title,
                lessonId: String(lessonId),
                questions: {
                    create: questions.map((q: any) => ({
                        content: q.content,
                        type: q.type || 'MULTIPLE_CHOICE',
                        answers: {
                            create: q.answers.map((a: any) => ({
                                text: a.text,
                                isCorrect: a.isCorrect
                            }))
                        }
                    }))
                }
            },
            include: {
                questions: { include: { answers: true } }
            }
        });

        res.json({ quiz });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create quiz' });
    }
});

// Student attempts a quiz
router.post('/:quizId/attempt', async (req: Request, res: Response): Promise<void> => {
    try {
        const { quizId } = req.params;
        const { studentId, answers } = req.body;

        // Fetch correct answers
        const quiz = await prisma.quiz.findUnique({
            where: { id: String(quizId) },
            include: { questions: { include: { answers: true } } }
        });

        if (!quiz) {
            res.status(404).json({ error: 'Quiz not found' });
            return;
        }

        let correctCount = 0;

        quiz.questions.forEach((q: { id: string; answers: Array<{ id: string; isCorrect: boolean }> }) => {
            const studentAnswerId = answers[q.id];
            const correctAnswer = q.answers.find((a: { id: string; isCorrect: boolean }) => a.isCorrect);
            if (correctAnswer && correctAnswer.id === studentAnswerId) {
                correctCount++;
            }
        });

        const score = (correctCount / quiz.questions.length) * 100;

        const attempt = await prisma.quizAttempt.create({
            data: {
                quizId: String(quizId),
                studentId: String(studentId),
                score
            }
        });

        res.json({ attempt, score, passed: score >= 50 }); // Generic pass mark
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to submit quiz attempt' });
    }
});

export default router;
