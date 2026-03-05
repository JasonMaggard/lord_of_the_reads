import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(params: { limit: number; offset: number; search?: string }) {
    const { limit, offset, search } = params;

    return this.prisma.user.findMany({
      where: search
        ? {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          }
        : undefined,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: limit,
      skip: offset,
    });
  }
}
