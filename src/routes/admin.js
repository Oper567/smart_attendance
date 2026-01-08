const router = require('express').Router();
const { prisma } = require('../app'); 

// ROUTE: Get all lecturers (so Admin can see who needs approval)
router.get('/lecturers', async (req, res) => {
    try {
        const lecturers = await prisma.user.findMany({
            where: { role: 'LECTURER' },
            select: { id: true, name: true, email: true, staffId: true, isApproved: true }
        });
        res.json(lecturers);
    } catch (error) {
        res.status(500).json({ error: "Could not fetch lecturers" });
    }
});

// ROUTE: Approve a Lecturer
router.patch('/approve/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const updatedLecturer = await prisma.user.update({
            where: { id: parseInt(id) },
            data: { isApproved: true }
        });
        res.json({ message: `${updatedLecturer.name} has been approved! ✅` });
    } catch (error) {
        res.status(500).json({ error: "Approval failed." });
    }
});

module.exports = router;