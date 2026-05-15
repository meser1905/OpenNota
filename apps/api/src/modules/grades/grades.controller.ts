import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import {
  type BatchUpsertGradesInput,
  batchUpsertGradesSchema,
  type UpsertGradeInput,
  upsertGradeSchema,
} from '@opennota/shared';
import type { JwtPayload } from '../../common/auth/jwt-payload';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { GradesService } from './grades.service';

@Controller('grades')
@Roles('ADMIN', 'PRINCIPAL', 'TEACHER')
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Get()
  list(@Query('evaluationId') evaluationId?: string) {
    return this.gradesService.listByEvaluation(evaluationId);
  }

  /** Students-by-evaluations matrix backing the grade entry sheet. */
  @Get('sheet')
  sheet(@Query('subjectId') subjectId?: string, @Query('termId') termId?: string) {
    return this.gradesService.getGradeSheet(subjectId, termId);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  upsert(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(upsertGradeSchema)) body: UpsertGradeInput,
  ) {
    return this.gradesService.upsertGrade(user, body);
  }

  @Post('batch')
  @HttpCode(HttpStatus.OK)
  batch(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(batchUpsertGradesSchema)) body: BatchUpsertGradesInput,
  ) {
    return this.gradesService.batchUpsert(user, body);
  }
}
