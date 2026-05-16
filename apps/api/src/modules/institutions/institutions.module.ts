import { Module } from '@nestjs/common';
import { AcademicYearsController } from './academic-years.controller';
import { AcademicYearsService } from './academic-years.service';
import { InstitutionsController } from './institutions.controller';
import { InstitutionsService } from './institutions.service';
import { TermsController } from './terms.controller';
import { TermsService } from './terms.service';

/** Institution, academic year and term management. ADMIN-only. */
@Module({
  controllers: [InstitutionsController, AcademicYearsController, TermsController],
  providers: [InstitutionsService, AcademicYearsService, TermsService],
})
export class InstitutionsModule {}
