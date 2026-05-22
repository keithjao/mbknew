import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PayslipData } from '../../shared/attendance/attendance.store';
import { AppClockStore } from '../../shared/testing/app-clock.store';

@Injectable({ providedIn: 'root' })
export class PayslipPdfService {
  constructor(private readonly appClock: AppClockStore) {}

  downloadPayslip(payslip: PayslipData): void {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const brandedDoc = doc as jsPDF & { lastAutoTable?: { finalY: number } };

    doc.setFillColor(246, 240, 232);
    doc.roundedRect(36, 36, pageWidth - 72, 92, 18, 18, 'F');

    doc.setTextColor(48, 37, 29);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('Matcha by Kamo Payslip', 52, 74);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(109, 100, 92);
    doc.text(`Period: ${payslip.period.label}`, 52, 98);
    doc.text(`Coverage: ${payslip.period.startDate} to ${payslip.period.endDate}`, 52, 116);
    doc.text(`Payout Date: ${payslip.period.payoutDate}`, pageWidth - 210, 98);
    doc.text(`Generated: ${this.appClock.now().toLocaleString()}`, pageWidth - 210, 116);

    doc.setDrawColor(225, 215, 203);
    doc.roundedRect(36, 148, pageWidth - 72, 112, 14, 14);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(48, 37, 29);
    doc.setFontSize(13);
    doc.text('Staff details', 52, 176);
    doc.text('Payroll summary', pageWidth / 2 + 12, 176);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(89, 80, 73);
    doc.text(`Name: ${payslip.staff.fullName}`, 52, 198);
    doc.text(`Staff Code: ${payslip.staff.staffCode}`, 52, 216);
    doc.text(`Role: ${payslip.staff.role}`, 52, 234);
    doc.text(`Department: ${payslip.staff.department}`, 52, 252);

    doc.text(`Hourly Rate: PHP ${payslip.staff.hourlyRate.toFixed(2)}`, pageWidth / 2 + 12, 198);
    doc.text(`Rendered Hours: ${payslip.summary.renderedHours.toFixed(2)}`, pageWidth / 2 + 12, 216);
    doc.text(`Overtime Hours: ${payslip.summary.overtimeHours.toFixed(2)}`, pageWidth / 2 + 12, 234);
    doc.text(`Gross Pay: PHP ${payslip.summary.grossPay.toFixed(2)}`, pageWidth / 2 + 12, 252);

    autoTable(doc, {
      startY: 286,
      head: [['Date', 'Clock In', 'Clock Out', 'Hours', 'Regular', 'OT', 'Late', 'Status']],
      body: payslip.attendanceSessions.map(session => [
        session.date,
        session.clockInTime,
        session.clockOutTime,
        session.renderedHours.toFixed(2),
        session.regularHours.toFixed(2),
        session.overtimeHours.toFixed(2),
        `${session.lateMinutes}`,
        session.status
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: [139, 115, 85],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [250, 247, 243]
      },
      styles: {
        lineColor: [233, 224, 214],
        lineWidth: 0.6,
        fontSize: 9.5,
        cellPadding: 6
      },
      margin: { left: 36, right: 36 }
    });

    const finalTableY = brandedDoc.lastAutoTable?.finalY ?? 320;
    doc.setFontSize(10);
    doc.setTextColor(109, 100, 92);
    doc.text('This payslip was generated from recorded attendance sessions and configured payroll policy.', 36, Math.min(finalTableY + 28, pageHeight - 52));

    doc.save(payslip.fileName);
  }
}