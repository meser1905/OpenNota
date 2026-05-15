import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Evaluation } from '@opennota/db';
import type { CreateEvaluationInput, UpdateEvaluationInput } from '@opennota/shared';
import type { JwtPayload } from '../../common/auth/jwt-payload';
import { PrismaService } from '../../common/prisma/prisma.service';

interface EvaluationFilter {
  subjectId?: string;
  termId?: string;
  classGroupId?: string;
}

@Injectable()
export class EvaluationsService {
  constructor(private readonly prisma: PrismaService) {}

  list(filter: EvaluationFilter): Promise<Evaluation[]> {
    return this.prisma.evaluation.findMany({
      where: {
        deletedAt: null,
        subjectId: filter.subjectId,
        termId: filter.termId,
        ...(filter.classGroupId ? { subject: { classGroupId: filter.classGroupId } } : {}),
      },
      orderBy: { date: 'asc' },
    });
  }

  async findOne(id: string): Promise<Evaluation> {
    const evaluation = await this.prisma.evaluation.findFirst({
      where: { id, deletedAt: null },
    });
    if (!evaluation) {
      throw new NotFoundException('Evaluation not found');
    }
    return evaluation;
  }

  async create(user: JwtPayload, input: CreateEvaluationInput): Promise<Evaluation> {
    await this.assertCanManageSubject(user, input.subjectId);
    const teacherId = await this.resolveTeacherId(user, input.subjectId);
    return this.prisma.evaluation.create({
      data: {
        subjectId: input.subjectId,
        termId: input.termId,
        teacherId,
        title: input.title,
        description: input.description ?? null,
        type: input.type,
        date: input.date,
        weight: input.weight,
        scale: input.scale,
        maxScore: input.maxScore,
        minScore: input.minScore,
        passingScore: input.passingScore,
        isPublished: input.isPublished,
      },
    });
  }

  async update(user: JwtPayload, id: string, input: UpdateEvaluationInput): Promise<Evaluation> {
    const evaluation = await this.findOne(id);
    await this.assertCanManageSubject(user, evaluation.subjectId);
    return this.prisma.evaluation.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
        type: input.type,
        date: input.date,
        weight: input.weight,
        scale: input.scale,
        maxScore: input.maxScore,
        minScore: input.minScore,
        passingScore: input.passingScore,
        isPublished: input.isPublished,
      },
    });
  }

  async remove(user: JwtPayload, id: string): Promise<void> {
    const evaluation = await this.findOne(id);
    await this.assertCanManageSubject(user, evaluation.subjectId);
    await this.prisma.evaluation.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  /**
   * The owning teacher: the current user when they teach, otherwise the
   * subject's lead teacher (staff create evaluations on a teacher's behalf).
   */
  private async resolveTeacherId(user: JwtPayload, subjectId: string): Promise<string> {
    if (user.role === 'TEACHER') {
      const profile = await this.prisma.teacherProfile.findUnique({
        where: { userId: user.sub },
      });
      if (!profile) {
        throw new ForbiddenException('Your teacher profile could not be found');
      }
      return profile.id;
    }
    const assignment =
      (await this.prisma.teacherSubject.findFirst({ where: { subjectId, isLead: true } })) ??
      (await this.prisma.teacherSubject.findFirst({ where: { subjectId } }));
    if (!assignment) {
      throw new BadRequestException('Assign a teacher to this subject before creating evaluations');
    }
    return assignment.teacherId;
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
