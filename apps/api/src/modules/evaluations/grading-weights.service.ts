import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import type { GradingWeightConfig } from '@opennota/db';
import type { CreateGradingWeightConfigInput } from '@opennota/shared';
import type { JwtPayload } from '../../common/auth/jwt-payload';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class GradingWeightsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns the weight config for a subject/term, or null when none is set. */
  get(
    subjectId: string | undefined,
    termId: string | undefined,
  ): Promise<GradingWeightConfig | null> {
    if (!subjectId || !termId) {
      throw new BadRequestException('Both subjectId and termId query parameters are required');
    }
    return this.prisma.gradingWeightConfig.findUnique({
      where: { subjectId_termId: { subjectId, termId } },
    });
  }

  async upsert(
    user: JwtPayload,
    input: CreateGradingWeightConfigInput,
  ): Promise<GradingWeightConfig> {
    await this.assertCanManageSubject(user, input.subjectId);
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

  private async assertCanManageSubject(user: JwtPayload, subjectId: string): Promise<void> {
    if (user.role === 'ADMIN' || user.role === 'PRINCIPAL') {
      return;
    }
    const assignment = await this.prisma.teacherSubject.findFirst({
      where: { subjectId, teacher: { userId: user.sub } },
    });
    if (!assignment) {
      throw new ForbiddenException('You are not assigned to this subject');
    }
  }
}
