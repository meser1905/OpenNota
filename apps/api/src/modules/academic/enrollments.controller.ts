import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { type EnrollStudentInput, enrollStudentSchema } from '@opennota/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { EnrollmentsService } from './enrollments.service';

@Roles('ADMIN', 'PRINCIPAL')
@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Get()
  findAll(
    @Query('classGroupId') classGroupId?: string,
    @Query('academicYearId') academicYearId?: string,
  ) {
    return this.enrollmentsService.findAll({ classGroupId, academicYearId });
  }

  @Post()
  create(@Body(new ZodValidationPipe(enrollStudentSchema)) body: EnrollStudentInput) {
    return this.enrollmentsService.create(body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.enrollmentsService.remove(id);
  }
}
