import { Injectable } from '@angular/core';
import { ReportColumn, ReportRow } from '../models/report.models';

@Injectable({ providedIn: 'root' })
export class ReportsExportService {
  exportCsv(filename: string, columns: ReportColumn[], rows: ReportRow[]): void {
    const visibleColumns = columns.filter(column => column.visible !== false);
    const headers = visibleColumns.map(column => this.wrapCsv(column.label)).join(',');
    const body = rows
      .map(row => visibleColumns.map(column => this.wrapCsv(String(row[column.key] ?? ''))).join(','))
      .join('\n');

    this.download(`${headers}\n${body}`, `${filename}.csv`, 'text/csv;charset=utf-8;');
  }

  exportExcel(filename: string, columns: ReportColumn[], rows: ReportRow[]): void {
    const visibleColumns = columns.filter(column => column.visible !== false);
    const headerLine = visibleColumns.map(column => column.label).join('\t');
    const body = rows
      .map(row => visibleColumns.map(column => String(row[column.key] ?? '')).join('\t'))
      .join('\n');

    this.download(`${headerLine}\n${body}`, `${filename}.xls`, 'application/vnd.ms-excel');
  }

  exportPdf(filename: string, columns: ReportColumn[], rows: ReportRow[]): void {
    const visibleColumns = columns.filter(column => column.visible !== false);
    const plainText = [
      `Report: ${filename}`,
      '',
      visibleColumns.map(column => column.label).join(' | '),
      ...rows.map(row => visibleColumns.map(column => String(row[column.key] ?? '')).join(' | '))
    ].join('\n');

    this.download(plainText, `${filename}.pdf`, 'application/pdf');
  }

  private download(content: string, filename: string, type: string): void {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private wrapCsv(value: string): string {
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }
}
