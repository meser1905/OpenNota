import { Controller, Get, Param, StreamableFile } from '@nestjs/common';
import type { JwtPayload } from '../../common/auth/jwt-payload';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ReportPdfService } from './report-pdf.service';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly reportPdfService: ReportPdfService,
  ) {}

  /** Students whose report cards the current user may view (own/linked/all). */
  @Get('students')
  getViewableStudents(@CurrentUser() user: JwtPayload) {
    return this.reportsService.getViewableStudents(user);
  }

  /** Report card JSON. Access (own/linked vs any) is enforced in the service. */
  @Get('report-card/:studentId/:termId')
  getReportCard(
    @CurrentUser() user: JwtPayload,
    @Param('studentId') studentId: string,
    @Param('termId') termId: string,
  ) {
    return this.reportsService.getReportCard(user, studentId, termId);
  }

  /** Report card as a downloadable PDF; a copy is also written to ./generated. */
  @Get('report-card/:studentId/:termId/pdf')
  async getReportCardPdf(
    @CurrentUser() user: JwtPayload,
    @Param('studentId') studentId: string,
    @Param('termId') termId: string,
  ): Promise<StreamableFile> {
    const reportCard = await this.reportsService.getReportCard(user, studentId, termId);
    const pdf = await this.reportPdfService.generateReportCard(reportCard);
    this.reportsService.enqueueReportCardCopy(reportCard, pdf);
    return new StreamableFile(pdf, {
      type: 'application/pdf',
      disposition: `attachment; filename="boletin-${reportCard.student.studentNumber}.pdf"`,
    });
  }

  /** Class-group average matrix for a term. Staff only. */
  @Roles('ADMIN', 'PRINCIPAL')
  @Get('class-group/:classGroupId/:termId')
  getClassGroupReport(
    @Param('classGroupId') classGroupId: string,
    @Param('termId') termId: string,
  ) {
    return this.reportsService.getClassGroupReport(classGroupId, termId);
  }
}
