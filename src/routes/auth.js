const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

router.post('/login', async (req, res) => {
    const { identifier, password } = req.body;

    try {
        // 1. Find user by email, matricNo, or staffId
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: identifier },
                    { matricNo: identifier },
                    { staffId: identifier }
                ]
            }
        });

        // 2. Check if user exists
        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }

        // 3. Verify Password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid password" });
        }

        // 4. Check Approval (For Lecturers)
        if (user.role === 'LECTURER' && !user.isApproved) {
            return res.status(403).json({ error: "Account pending admin approval" });
        }

        // 5. Generate JWT Token
        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET || 'your_super_secret_key',
            { expiresIn: '1d' }
        );

        // 6. Send Response
        res.json({
            message: "Login successful",
            token,
            role: user.role,
            name: user.name,
            id: user.id
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});
router.post('/signup', async (req, res) => {
    const { name, email, password, role, matricNo, staffId } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                matricNo: role === 'STUDENT' ? matricNo : null,
                staffId: role === 'LECTURER' ? staffId : null,
                // Lecturers start unapproved, Students are auto-approved
                isApproved: role === 'STUDENT' ? true : false 
            }
        });
        res.status(201).json({ message: "User created!" });
    } catch (err) {
        res.status(400).json({ error: "User already exists with that Email/ID" });
    }
});
// Get history for a specific student
router.get('/history/:studentId', async (req, res) => {
    const { studentId } = req.params;

    try {
        const history = await prisma.attendance.findMany({
            where: { studentId: parseInt(studentId) },
            include: {
                session: {
                    select: {
                        courseCode: true,
                        createdAt: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(history);
    } catch (error) {
        res.status(500).json({ error: "Could not fetch history" });
    }
});3

module.exports = router;