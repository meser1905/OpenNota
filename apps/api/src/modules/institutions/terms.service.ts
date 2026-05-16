import { Injectable, NotFoundException } from '@nestjs/common';
import type { Term } from '@opennota/db';
import type { CreateTermInput, UpdateTermInput } from '@opennota/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

/** CRUD for Term records. Term has no soft-delete column; DELETE is hard. */
@Injectable()
export class TermsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(academicYearId?: string) {
    return this.prisma.term.findMany({
      where: academicYearId ? { academicYearId } : undefined,
      orderBy: { number: 'asc' },
    });
  }

  async findOne(id: string) {
    const term = await this.prisma.term.findUnique({ where: { id } });
    if (!term) {
      throw new NotFoundException(`Term ${id} was not found`);
    }
    return term;
  }

  create(input: CreateTermInput): Promise<Term> {
    return this.prisma.term.create({ data: input });
  }

  async update(id: string, input: UpdateTermInput) {
    await this.findOne(id);
    return this.prisma.term.update({ where: { id }, data: input });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.term.delete({ where: { id } });
    return { success: true };
  }
}
