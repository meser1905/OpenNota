import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  GuardianProfile,
  StudentGuardian,
  StudentProfile,
  TeacherProfile,
} from '@opennota/db';
import type {
  CreateGuardianProfileInput,
  CreateStudentProfileInput,
  CreateTeacherProfileInput,
  CreateUserInput,
  LinkGuardianInput,
  UpdateUserInput,
  UserRole,
} from '@opennota/shared';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service';

const BCRYPT_COST = 12;

/**
 * CRUD for User records, the three role-specific profiles and guardian-student
 * links. `passwordHash` is never returned. Users are soft-deleted.
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(role?: UserRole) {
    return this.prisma.user.findMany({
      where: { deletedAt: null, ...(role ? { role } : {}) },
      omit: { passwordHash: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      omit: { passwordHash: true },
      include: { teacherProfile: true, studentProfile: true, guardianProfile: true },
    });
    if (!user) {
      throw new NotFoundException(`User ${id} was not found`);
    }
    return user;
  }

  /** Creates a user; hashes the password and lowercases the email. */
  async create(input: CreateUserInput) {
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
    return this.prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
        isActive: input.isActive,
      },
      omit: { passwordHash: true },
    });
  }

  async update(id: string, input: UpdateUserInput) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: input,
      omit: { passwordHash: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }

  createStudentProfile(input: CreateStudentProfileInput): Promise<StudentProfile> {
    return this.prisma.studentProfile.create({ data: input });
  }

  createTeacherProfile(input: CreateTeacherProfileInput): Promise<TeacherProfile> {
    return this.prisma.teacherProfile.create({ data: input });
  }

  createGuardianProfile(input: CreateGuardianProfileInput): Promise<GuardianProfile> {
    return this.prisma.guardianProfile.create({ data: input });
  }

  /** Links a guardian profile to a student profile. */
  linkGuardian(input: LinkGuardianInput): Promise<StudentGuardian> {
    return this.prisma.studentGuardian.create({ data: input });
  }

  async unlinkGuardian(id: string) {
    const link = await this.prisma.studentGuardian.findUnique({ where: { id } });
    if (!link) {
      throw new NotFoundException(`Guardian link ${id} was not found`);
    }
    await this.prisma.studentGuardian.delete({ where: { id } });
    return { success: true };
  }
}
