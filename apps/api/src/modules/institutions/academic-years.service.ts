import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateAcademicYearInput, UpdateAcademicYearInput } from '@opennota/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * CRUD for AcademicYear records. AcademicYear has no soft-delete column, so
 * DELETE is a hard delete. Activating a year deactivates its siblings.
 */
@Injectable()
export class AcademicYearsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(institutionId?: string) {
    return this.prisma.academicYear.findMany({
      where: institutionId ? { institutionId } : undefined,
      orderBy: { year: 'desc' },
    });
  }

  async findOne(id: string) {
    const academicYear = await this.prisma.academicYear.findUnique({ where: { id } });
    if (!academicYear) {
      throw new NotFoundException(`Academic year ${id} was not found`);
    }
    return academicYear;
  }

  /** Creates a year; if `isActive`, deactivates every other year of the institution. */
  create(input: CreateAcademicYearInput) {
    return this.prisma.$transaction(async (tx) => {
      if (input.isActive) {
        await tx.academicYear.updateMany({
          where: { institutionId: input.institutionId, isActive: true },
          data: { isActive: false },
        });
      }
      return tx.academicYear.create({ data: input });
    });
  }

  async update(id: string, input: UpdateAcademicYearInput) {
    const existing = await this.findOne(id);
    return this.prisma.$transaction(async (tx) => {
      if (input.isActive === true) {
        await tx.academicYear.updateMany({
          where: { institutionId: existing.institutionId, isActive: true, id: { not: id } },
          data: { isActive: false },
        });
      }
      return tx.academicYear.update({ where: { id }, data: input });
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.academicYear.delete({ where: { id } });
    return { success: true };
  }
}
