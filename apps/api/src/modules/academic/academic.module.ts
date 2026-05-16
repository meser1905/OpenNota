import { Module } from '@nestjs/common';
import { ClassGroupsController } from './class-groups.controller';
import { ClassGroupsService } from './class-groups.service';
import { EnrollmentsController } from './enrollments.controller';
import { EnrollmentsService } from './enrollments.service';
import { SubjectsController } from './subjects.controller';
import { SubjectsService } from './subjects.service';

/** Class group, subject and enrollment management. ADMIN/PRINCIPAL-only. */
@Module({
  controllers: [ClassGroupsController, SubjectsController, EnrollmentsController],
  providers: [ClassGroupsService, SubjectsService, EnrollmentsService],
})
export class AcademicModule {}
