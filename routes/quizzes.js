const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { Quiz, Course, User, QuizAccess } = require('../models');
const { protect, authorize } = require('../middleware/auth');
const aiService = require('../services/aiService');

// @route   POST /api/quizzes/generate
// @desc    Generate quiz questions using AI
// @access  Private (Professor/Admin)
router.post('/generate', protect, authorize('professor', 'admin'), async (req, res) => {
    try {
        const { topic, count } = req.body;

        if (!topic) {
            return res.status(400).json({ success: false, message: 'Topic is required' });
        }

        const questions = await aiService.generateQuiz(topic, count || 5);
        res.json({ success: true, questions });
    } catch (error) {
        console.error('Generate quiz error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate quiz' });
    }
});

// @route   POST /api/quizzes
// @desc    Create a new quiz
// @access  Private (Professor/Admin)
router.post('/', protect, authorize('professor', 'admin'), async (req, res) => {
    try {
        const { courseId, title, topic, questions, timeLimit, cutoffScore, closesAt, isManualStop } = req.body;

        const quiz = await Quiz.create({
            courseId,
            professorId: req.user.id,
            title,
            topic,
            questions,
            timeLimit,
            cutoffScore: cutoffScore || 0,
            closesAt: closesAt || null,
            isManualStop: isManualStop !== undefined ? isManualStop : true
        });

        res.status(201).json({ success: true, quiz });
    } catch (error) {
        console.error('Create quiz error:', error);
        res.status(500).json({ success: false, message: 'Failed to create quiz' });
    }
});

// @route   PUT /api/quizzes/:id
// @desc    Update a quiz
// @access  Private (Professor/Admin)
router.put('/:id', protect, authorize('professor', 'admin'), async (req, res) => {
    try {
        const { courseId, title, topic, questions, timeLimit, cutoffScore, closesAt, isManualStop } = req.body;
        const quiz = await Quiz.findByPk(req.params.id);

        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found' });
        }

        if (quiz.professorId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        // Update fields
        quiz.courseId = courseId;
        quiz.title = title;
        quiz.topic = topic;
        quiz.questions = questions;
        quiz.timeLimit = timeLimit;
        quiz.cutoffScore = cutoffScore || 0;
        quiz.closesAt = closesAt || null;
        quiz.isManualStop = isManualStop !== undefined ? isManualStop : true;

        await quiz.save();

        res.json({ success: true, quiz });
    } catch (error) {
        console.error('Update quiz error:', error);
        res.status(500).json({ success: false, message: 'Failed to update quiz' });
    }
});

// @route   GET /api/quizzes/course/:courseId
// @desc    Get quizzes for a course with access tokens
// @access  Private
router.get('/course/:courseId', protect, async (req, res) => {
    try {
        const quizzes = await Quiz.findAll({
            where: { courseId: req.params.courseId },
            order: [['createdAt', 'DESC']]
        });

        // If student, generate/retrieve access tokens
        if (req.user.role === 'student') {
            const quizzesWithTokens = await Promise.all(quizzes.map(async (quiz) => {
                // Check if token already exists
                let quizAccess = await QuizAccess.findOne({
                    where: {
                        quizId: quiz.id,
                        studentId: req.user.id
                    }
                });

                // Generate new token if doesn't exist
                if (!quizAccess) {
                    const accessToken = crypto.randomBytes(4).toString('hex').toUpperCase();
                    quizAccess = await QuizAccess.create({
                        quizId: quiz.id,
                        studentId: req.user.id,
                        accessToken
                    });
                }

                return {
                    ...quiz.toJSON(),
                    accessToken: quizAccess.accessToken
                };
            }));

            return res.json({ success: true, quizzes: quizzesWithTokens });
        }

        res.json({ success: true, quizzes });
    } catch (error) {
        console.error('Get quizzes error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET /api/quizzes/access/:token
// @desc    Get quiz by access token (student-specific)
// @access  Private (Student)
router.get('/access/:token', protect, authorize('student'), async (req, res) => {
    try {
        const quizAccess = await QuizAccess.findOne({
            where: {
                accessToken: req.params.token,
                studentId: req.user.id
            },
            include: [{
                model: Quiz,
                as: 'quiz'
            }]
        });

        if (!quizAccess) {
            return res.status(404).json({ success: false, message: 'Invalid or unauthorized access token' });
        }

        const quiz = quizAccess.quiz;

        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found' });
        }

        // Remove correct answers for students
        const safeQuestions = quiz.questions.map(q => {
            const { correct, ...rest } = q;
            return rest;
        });

        const safeQuiz = {
            ...quiz.toJSON(),
            questions: safeQuestions
        };

        res.json({ success: true, quiz: safeQuiz });
    } catch (error) {
        console.error('Get quiz by token error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});


// @route   GET /api/quizzes/:id
// @desc    Get single quiz (hides correct answers for students)
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        const quiz = await Quiz.findByPk(req.params.id);

        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found' });
        }

        // If student, remove correct answers
        if (req.user.role === 'student') {
            const safeQuestions = quiz.questions.map(q => {
                const { correct, ...rest } = q;
                return rest;
            });

            // Clone and modify
            const safeQuiz = quiz.toJSON();
            safeQuiz.questions = safeQuestions;
            return res.json({ success: true, quiz: safeQuiz });
        }

        res.json({ success: true, quiz });
    } catch (error) {
        console.error('Get quiz error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   POST /api/quizzes/:id/submit
// @desc    Submit quiz answers and get score
// @access  Private (Student)
router.post('/:id/submit', protect, authorize('student'), async (req, res) => {
    try {
        const { answers } = req.body;
        const quiz = await Quiz.findByPk(req.params.id);

        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found' });
        }

        // Calculate score
        let score = 0;
        const totalQuestions = quiz.questions.length;

        quiz.questions.forEach(q => {
            if (answers[q.id] === q.correct) {
                score++;
            }
        });

        // Save submission
        const { QuizSubmission } = require('../models');
        const submission = await QuizSubmission.create({
            quizId: quiz.id,
            studentId: req.user.id,
            score,
            totalQuestions,
            answers
        });

        res.json({
            success: true,
            score,
            totalQuestions,
            percentage: Math.round((score / totalQuestions) * 100),
            correctAnswers: quiz.questions.map(q => ({ id: q.id, correct: q.correct }))
        });

    } catch (error) {
        console.error('Submit quiz error:', error);
        res.status(500).json({ success: false, message: 'Failed to submit quiz' });
    }
});

// @route   GET /api/quizzes/:id/results
// @desc    Get all submissions for a quiz
// @access  Private (Professor)
router.get('/:id/results', protect, authorize('professor', 'admin'), async (req, res) => {
    try {
        const { QuizSubmission } = require('../models');
        const submissions = await QuizSubmission.findAll({
            where: { quizId: req.params.id },
            include: [{
                model: User,
                as: 'student',
                attributes: ['id', 'name', 'email']
            }],
            order: [['score', 'DESC']]
        });

        res.json({ success: true, submissions });
    } catch (error) {
        console.error('Get quiz results error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch results' });
    }
});

// @route   PUT /api/quizzes/:id/stop
// @desc    Manually stop a quiz
// @access  Private (Professor/Admin)
router.put('/:id/stop', protect, authorize('professor', 'admin'), async (req, res) => {
    try {
        const quiz = await Quiz.findByPk(req.params.id);

        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found' });
        }

        if (quiz.professorId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        quiz.status = 'closed';
        await quiz.save();

        res.json({ success: true, quiz });
    } catch (error) {
        console.error('Stop quiz error:', error);
        res.status(500).json({ success: false, message: 'Failed to stop quiz' });
    }
});

// @route   PUT /api/quizzes/:id/activate
// @desc    Activate a stopped quiz
// @access  Private (Professor/Admin)
router.put('/:id/activate', protect, authorize('professor', 'admin'), async (req, res) => {
    try {
        const quiz = await Quiz.findByPk(req.params.id);

        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found' });
        }

        if (quiz.professorId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        quiz.status = 'published';
        await quiz.save();

        res.json({ success: true, quiz });
    } catch (error) {
        console.error('Activate quiz error:', error);
        res.status(500).json({ success: false, message: 'Failed to activate quiz' });
    }
});

module.exports = router;
