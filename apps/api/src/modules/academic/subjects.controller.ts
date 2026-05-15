import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  type AssignTeacherInput,
  assignTeacherSchema,
  type CreateSubjectInput,
  createSubjectSchema,
  type UpdateSubjectInput,
  updateSubjectSchema,
} from '@opennota/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { SubjectsService } from './subjects.service';

@Roles('ADMIN', 'PRINCIPAL')
@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Get()
  findAll(@Query('classGroupId') classGroupId?: string) {
    return this.subjectsService.findAll(classGroupId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subjectsService.findOne(id);
  }

  @Post()
  create(@Body(new ZodValidationPipe(createSubjectSchema)) body: CreateSubjectInput) {
    return this.subjectsService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSubjectSchema)) body: UpdateSubjectInput,
  ) {
    return this.subjectsService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.subjectsService.remove(id);
  }

  @Get(':id/teachers')
  findTeachers(@Param('id') id: string) {
    return this.subjectsService.findTeachers(id);
  }

  @Post(':id/teachers')
  assignTeacher(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(assignTeacherSchema)) body: AssignTeacherInput,
  ) {
    return this.subjectsService.assignTeacher(id, body);
  }

  @Delete(':id/teachers/:assignmentId')
  removeTeacher(@Param('id') id: string, @Param('assignmentId') assignmentId: string) {
    return this.subjectsService.removeTeacher(id, assignmentId);
  }
}
