const express = require('express');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

// 1. Require Routes
const attendanceRoutes = require('./routes/attendance');
const lecturerRoutes = require('./routes/lecturer');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');

const app = express();
app.use(express.json());

// --- THE MISSING PIECE: SERVE STATIC FILES ---
// This tells Express: "If someone asks for login.html, look inside the /public folder"
app.use(express.static(path.join(__dirname, '../public')));

// 2. Setup Prisma 7 Connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const publicPath = path.resolve(__dirname, '..', 'public');
app.use(express.static(publicPath));

// 3. Use Routes
app.use('/api/attendance', attendanceRoutes);
app.use('/api/lecturer', lecturerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);

// Root Route - Shows Signup first
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login.html'));
});
app.get('/signup', (req, res) => {
    res.sendFile(path.join(publicPath, 'signup.html'));
});
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server is live on http://localhost:${PORT}`);
});