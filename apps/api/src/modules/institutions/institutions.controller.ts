import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import {
  type CreateInstitutionInput,
  createInstitutionSchema,
  type UpdateInstitutionInput,
  updateInstitutionSchema,
} from '@opennota/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { InstitutionsService } from './institutions.service';

@Roles('ADMIN')
@Controller('institutions')
export class InstitutionsController {
  constructor(private readonly institutionsService: InstitutionsService) {}

  @Get()
  findAll() {
    return this.institutionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.institutionsService.findOne(id);
  }

  @Post()
  create(@Body(new ZodValidationPipe(createInstitutionSchema)) body: CreateInstitutionInput) {
    return this.institutionsService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateInstitutionSchema)) body: UpdateInstitutionInput,
  ) {
    return this.institutionsService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.institutionsService.remove(id);
  }
}
