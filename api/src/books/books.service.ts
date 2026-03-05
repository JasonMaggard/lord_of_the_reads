import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BooksService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(params: { limit: number; offset: number; search?: string }) {
    const { limit, offset, search } = params;

    const rows = await this.prisma.book.findMany({
      where: search
        ? {
            OR: [
              {
                title: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                bookAuthors: {
                  some: {
                    author: {
                      name: {
                        contains: search,
                        mode: 'insensitive',
                      },
                    },
                  },
                },
              },
            ],
          }
        : undefined,
      include: {
        bookAuthors: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [{ title: 'asc' }, { id: 'asc' }],
      take: limit,
      skip: offset,
    });

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      priceCents: row.priceCents,
      publisherId: row.publisherId,
      authors: row.bookAuthors.map((link) => ({
        id: link.author.id,
        name: link.author.name,
      })),
    }));
  }

  async findById(id: string) {
    const row = await this.prisma.book.findUnique({
      where: { id },
      include: {
        bookAuthors: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      title: row.title,
      priceCents: row.priceCents,
      publisherId: row.publisherId,
      authors: row.bookAuthors.map((link) => ({
        id: link.author.id,
        name: link.author.name,
      })),
    };
  }
}
