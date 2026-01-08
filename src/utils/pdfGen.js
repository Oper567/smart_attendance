const PDFDocument = require('pdfkit');

/**
 * Generates a professional Attendance Sheet PDF
 * @param {Object} res - Express response object
 * @param {Object} session - Session details from Prisma
 * @param {Array} records - List of students who marked attendance
 */
const generateAttendancePDF = (res, session, records) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Stream the PDF directly to the browser
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Attendance_${session.courseCode}_${new Date().toISOString().split('T')[0]}.pdf`);
    doc.pipe(res);

    // Header: University Branding / Course Info
    doc.fontSize(16).text('UNIVERSITY SMART ATTENDANCE SYSTEM', { align: 'center', underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Course Code: ${session.courseCode.toUpperCase()}`);
    doc.text(`Lecturer: ${session.lecturer.name}`);
    doc.text(`Date: ${new Date(session.createdAt).toLocaleDateString('en-GB')}`);
    doc.text(`Total Students Present: ${records.length}`);
    doc.moveDown();

    // Table Header
    doc.rect(50, doc.y, 500, 20).fill('#eeeeee').stroke('#000000');
    doc.fillColor('#000000').text('S/N', 60, doc.y + 5);
    doc.text('Matric Number', 100, doc.y);
    doc.text('Student Name', 250, doc.y);
    doc.text('Time Signed', 450, doc.y);
    doc.moveDown();

    // Table Rows
    records.forEach((record, index) => {
        const yPos = doc.y;
        doc.fontSize(10).text(index + 1, 60, yPos);
        doc.text(record.student.matricNo, 100, yPos);
        doc.text(record.student.name, 250, yPos);
        doc.text(new Date(record.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 450, yPos);
        
        // Draw a light line between rows
        doc.moveTo(50, yPos + 15).lineTo(550, yPos + 15).strokeColor('#cccccc').stroke();
        doc.moveDown(0.5);
    });

    // Footer
    doc.fontSize(8).text(`Generated on: ${new Date().toLocaleString()}`, 50, 750, { align: 'center' });

    doc.end();
};

module.exports = { generateAttendancePDF };