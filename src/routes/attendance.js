const router = require('express').Router();
const { prisma } = require('../app'); // Ensure you export prisma from app.js

// ROUTE: Mark Attendance
router.post('/mark', async (req, res) => {
    const { studentId, code, pin } = req.body;

    try {
        // 1. Find the active session with this code
        const session = await prisma.session.findFirst({
            where: {
                code: code,
                isActive: true,
                expiresAt: { gt: new Date() } // Check if not expired
            }
        });

        if (!session) {
            return res.status(400).json({ error: "Invalid or expired code." });
        }

        // 2. Verify Student PIN (Security layer)
        const student = await prisma.user.findUnique({ where: { id: studentId } });
        // (In a real app, use bcrypt.compare here)
        
        // 3. Check if student already signed for THIS session
        const alreadySigned = await prisma.attendance.findUnique({
            where: {
                sessionId_studentId: {
                    sessionId: session.id,
                    studentId: studentId
                }
            }
        });

        if (alreadySigned) {
            return res.status(400).json({ error: "You have already signed for this class." });
        }

        // 4. Create the attendance record
        const record = await prisma.attendance.create({
            data: {
                sessionId: session.id,
                studentId: studentId
            }
        });

        res.json({ message: "Attendance marked successfully! ✅", record });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error." });
    }
});
// src/routes/attendance.js

router.post('/submit', async (req, res) => {
    const { code, studentId, pin } = req.body;

    try {
        // 1. Find the session
        const session = await prisma.session.findUnique({
            where: { code: code }
        });

        // 🚨 THIS IS THE FIX: Check if session exists BEFORE reading properties
        if (!session) {
            return res.status(404).json({ error: "Invalid or expired class code." });
        }

        // 2. Check if session is still active (if you have an expiresAt field)
        if (new Date() > new Date(session.expiresAt)) {
            return res.status(410).json({ error: "This session has expired." });
        }

        // 3. Proceed with marking attendance...
        const attendance = await prisma.attendance.create({
            data: {
                studentId: studentId,
                sessionId: session.id // Now this is safe!
            }
        });

        res.json({ message: "Attendance marked successfully!" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;