import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  type CreateGuardianProfileInput,
  createGuardianProfileSchema,
  type CreateStudentProfileInput,
  createStudentProfileSchema,
  type CreateTeacherProfileInput,
  createTeacherProfileSchema,
  type CreateUserInput,
  createUserSchema,
  type LinkGuardianInput,
  linkGuardianSchema,
  type UpdateUserInput,
  updateUserSchema,
  type UserRole,
} from '@opennota/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { UsersService } from './users.service';

// Reading users (list and detail) is open to PRINCIPAL as well — directors
// need the teacher and student lists to staff class groups. Every mutation
// stays ADMIN-only via a per-handler `@Roles('ADMIN')` override.
@Roles('ADMIN', 'PRINCIPAL')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Query('role') role?: UserRole) {
    return this.usersService.findAll(role);
  }

  @Roles('ADMIN')
  @Post()
  create(@Body(new ZodValidationPipe(createUserSchema)) body: CreateUserInput) {
    return this.usersService.create(body);
  }

  // Profile and link routes are declared before `:id` so their static
  // segments are not captured as an id parameter.

  @Roles('ADMIN')
  @Post('student-profiles')
  createStudentProfile(
    @Body(new ZodValidationPipe(createStudentProfileSchema)) body: CreateStudentProfileInput,
  ) {
    return this.usersService.createStudentProfile(body);
  }

  @Roles('ADMIN')
  @Post('teacher-profiles')
  createTeacherProfile(
    @Body(new ZodValidationPipe(createTeacherProfileSchema)) body: CreateTeacherProfileInput,
  ) {
    return this.usersService.createTeacherProfile(body);
  }

  @Roles('ADMIN')
  @Post('guardian-profiles')
  createGuardianProfile(
    @Body(new ZodValidationPipe(createGuardianProfileSchema)) body: CreateGuardianProfileInput,
  ) {
    return this.usersService.createGuardianProfile(body);
  }

  @Roles('ADMIN')
  @Post('guardian-links')
  linkGuardian(@Body(new ZodValidationPipe(linkGuardianSchema)) body: LinkGuardianInput) {
    return this.usersService.linkGuardian(body);
  }

  @Roles('ADMIN')
  @Delete('guardian-links/:id')
  unlinkGuardian(@Param('id') id: string) {
    return this.usersService.unlinkGuardian(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) body: UpdateUserInput,
  ) {
    return this.usersService.update(id, body);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
