import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  type CreateAcademicYearInput,
  createAcademicYearSchema,
  type UpdateAcademicYearInput,
  updateAcademicYearSchema,
} from '@opennota/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AcademicYearsService } from './academic-years.service';

@Roles('ADMIN')
@Controller('academic-years')
export class AcademicYearsController {
  constructor(private readonly academicYearsService: AcademicYearsService) {}

  @Get()
  findAll(@Query('institutionId') institutionId?: string) {
    return this.academicYearsService.findAll(institutionId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.academicYearsService.findOne(id);
  }

  @Post()
  create(@Body(new ZodValidationPipe(createAcademicYearSchema)) body: CreateAcademicYearInput) {
    return this.academicYearsService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateAcademicYearSchema)) body: UpdateAcademicYearInput,
  ) {
    return this.academicYearsService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.academicYearsService.remove(id);
  }
}
