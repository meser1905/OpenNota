import { Module } from '@nestjs/common';
import { GradesModule } from '../grades/grades.module';
import { ReportPdfService } from './report-pdf.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

/** Report cards (JSON + PDF) and the class-group average view. */
@Module({
  imports: [GradesModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportPdfService],
})
export class ReportsModule {}
