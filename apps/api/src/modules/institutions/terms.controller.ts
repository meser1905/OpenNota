import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  type CreateTermInput,
  createTermSchema,
  type UpdateTermInput,
  updateTermSchema,
} from '@opennota/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { TermsService } from './terms.service';

// Reading terms is open to every authenticated role (teachers, students and
// guardians all need to pick a term); mutations stay ADMIN-only.
@Controller('terms')
export class TermsController {
  constructor(private readonly termsService: TermsService) {}

  @Get()
  findAll(@Query('academicYearId') academicYearId?: string) {
    return this.termsService.findAll(academicYearId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.termsService.findOne(id);
  }

  @Roles('ADMIN')
  @Post()
  create(@Body(new ZodValidationPipe(createTermSchema)) body: CreateTermInput) {
    return this.termsService.create(body);
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTermSchema)) body: UpdateTermInput,
  ) {
    return this.termsService.update(id, body);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.termsService.remove(id);
  }
}
