const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// 1. Check if DB URL exists
if (!process.env.DATABASE_URL) {
    console.error("❌ ERROR: DATABASE_URL is not defined in the environment.");
    process.exit(1);
}

// 2. Setup the Adapter for Prisma 7
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("🌱 Starting seed logic...");

    // 1. Create Admin
    const adminPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.upsert({
        where: { email: 'admin@uni.edu.ng' },
        update: {},
        create: {
            name: 'System Admin',
            email: 'admin@uni.edu.ng',
            password: adminPassword,
            role: 'ADMIN',
            isApproved: true
        },
    });

    // 2. Create Lecturer
    const lecPassword = await bcrypt.hash('lecturer123', 10);
    await prisma.user.upsert({
        where: { email: 'dr.smith@uni.edu.ng' },
        update: {},
        create: {
            name: 'Dr. Smith',
            email: 'dr.smith@uni.edu.ng',
            password: lecPassword,
            staffId: 'STF/001',
            role: 'LECTURER',
            isApproved: false
        },
    });

    // 3. Create Student
    const stuPassword = await bcrypt.hash('student123', 10);
    const stuPin = await bcrypt.hash('1234', 10);
    await prisma.user.upsert({
        where: { matricNo: 'UG/20/1001' },
        update: {},
        create: {
            name: 'Chidi Obi',
            email: 'chidi@student.edu.ng',
            password: stuPassword,
            matricNo: 'UG/20/1001',
            pin: stuPin,
            role: 'STUDENT',
            isApproved: true
        },
    });

    console.log("✅ Seeding complete! Admin, Lecturer, and Student created.");
}

main()
    .catch((e) => {
        console.error("❌ Seeding failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });