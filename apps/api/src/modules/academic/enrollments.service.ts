import { Injectable, NotFoundException } from '@nestjs/common';
import type { Enrollment } from '@opennota/db';
import type { EnrollStudentInput } from '@opennota/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

/** Manages student enrollments. Enrollment has no soft-delete; DELETE is hard. */
@Injectable()
export class EnrollmentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filters: { classGroupId?: string; academicYearId?: string }) {
    return this.prisma.enrollment.findMany({
      where: {
        ...(filters.classGroupId ? { classGroupId: filters.classGroupId } : {}),
        ...(filters.academicYearId ? { academicYearId: filters.academicYearId } : {}),
      },
      include: { student: { include: { user: { omit: { passwordHash: true } } } } },
      orderBy: { enrolledAt: 'desc' },
    });
  }

  /** `studentId` refers to a StudentProfile id. */
  create(input: EnrollStudentInput): Promise<Enrollment> {
    return this.prisma.enrollment.create({ data: input });
  }

  async remove(id: string) {
    const enrollment = await this.prisma.enrollment.findUnique({ where: { id } });
    if (!enrollment) {
      throw new NotFoundException(`Enrollment ${id} was not found`);
    }
    await this.prisma.enrollment.delete({ where: { id } });
    return { success: true };
  }
}
