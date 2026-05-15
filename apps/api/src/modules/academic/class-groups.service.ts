import { Injectable, NotFoundException } from '@nestjs/common';
import type { ClassGroup } from '@opennota/db';
import type { CreateClassGroupInput, UpdateClassGroupInput } from '@opennota/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

/** CRUD for ClassGroup records. Soft-deleted rows are excluded from reads. */
@Injectable()
export class ClassGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(academicYearId?: string) {
    return this.prisma.classGroup.findMany({
      where: { deletedAt: null, ...(academicYearId ? { academicYearId } : {}) },
      orderBy: [{ year: 'asc' }, { section: 'asc' }],
    });
  }

  async findOne(id: string) {
    const classGroup = await this.prisma.classGroup.findFirst({
      where: { id, deletedAt: null },
    });
    if (!classGroup) {
      throw new NotFoundException(`Class group ${id} was not found`);
    }
    return classGroup;
  }

  create(input: CreateClassGroupInput): Promise<ClassGroup> {
    return this.prisma.classGroup.create({ data: input });
  }

  async update(id: string, input: UpdateClassGroupInput) {
    await this.findOne(id);
    return this.prisma.classGroup.update({ where: { id }, data: input });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.classGroup.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }
}
