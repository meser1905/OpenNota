import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import {
  type CreateGradingWeightConfigInput,
  createGradingWeightConfigSchema,
} from '@opennota/shared';
import type { JwtPayload } from '../../common/auth/jwt-payload';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { GradingWeightsService } from './grading-weights.service';

@Controller('grading-weights')
@Roles('ADMIN', 'PRINCIPAL', 'TEACHER')
export class GradingWeightsController {
  constructor(private readonly gradingWeightsService: GradingWeightsService) {}

  @Get()
  get(@Query('subjectId') subjectId?: string, @Query('termId') termId?: string) {
    return this.gradingWeightsService.get(subjectId, termId);
  }

  @Put()
  upsert(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createGradingWeightConfigSchema))
    body: CreateGradingWeightConfigInput,
  ) {
    return this.gradingWeightsService.upsert(user, body);
  }
}
