const router = require('express').Router();
const prisma = require('../lib/prisma'); // Using the clean lib approach

// FUNCTION: Generate random 6-digit string
const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// ROUTE: Create Attendance Session
router.post('/create-session', async (req, res) => {
    const { lecturerId, courseCode, durationMinutes } = req.body;

    try {
        // 1. Deactivate any existing active sessions for this lecturer
        await prisma.session.updateMany({
            where: { lecturerId: lecturerId, isActive: true },
            data: { isActive: false }
        });

        // 2. Generate new session details
        const code = generateCode();
        const expiresAt = new Date(Date.now() + durationMinutes * 60000);

        const newSession = await prisma.session.create({
            data: {
                courseCode,
                lecturerId,
                code,
                expiresAt,
                isActive: true
            }
        });

        res.json({
            message: "Session started! 🎯",
            code: newSession.code,
            expiresAt: newSession.expiresAt
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to create session." });
    }
});
// src/routes/lecturer.js

// ROUTE: Get attendance report for a specific session
router.get('/reports/:sessionId', async (req, res) => {
    const { sessionId } = req.params;

    try {
        const attendance = await prisma.attendance.findMany({
            where: { sessionId: parseInt(sessionId) },
            include: {
                student: {
                    select: {
                        name: true,
                        matricNo: true,
                        email: true
                    }
                }
            }
        });

        res.json({
            count: attendance.length,
            students: attendance.map(a => a.student)
        });
    } catch (error) {
        res.status(500).json({ error: "Could not fetch report." });
    }
});

module.exports = router;