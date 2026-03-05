import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BooksService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(params: { limit: number; offset: number; search?: string }) {
    const { limit, offset, search } = params;

    return this.prisma.book.findMany({
      where: search
        ? {
            title: {
              contains: search,
              mode: 'insensitive',
            },
          }
        : undefined,
      orderBy: [{ title: 'asc' }, { id: 'asc' }],
      take: limit,
      skip: offset,
    });
  }

  async findById(id: string) {
    return this.prisma.book.findUnique({ where: { id } });
  }
}
