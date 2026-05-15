import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  type CreateClassGroupInput,
  createClassGroupSchema,
  type UpdateClassGroupInput,
  updateClassGroupSchema,
} from '@opennota/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ClassGroupsService } from './class-groups.service';

@Roles('ADMIN', 'PRINCIPAL')
@Controller('class-groups')
export class ClassGroupsController {
  constructor(private readonly classGroupsService: ClassGroupsService) {}

  @Get()
  findAll(@Query('academicYearId') academicYearId?: string) {
    return this.classGroupsService.findAll(academicYearId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.classGroupsService.findOne(id);
  }

  @Post()
  create(@Body(new ZodValidationPipe(createClassGroupSchema)) body: CreateClassGroupInput) {
    return this.classGroupsService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateClassGroupSchema)) body: UpdateClassGroupInput,
  ) {
    return this.classGroupsService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.classGroupsService.remove(id);
  }
}
