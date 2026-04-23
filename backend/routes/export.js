const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const { queryAll } = require('../database');

router.get('/pdf', (req, res) => {
  try {
    const { date, employee_name } = req.query;
    let sql = `SELECT e.*,u.name as employee_name FROM entries e JOIN users u ON e.user_id=u.id WHERE 1=1`;
    const params = [];
    if (date) { sql += ' AND e.date=?'; params.push(date); }
    if (employee_name) { sql += ' AND u.name LIKE ?'; params.push(`%${employee_name}%`); }
    sql += ' ORDER BY e.date DESC,u.name ASC';
    const entries = queryAll(sql, params);

    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="work-diary-report.pdf"');
    doc.pipe(res);

    const pageWidth = doc.page.width;

    // Header
    doc.rect(0, 0, pageWidth, 80).fill('#294674');
    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold')
      .text('OPTIMIZED SOLUTION', 40, 18, { align: 'center' });
    doc.fontSize(11).font('Helvetica').text('Daily Work Diary Report', 40, 46, { align: 'center' });
    const genDate = new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' });
    doc.fontSize(9).text(`Generated on: ${genDate}`, 40, 62, { align: 'center' });

    doc.fillColor('#294674').fontSize(9).font('Helvetica');
    let filterText = 'Filters: ';
    if (date) filterText += `Date: ${date}  `;
    if (employee_name) filterText += `Employee: ${employee_name}`;
    if (!date && !employee_name) filterText += 'All Records';
    doc.text(filterText, 40, 92);
    doc.text(`Total Records: ${entries.length}`, pageWidth - 140, 92);

    // Table
    const tableTop = 115;
    const colWidths = [25, 110, 65, 100, 90, 120, 52, 48, 68, 100];
    const headers = ['#','Employee','Date','Project','Task','Description','Hrs Asgn','Hrs Spent','Status','Remarks'];
    const cols = [40];
    for (let i = 1; i < colWidths.length; i++) cols.push(cols[i-1] + colWidths[i-1]);

    doc.rect(40, tableTop, pageWidth-80, 20).fill('#C93731');
    doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
    headers.forEach((h,i) => doc.text(h, cols[i]+3, tableTop+6, { width: colWidths[i]-6, lineBreak: false }));

    let rowY = tableTop + 20, rowCount = 0;
    entries.forEach((entry, idx) => {
      const rowH = 22;
      if (rowY + rowH > doc.page.height - 50) {
        doc.addPage({ size:'A4', layout:'landscape', margin:40 });
        rowY = 40;
        doc.rect(40, rowY, pageWidth-80, 20).fill('#C93731');
        doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
        headers.forEach((h,i) => doc.text(h, cols[i]+3, rowY+6, { width: colWidths[i]-6, lineBreak: false }));
        rowY += 20; rowCount = 0;
      }
      doc.rect(40, rowY, pageWidth-80, rowH).fill(rowCount%2===0?'#f8f9fa':'#ffffff');
      doc.rect(40, rowY, pageWidth-80, rowH).stroke('#e0e0e0');
      const statusColor = entry.status==='Completed'?'#1a7a4a':'#C93731';
      const rowData = [String(idx+1), entry.employee_name||'', entry.date||'', entry.project_name||'',
        entry.task_name||'', (entry.description||'').substring(0,40), String(entry.hours_assigned||0),
        String(entry.hours_spent||0), entry.status||'', (entry.remarks||'').substring(0,30)];
      rowData.forEach((val,i) => {
        doc.fillColor(i===8?statusColor:'#333333').font(i===8?'Helvetica-Bold':'Helvetica').fontSize(7.5)
          .text(val, cols[i]+3, rowY+7, { width: colWidths[i]-6, lineBreak: false });
      });
      rowY += rowH; rowCount++;
    });

    if (!entries.length) {
      doc.fillColor('#727371').fontSize(11).font('Helvetica')
        .text('No entries found.', 40, rowY+20, { align:'center' });
    }

    // Footer
    const footerY = doc.page.height - 30;
    doc.rect(0, footerY-5, pageWidth, 35).fill('#294674');
    doc.fillColor('#ffffff').fontSize(8).font('Helvetica')
      .text('© Optimized Solution — Confidential Work Diary Report', 40, footerY+2, { align:'center' });

    doc.end();
  } catch(err) {
    console.error('PDF error:', err);
    if (!res.headersSent) res.status(500).json({ success:false, message:'Error generating PDF.' });
  }
});

module.exports = router;
