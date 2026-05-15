import { Module } from '@nestjs/common';
import { GradeCalculationService } from './grade-calculation.service';
import { GradesController } from './grades.controller';
import { GradesService } from './grades.service';

/**
 * Grade entry and the term-average calculation engine.
 * `GradeCalculationService` is exported so the reports module can reuse it.
 */
@Module({
  controllers: [GradesController],
  providers: [GradesService, GradeCalculationService],
  exports: [GradeCalculationService],
})
export class GradesModule {}
