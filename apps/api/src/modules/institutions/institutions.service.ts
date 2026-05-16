import { Injectable, NotFoundException } from '@nestjs/common';
import type { Institution } from '@opennota/db';
import type { CreateInstitutionInput, UpdateInstitutionInput } from '@opennota/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

/** CRUD for Institution records. Soft-deleted rows are excluded from reads. */
@Injectable()
export class InstitutionsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.institution.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const institution = await this.prisma.institution.findFirst({
      where: { id, deletedAt: null },
    });
    if (!institution) {
      throw new NotFoundException(`Institution ${id} was not found`);
    }
    return institution;
  }

  create(input: CreateInstitutionInput): Promise<Institution> {
    return this.prisma.institution.create({ data: input });
  }

  async update(id: string, input: UpdateInstitutionInput) {
    await this.findOne(id);
    return this.prisma.institution.update({ where: { id }, data: input });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.institution.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }
}
