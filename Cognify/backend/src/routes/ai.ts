import { Router, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth';
import prisma from '../lib/prisma';

const upload = multer({ dest: 'uploads/' });

const router = Router();

const libraryCatalog = [
    {
        title: 'Precision Agriculture Basics',
        language: 'en',
        type: 'book',
        source: 'Open educational agronomy reference',
        summary: 'Introduces data-driven farming, crop monitoring, and precision input planning.',
        tags: ['agronomy', 'smart farming', 'crop analytics'],
    },
    {
        title: 'Drone Mapping for Agriculture',
        language: 'en',
        type: 'guide',
        source: 'UAV field operations manual',
        summary: 'Explains drone surveys, mapping routes, imagery capture, and field inspection workflows.',
        tags: ['drone', 'mapping', 'agriculture'],
    },
    {
        title: 'Agronomy and Soil Management',
        language: 'ru',
        type: 'literature',
        source: 'Agronomy academic reader',
        summary: 'Covers soil fertility, irrigation, crop rotation, and sustainable field decisions.',
        tags: ['soil', 'agronomy', 'irrigation'],
    },
    {
        title: 'Unmanned Aerial Systems Safety',
        language: 'en',
        type: 'source',
        source: 'Drone safety training material',
        summary: 'Focuses on UAV safety, regulations, battery planning, and mission risk checks.',
        tags: ['drone', 'safety', 'operations'],
    },
    {
        title: 'Crop Nutrition Planning Handbook',
        language: 'en',
        type: 'literature',
        source: 'Agricultural field handbook',
        summary: 'Reviews nutrient planning, fertilizer timing, and practical crop support decisions.',
        tags: ['agronomy', 'nutrition', 'fertility'],
    },
    {
        title: 'Kazakh Agronomy Field Notes',
        language: 'kk',
        type: 'source',
        source: 'Regional agronomy notes',
        summary: 'Summarizes field preparation, irrigation logic, and crop care in local conditions.',
        tags: ['agronomy', 'kazakh', 'field practice'],
    },
    {
        title: 'Drone Imaging and NDVI Overview',
        language: 'en',
        type: 'guide',
        source: 'Precision farming media pack',
        summary: 'Explains vegetation indices, field imaging, and how drone data supports decisions.',
        tags: ['drone', 'ndvi', 'monitoring'],
    },
    {
        title: 'AI in Education: Course Generation',
        language: 'en',
        type: 'guide',
        source: 'Educational technology overview',
        summary: 'How artificial intelligence can create personalized learning paths and assessments.',
        tags: ['ai', 'education', 'course generation'],
    },
    {
        title: 'Machine Learning for Crop Prediction',
        language: 'en',
        type: 'research',
        source: 'Agricultural AI studies',
        summary: 'Using ML models to predict crop yields based on weather and soil data.',
        tags: ['machine learning', 'prediction', 'crops'],
    },
    {
        title: 'Digital Learning Platforms',
        language: 'ru',
        type: 'overview',
        source: 'EdTech industry report',
        summary: 'Overview of modern digital education tools and their impact on learning outcomes.',
        tags: ['edtech', 'platforms', 'digital learning'],
    },
    {
        title: 'Sustainable Farming Practices',
        language: 'en',
        type: 'handbook',
        source: 'Environmental agriculture guide',
        summary: 'Best practices for eco-friendly farming, water conservation, and biodiversity.',
        tags: ['sustainability', 'environment', 'farming'],
    },
    {
        title: 'Online Assessment Strategies',
        language: 'en',
        type: 'methodology',
        source: 'Educational assessment research',
        summary: 'Effective methods for online testing, feedback systems, and student evaluation.',
        tags: ['assessment', 'online learning', 'evaluation'],
    },
];

function buildFallbackCourse(topic: string, templateKey?: string, level?: string, language = 'en', audience?: string, durationWeeks?: number, goal?: string) {
    const safeTopic = topic.trim() || 'AI Course';
    const safeLevel = level || 'intermediate';
    const templateLabel = templateKey ? `${templateKey} track` : 'guided track';

    return {
        title: `${safeTopic} Fundamentals`,
        description: `A locally generated ${templateLabel} course for ${safeLevel} learners.`,
        language,
        targetAudience: audience || `${safeLevel} learners`,
        estimatedWeeks: durationWeeks || 4,
        learningGoals: [
            `Understand the foundations of ${safeTopic}`,
            `Apply ${safeTopic} concepts in practical tasks`,
            `Complete a final review aligned with ${goal || 'course mastery'}`,
        ],
        lessons: [
            {
                title: `Introduction to ${safeTopic}`,
                content: `Overview, goals, and practical context for ${safeTopic}.`,
            },
            {
                title: `${safeTopic} Core Concepts`,
                content: `Key concepts, terminology, and examples for ${safeTopic}.`,
            },
            {
                title: `${safeTopic} Applied Practice`,
                content: `Hands-on exercises and short scenarios for ${safeTopic}.`,
            },
            {
                title: `${safeTopic} Review and Assessment`,
                content: `A recap with discussion prompts and assessment preparation.`,
            },
        ],
    };
}

function buildTutorFallback(action: string, lessonTitle: string, lessonContent: string, studentAnswer: string) {
    const snippet = lessonContent.slice(0, 180).trim();
    if (action === 'simplify') {
        return `In simple terms, "${lessonTitle}" means: ${snippet}. Focus on the main idea first, then connect it to one practical example.`;
    }
    if (action === 'example') {
        return `Example 1: apply "${lessonTitle}" in a classroom workflow. Example 2: use it in a short project or quiz activity.`;
    }
    if (action === 'check_answer') {
        return studentAnswer
            ? `Your answer is a solid start. Make it stronger by adding one concrete example and one short conclusion tied to "${lessonTitle}".`
            : `Write a short answer first, then I can help improve it with structure and examples.`;
    }
    return `Here is a helpful summary for "${lessonTitle}": ${snippet}`;
}

function buildAssessmentFallback(courseTitle: string, lessons: Array<{ title: string; content?: string | null }>) {
    const normalizedLessons = lessons.length
        ? lessons
        : [
              { title: `${courseTitle} Fundamentals`, content: `Core concepts for ${courseTitle}.` },
              { title: `${courseTitle} Practice`, content: `Applied practice for ${courseTitle}.` },
          ];

    const quizQuestions = normalizedLessons.slice(0, 5).map((lesson, index) => ({
        id: `q-${index + 1}`,
        prompt: `Which statement best matches the lesson "${lesson.title}"?`,
        options: [
            `It covers the main concepts of ${lesson.title}.`,
            `It is only about unrelated theory.`,
            `It removes practical work from the course.`,
            `It replaces the whole course with one example.`,
        ],
        answer: `It covers the main concepts of ${lesson.title}.`,
        explanation: `This lesson is meant to reinforce the key ideas in "${lesson.title}".`,
    }));

    return {
        title: `${courseTitle} Assessment Pack`,
        summary: `Auto-generated quiz, assignment, and rubric for ${courseTitle}.`,
        quizQuestions,
        assignment: {
            title: `${courseTitle} Applied Task`,
            brief: `Create a short practical submission showing how the student would apply concepts from ${courseTitle} in a realistic learning scenario.`,
            deliverables: [
                'One structured response or mini-project',
                'At least one example connected to course theory',
                'A short reflection on mistakes and improvements',
            ],
        },
        rubric: [
            { criterion: 'Concept accuracy', weight: 40 },
            { criterion: 'Practical application', weight: 35 },
            { criterion: 'Clarity and structure', weight: 25 },
        ],
    };
}

function translateFallback(text: string, language: string) {
    if (language === 'ru') {
        return `Перевод на русский: ${text}`;
    }
    if (language === 'kk') {
        return `Kazakh translation: ${text}`;
    }
    return `English translation: ${text}`;
}

function summarizeFallback(text: string) {
    const normalized = text.replace(/\s+/g, ' ').trim();
    return normalized.length > 220 ? `${normalized.slice(0, 220)}...` : normalized;
}

function safeLibraryTranslation(text: string, language: string) {
    return cleanTranslateHelper(text, language);
}

// New clean helper for translation
function cleanTranslateHelper(text: string, language: string) {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (language === 'ru') {
        // Simple fallback translation patterns for common terms
        let translated = normalized;
        translated = translated.replace(/\bAI\b/g, 'ИИ');
        translated = translated.replace(/\bcourse\b/g, 'курс');
        translated = translated.replace(/\blearning\b/g, 'обучение');
        translated = translated.replace(/\bagronomy\b/g, 'агрономия');
        translated = translated.replace(/\bdrone\b/g, 'дрон');
        translated = translated.replace(/\bfarming\b/g, 'фермерство');
        return `Перевод: ${translated}`;
    }
    if (language === 'kk') {
        // Simple fallback for Kazakh
        let translated = normalized;
        translated = translated.replace(/\bAI\b/g, 'AI');
        translated = translated.replace(/\bcourse\b/g, 'курс');
        translated = translated.replace(/\blearning\b/g, 'оқыту');
        return `Аударма: ${translated}`;
    }
    return `Translation: ${normalized}`;
}

async function generateJsonWithGemini(prompt: string): Promise<any> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is missing in server environment variables.');
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.1,
                responseMimeType: 'application/json',
            },
        }),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(`Gemini API Error: ${JSON.stringify(data)}`);
    }

    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    // Aggressive Sanitization
    text = text.trim();
    if (text.includes('```json')) {
        text = text.split('```json')[1].split('```')[0];
    } else if (text.includes('```')) {
        text = text.split('```')[1].split('```')[0];
    }
    
    // Remove any trailing/leading chatter that isn't JSON
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
        text = text.substring(firstBrace, lastBrace + 1);
    }

    try {
        return JSON.parse(text);
    } catch (e) {
        console.error('Failed to parse Gemini JSON. Raw text:', text);
        return { items: [], error: 'JSON_PARSE_FAILED' };
    }
}

async function generateTextWithGemini(prompt: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return 'No API key configured.';

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.7
            },
        }),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(`Gemini API Error: ${JSON.stringify(data)}`);
    }

    return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

router.post('/generate-course', authMiddleware, requireRole('TEACHER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
    try {
        const { topic } = req.body;
        const teacherId = req.user!.id;

        if (!topic) {
            res.status(400).json({ error: 'Topic is required.' });
            return;
        }

        const prompt = `
You are an expert curriculum designer.
Generate strict JSON:
{
  "title": "Course title",
  "description": "2-3 sentence description",
  "lessons": [{"title":"Module title","content":"Detailed lesson content"}]
}
Topic: "${topic}"
Generate 4-6 lessons.
`;

        let parsedContent;
        try {
            parsedContent = await generateJsonWithGemini(prompt);
        } catch (error) {
            if (process.env.NODE_ENV === 'production') throw error;
            parsedContent = buildFallbackCourse(topic);
        }
        const course = await prisma.course.create({
            data: {
                title: parsedContent.title,
                description: parsedContent.description,
                aiGenerated: true,
                teacherId,
                lessons: {
                    create: parsedContent.lessons.map((lesson: any, index: number) => ({
                        title: lesson.title,
                        content: lesson.content,
                        order: index,
                    })),
                },
            },
            include: { lessons: true },
        });

        res.status(201).json({ course });
    } catch (error) {
        console.error('AI Course Generation Error:', error);
        res.status(500).json({ error: 'Internal server error during AI generation.' });
    }
});

router.post('/generate-from-template', authMiddleware, requireRole('TEACHER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
    try {
        const teacherId = req.user!.id;
        const templateKey = String(req.body?.templateKey || '').trim();
        const topic = String(req.body?.topic || '').trim();
        const level = String(req.body?.level || 'intermediate').trim();
        const language = String(req.body?.language || 'en').trim();
        const targetAudience = String(req.body?.targetAudience || '').trim();
        const courseGoal = String(req.body?.courseGoal || '').trim();
        const durationWeeks = Math.max(1, Number(req.body?.durationWeeks || 4));

        if (!templateKey || !topic) {
            res.status(400).json({ error: 'templateKey and topic are required.' });
            return;
        }

        const templateHints: Record<string, string> = {
            bootcamp: 'Intensive practical bootcamp with projects and checkpoints.',
            academic: 'Academic structure with theory, references, and assessments.',
            corporate: 'Corporate upskilling with concise modules and practical tasks.',
            exam: 'Exam-prep style with progressive drills and revision blocks.',
        };
        const templateHint = templateHints[templateKey] || 'Balanced modern online course structure.';

        const prompt = `
You are building a course by template.
Template: ${templateKey} (${templateHint})
Topic: ${topic}
Level: ${level}
Language: ${language}
Target audience: ${targetAudience || 'general learners'}
Course goal: ${courseGoal || 'practical mastery'}
Duration: ${durationWeeks} weeks
Return strict JSON:
{
  "title":"...",
  "description":"...",
  "language":"...",
  "targetAudience":"...",
  "estimatedWeeks":4,
  "learningGoals":["...","...","..."],
  "lessons":[{"title":"...","content":"..."}]
}
Generate 5-8 lessons with clear progression.
`;
        let parsedContent;
        try {
            parsedContent = await generateJsonWithGemini(prompt);
        } catch (error) {
            if (process.env.NODE_ENV === 'production') throw error;
            parsedContent = buildFallbackCourse(topic, templateKey, level, language, targetAudience, durationWeeks, courseGoal);
        }

        const course = await prisma.course.create({
            data: {
                title: parsedContent.title,
                description: parsedContent.description,
                aiGenerated: true,
                templateKey,
                language: String(parsedContent.language || language || 'en'),
                targetAudience: parsedContent.targetAudience || targetAudience || null,
                estimatedWeeks: Number(parsedContent.estimatedWeeks || durationWeeks || 4),
                learningGoals: JSON.stringify(
                    Array.isArray(parsedContent.learningGoals)
                        ? parsedContent.learningGoals
                        : buildFallbackCourse(topic, templateKey, level, language, targetAudience, durationWeeks, courseGoal).learningGoals
                ),
                teacherId,
                lessons: {
                    create: parsedContent.lessons.map((lesson: any, index: number) => ({
                        title: lesson.title,
                        content: lesson.content,
                        order: index,
                    })),
                },
            },
            include: { lessons: true },
        });

        res.status(201).json({ course });
    } catch (error) {
        console.error('AI Template Generation Error:', error);
        res.status(500).json({ error: 'Internal server error during template generation.' });
    }
});

router.post('/tutor-assist', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const action = String(req.body?.action || '');
        const lessonTitle = String(req.body?.lessonTitle || '');
        const lessonContent = String(req.body?.lessonContent || '');
        const studentAnswer = String(req.body?.studentAnswer || '');

        if (!action || !lessonContent) {
            res.status(400).json({ error: 'action and lessonContent are required.' });
            return;
        }

        let instruction = '';
        if (action === 'simplify') {
            instruction = 'Explain this lesson in simpler terms, short and clear.';
        } else if (action === 'example') {
            instruction = 'Give 2 practical examples based on this lesson.';
        } else if (action === 'check_answer') {
            instruction = `Check this student answer and give constructive feedback. Student answer: "${studentAnswer}"`;
        } else {
            instruction = 'Provide helpful tutoring explanation.';
        }

        const prompt = `
You are a patient AI tutor.
Lesson title: ${lessonTitle}
Lesson content:
${lessonContent}

Task: ${instruction}
Return strict JSON:
{"result":"helpful response text"}
`;
        try {
            const json = await generateJsonWithGemini(prompt);
            res.json({ result: json.result || '' });
        } catch (error) {
            if (process.env.NODE_ENV === 'production') throw error;
            res.json({ result: buildTutorFallback(action, lessonTitle, lessonContent, studentAnswer) });
        }
    } catch (error) {
        console.error('AI Tutor error:', error);
        res.status(500).json({ error: 'Internal server error during tutor assist.' });
    }
});

router.post('/generate-assessment-pack', authMiddleware, requireRole('TEACHER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
    try {
        const courseId = String(req.body?.courseId || '').trim();
        if (!courseId) {
            res.status(400).json({ error: 'courseId is required.' });
            return;
        }

        const course = await prisma.course.findUnique({
            where: { id: courseId },
            include: {
                lessons: {
                    orderBy: { order: 'asc' },
                    select: { title: true, content: true },
                },
            },
        });

        if (!course) {
            res.status(404).json({ error: 'Course not found.' });
            return;
        }

        if (req.user!.role !== 'ADMIN' && course.teacherId !== req.user!.id) {
            res.status(403).json({ error: 'You can only generate assessments for your own courses.' });
            return;
        }

        const prompt = `
You are an assessment designer for online higher education.
Create a strict JSON assessment pack for the course below.
Course title: ${course.title}
Course description: ${course.description || 'N/A'}
Lessons:
${course.lessons.map((lesson: { title: string; content: string | null }, index: number) => `${index + 1}. ${lesson.title}: ${lesson.content || ''}`).join('\n')}

Return strict JSON:
{
  "title":"...",
  "summary":"...",
  "quizQuestions":[
    {
      "id":"q-1",
      "prompt":"...",
      "options":["...","...","...","..."],
      "answer":"...",
      "explanation":"..."
    }
  ],
  "assignment":{
    "title":"...",
    "brief":"...",
    "deliverables":["...","...","..."]
  },
  "rubric":[
    {"criterion":"...", "weight":40}
  ]
}
Generate 4-6 quiz questions, one assignment, and 3 rubric criteria.
`;

        try {
            const assessmentPack = await generateJsonWithGemini(prompt);
            res.json({ assessmentPack });
        } catch (error) {
            if (process.env.NODE_ENV === 'production') throw error;
            res.json({ assessmentPack: buildAssessmentFallback(course.title, course.lessons) });
        }
    } catch (error) {
        console.error('AI Assessment Generation Error:', error);
        res.status(500).json({ error: 'Internal server error during assessment generation.' });
    }
});

router.post('/library-assist', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const mode = String(req.body?.mode || 'search').trim();
        const query = String(req.body?.query || '').trim();
        const text = String(req.body?.text || '').trim();
        const targetLanguage = String(req.body?.targetLanguage || 'ru').trim();

        if (!query && !text) {
            res.status(400).json({ error: 'query or text is required.' });
            return;
        }

        if (mode === 'search') {
            const q = (query || text).toLowerCase();
            const items = libraryCatalog.filter((item) =>
                [item.title, item.source, item.summary, ...item.tags].join(' ').toLowerCase().includes(q)
            );
            const related = libraryCatalog
                .filter((item) => !items.some((selected) => selected.title === item.title))
                .slice(0, 3);
            res.json({
                items: items.length ? items : libraryCatalog.slice(0, 4),
                related,
                offline: items.length > 0,
                message: items.length ? 'Results from local catalog.' : 'No local matches, returning general catalog.',
            });
            return;
        }

        if (mode === 'web_search') {
            // Simulated High-Quality Web Search using Gemini
            const prompt = `
                Perform a high-quality educational search on the topic: "${query || text}".
                Provide 4-6 real-world articles, books, or online resources.
                Return strict JSON:
                {
                    "items": [
                        { "title": "...", "source": "...", "summary": "...", "tags": ["..."], "language": "...", "type": "article/book/link" }
                    ]
                }
            `;
            try {
                const results = await generateJsonWithGemini(prompt);
                res.json({
                    items: results.items || [],
                    message: `Discovery mode finding resources for: ${query || text}`,
                    offline: false
                });
            } catch (err) {
                res.json({
                    items: libraryCatalog.slice(0, 5),
                    message: 'Showing related local library items (Search API limit reached).',
                    offline: true
                });
            }
            return;
        }

        if (mode === 'translate') {
            const prompt = `Translate the following educational text into ${targetLanguage}. Return ONLY the translation.\n\nText: ${text || query}`;
            try {
                const translated = await generateTextWithGemini(prompt);
                res.json({
                    translated,
                    summary: summarizeFallback(text || query),
                    related: libraryCatalog.slice(0, 3),
                    offline: false,
                    message: 'Translation generated by Gemini AI.',
                });
            } catch (err) {
                const translated = safeLibraryTranslation(text || query, targetLanguage);
                res.json({
                    translated,
                    summary: summarizeFallback(text || query),
                    related: libraryCatalog.slice(0, 3),
                    offline: true,
                    message: 'Translation created using offline patterns (Gemini limit reached).',
                });
            }
            return;
        }

        if (mode === 'summarize') {
            const prompt = `Summarize the following educational text in ${targetLanguage}. Keep it concise but informative. Return ONLY the summary.\n\nText: ${text || query}`;
            try {
                const summary = await generateTextWithGemini(prompt);
                res.json({
                    summary,
                    translated: safeLibraryTranslation(text || query, targetLanguage),
                    related: libraryCatalog.slice(0, 3),
                    offline: false,
                    message: 'Summary generated by Gemini AI.',
                });
            } catch (err) {
                res.json({
                    summary: summarizeFallback(text || query),
                    related: libraryCatalog.slice(0, 3),
                    offline: true,
                    message: 'Summary created locally (Gemini limit reached).',
                });
            }
            return;
        }

        res.json({
            items: libraryCatalog.slice(0, 4),
            related: libraryCatalog.slice(0, 3),
            message: 'AI Library Mode active.',
        });
    } catch (error) {
        console.error('AI Library assist error:', error);
        res.status(500).json({ error: 'Internal server error during library assist.' });
    }
});

router.post('/library-upload', authMiddleware, upload.single('file'), async (req: AuthRequest, res: Response) => {
    try {
        const file = req.file;
        const targetLanguage = String(req.body?.targetLanguage || 'ru').trim();
        const mode = String(req.body?.mode || 'translate').trim();

        if (!file) {
            res.status(400).json({ error: 'No file uploaded.' });
            return;
        }

        const ext = path.extname(file.originalname).toLowerCase();
        let content = '';

        if (ext === '.txt' || ext === '.json' || ext === '.md') {
            content = fs.readFileSync(file.path, 'utf8');
        } else {
            // Fallback for non-text files (PDF parsing would go here)
            res.status(400).json({ error: `Currently only text-based files (.txt, .md) are supported for processing. File uploaded: ${file.originalname}` });
            fs.unlinkSync(file.path);
            return;
        }

        fs.unlinkSync(file.path); // Clean up temp file

        const prompt = mode === 'translate' 
            ? `Translate the following document content into ${targetLanguage}:\n\n${content}`
            : `Summarize the following document content in ${targetLanguage}:\n\n${content}`;

        const result = await generateTextWithGemini(prompt);

        res.json({
            mode,
            originalName: file.originalname,
            result,
            message: `Document ${file.originalname} processed successfully.`
        });
    } catch (error) {
        console.error('Library upload error:', error);
        res.status(500).json({ error: 'Failed to process document.' });
    }
});

export default router;
