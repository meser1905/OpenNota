import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  type CreateEvaluationInput,
  createEvaluationSchema,
  type UpdateEvaluationInput,
  updateEvaluationSchema,
} from '@opennota/shared';
import type { JwtPayload } from '../../common/auth/jwt-payload';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { EvaluationsService } from './evaluations.service';

@Controller('evaluations')
@Roles('ADMIN', 'PRINCIPAL', 'TEACHER')
export class EvaluationsController {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Query('subjectId') subjectId?: string,
    @Query('termId') termId?: string,
    @Query('classGroupId') classGroupId?: string,
  ) {
    return this.evaluationsService.list(user, { subjectId, termId, classGroupId });
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.evaluationsService.getOne(user, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createEvaluationSchema)) body: CreateEvaluationInput,
  ) {
    return this.evaluationsService.create(user, body);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateEvaluationSchema)) body: UpdateEvaluationInput,
  ) {
    return this.evaluationsService.update(user, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string): Promise<void> {
    await this.evaluationsService.remove(user, id);
  }
}
