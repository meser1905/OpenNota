import { Module } from '@nestjs/common';
import { EvaluationsController } from './evaluations.controller';
import { EvaluationsService } from './evaluations.service';
import { GradingWeightsController } from './grading-weights.controller';
import { GradingWeightsService } from './grading-weights.service';

@Module({
  controllers: [EvaluationsController, GradingWeightsController],
  providers: [EvaluationsService, GradingWeightsService],
  exports: [EvaluationsService],
})
export class EvaluationsModule {}
