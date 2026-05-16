import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import type { ReportCard, ReportCardSubject } from './reports.service';

const COLORS = {
  ink: '#0f172a',
  muted: '#475569',
  line: '#cbd5e1',
  headerBg: '#f1f5f9',
  pass: '#15803d',
  fail: '#b91c1c',
  pending: '#94a3b8',
} as const;

const COLUMN = {
  subject: 6,
  average: 260,
  status: 360,
} as const;

/** Renders report cards to PDF using PDFKit. Output is a buffer, no temp files. */
@Injectable()
export class ReportPdfService {
  generateReportCard(reportCard: ReportCard): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      doc.on('error', reject);
      this.render(doc, reportCard);
      doc.end();
    });
  }

  private render(doc: PDFKit.PDFDocument, reportCard: ReportCard): void {
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const width = right - left;

    doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(24).text('OpenNota', left, 48);
    doc
      .fillColor(COLORS.muted)
      .font('Helvetica')
      .fontSize(11)
      .text(reportCard.institution, left, 78);
    doc
      .fillColor(COLORS.ink)
      .font('Helvetica-Bold')
      .fontSize(15)
      .text('Boletín de Calificaciones', left, 98);
    doc.moveTo(left, 122).lineTo(right, 122).strokeColor(COLORS.line).lineWidth(1).stroke();

    const studentName = `${reportCard.student.firstName} ${reportCard.student.lastName}`;
    const info: ReadonlyArray<readonly [string, string]> = [
      ['Estudiante', studentName],
      ['Matrícula', reportCard.student.studentNumber],
      ['Curso', reportCard.classGroup ?? 'Sin asignar'],
      ['Período', `${reportCard.term.name} (${reportCard.academicYear})`],
    ];
    let y = 138;
    for (const [label, value] of info) {
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(COLORS.muted)
        .text(label.toUpperCase(), left, y);
      doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor(COLORS.ink)
        .text(value, left + 120, y);
      y += 20;
    }

    y += 14;
    this.renderTableHeader(doc, left, y, width);
    y += 24;
    for (const subject of reportCard.subjects) {
      if (y > doc.page.height - 120) {
        doc.addPage();
        y = doc.page.margins.top;
        this.renderTableHeader(doc, left, y, width);
        y += 24;
      }
      this.renderSubjectRow(doc, subject, left, y, width);
      y += 22;
    }

    doc.moveTo(left, y).lineTo(right, y).strokeColor(COLORS.line).stroke();
    y += 12;
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(COLORS.ink)
      .text('Promedio general', left + COLUMN.subject, y);
    doc.text(reportCard.overallAverage.toFixed(2), left + COLUMN.average, y, { width: 90 });

    const footer = `Generado por OpenNota el ${reportCard.generatedAt.toLocaleDateString('es')}`;
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text(footer, left, doc.page.height - 70, { width });
  }

  private renderTableHeader(doc: PDFKit.PDFDocument, left: number, y: number, width: number): void {
    doc.rect(left, y - 5, width, 22).fill(COLORS.headerBg);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.muted);
    doc.text('ASIGNATURA', left + COLUMN.subject, y, { width: 248 });
    doc.text('PROMEDIO', left + COLUMN.average, y, { width: 90 });
    doc.text('ESTADO', left + COLUMN.status, y, { width: width - COLUMN.status - 6 });
  }

  private renderSubjectRow(
    doc: PDFKit.PDFDocument,
    subject: ReportCardSubject,
    left: number,
    y: number,
    width: number,
  ): void {
    doc.font('Helvetica').fontSize(10).fillColor(COLORS.ink);
    doc.text(subject.name, left + COLUMN.subject, y, { width: 248 });
    doc.text(
      subject.hasGrades ? subject.average.toFixed(2) : 'Sin notas',
      left + COLUMN.average,
      y,
      {
        width: 90,
      },
    );

    const status = !subject.hasGrades
      ? { label: 'Sin calificar', color: COLORS.pending }
      : subject.passed
        ? { label: 'Aprobado', color: COLORS.pass }
        : { label: 'Desaprobado', color: COLORS.fail };
    doc
      .fillColor(status.color)
      .text(status.label, left + COLUMN.status, y, { width: width - COLUMN.status - 6 });
  }
}
