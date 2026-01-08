const express = require('express');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js'); // <--- ADD THIS LINE
require('dotenv').config();

const app = express();
app.use(express.json());

// 1. Corrected Supabase Initialization
const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_ANON_KEY;
// Use createClient directly since we required it above
const supabaseClient = createClient(SB_URL, SB_KEY); 

// 2. Serve Static Files
// This ensures your HTML/CSS/JS files in the 'public' folder are accessible
const publicPath = path.resolve(__dirname, '..', 'public');
app.use(express.static(publicPath));

// 3. Setup Prisma 7 Connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// 4. Require and Use Routes
const attendanceRoutes = require('./routes/attendance');
const lecturerRoutes = require('./routes/lecturer');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');

app.use('/api/attendance', attendanceRoutes);
app.use('/api/lecturer', lecturerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);

// 5. Page Routing
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(publicPath, 'login.html'));
});
app.get('/signup', (req, res) => {
    res.sendFile(path.join(publicPath, 'signup.html'));
});
app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'login.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server is live on http://localhost:${PORT}`);
});