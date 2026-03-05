import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type ReviewStatsRow = {
  bookId: string;
  reviewCount: number;
  reviewMean: Prisma.Decimal;
};

export type BookReviewStats = {
  reviewCount: number;
  reviewMean: number;
};

@Injectable()
export class BooksService {
  constructor(private readonly prisma: PrismaService) {}

  async getReviewStatsByBookIds(bookIds: string[]): Promise<Map<string, BookReviewStats>> {
    if (bookIds.length === 0) {
      return new Map<string, BookReviewStats>();
    }

    const rows = await this.prisma.$queryRaw<ReviewStatsRow[]>`
      SELECT "bookId", "reviewCount", "reviewMean"
      FROM "book_review_stats"
      WHERE "bookId" IN (${Prisma.join(bookIds)})
    `;

    return new Map(
      rows.map((row) => [
        row.bookId,
        {
          reviewCount: Number(row.reviewCount),
          reviewMean: Number(Number(row.reviewMean).toFixed(1)),
        },
      ]),
    );
  }

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
        bookGenres: {
          include: {
            genre: {
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

    return rows.map((row) => {
      return {
        id: row.id,
        title: row.title,
        priceCents: row.priceCents,
        publisherId: row.publisherId,
        authors: row.bookAuthors.map((link) => ({
          id: link.author.id,
          name: link.author.name,
        })),
        genres: row.bookGenres.map((link) => ({
          id: link.genre.id,
          name: link.genre.name,
        })),
      };
    });
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
        bookGenres: {
          include: {
            genre: {
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
      genres: row.bookGenres.map((link) => ({
        id: link.genre.id,
        name: link.genre.name,
      })),
    };
  }
}
