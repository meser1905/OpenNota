import { BadRequestException, Injectable } from '@nestjs/common';
import type { GradingWeightConfig } from '@opennota/db';
import type { CreateGradingWeightConfigInput } from '@opennota/shared';
import { AccessControlService } from '../../common/access/access-control.service';
import type { JwtPayload } from '../../common/auth/jwt-payload';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class GradingWeightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessControlService,
  ) {}

  /** Returns the weight config for a subject/term, or null when none is set. */
  async get(
    user: JwtPayload,
    subjectId: string | undefined,
    termId: string | undefined,
  ): Promise<GradingWeightConfig | null> {
    if (!subjectId || !termId) {
      throw new BadRequestException('Both subjectId and termId query parameters are required');
    }
    await this.access.assertCanManageSubject(user, subjectId);
    return this.prisma.gradingWeightConfig.findUnique({
      where: { subjectId_termId: { subjectId, termId } },
    });
  }

  async upsert(
    user: JwtPayload,
    input: CreateGradingWeightConfigInput,
  ): Promise<GradingWeightConfig> {
    await this.access.assertCanManageSubject(user, input.subjectId);
    const weights = {
      examWeight: input.examWeight,
      assignmentWeight: input.assignmentWeight,
      performanceWeight: input.performanceWeight,
      oralWeight: input.oralWeight,
      projectWeight: input.projectWeight,
    };
    return this.prisma.gradingWeightConfig.upsert({
      where: { subjectId_termId: { subjectId: input.subjectId, termId: input.termId } },
      create: { subjectId: input.subjectId, termId: input.termId, ...weights },
      update: weights,
    });
  }
}
