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

const EMPTY_BOOK_REVIEW_STATS: BookReviewStats = {
  reviewCount: 0,
  reviewMean: 0,
};

@Injectable()
export class BooksService {
  constructor(private readonly prisma: PrismaService) {}

  private mapReviewStatsRow(row: ReviewStatsRow): BookReviewStats {
    return {
      reviewCount: Number(row.reviewCount),
      reviewMean: Number(Number(row.reviewMean).toFixed(1)),
    };
  }

  private buildBookWhere(search?: string, genreId?: string): Prisma.BookWhereInput | undefined {
    if (!search && !genreId) {
      return undefined;
    }

    return {
      AND: [
        ...(search
          ? [
              {
                OR: [
                  {
                    title: {
                      contains: search,
                      mode: 'insensitive' as const,
                    },
                  },
                  {
                    bookAuthors: {
                      some: {
                        author: {
                          name: {
                            contains: search,
                            mode: 'insensitive' as const,
                          },
                        },
                      },
                    },
                  },
                ],
              },
            ]
          : []),
        ...(genreId
          ? [
              {
                bookGenres: {
                  some: {
                    genreId,
                  },
                },
              },
            ]
          : []),
      ],
    };
  }

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
      rows.map((row) => [row.bookId, this.mapReviewStatsRow(row)]),
    );
  }

  async getReviewStatsForBook(bookId: string): Promise<BookReviewStats> {
    const rows = await this.prisma.$queryRaw<ReviewStatsRow[]>`
      SELECT "bookId", "reviewCount", "reviewMean"
      FROM "book_review_stats"
      WHERE "bookId" = ${bookId}
      LIMIT 1
    `;

    return rows.length > 0 ? this.mapReviewStatsRow(rows[0]) : EMPTY_BOOK_REVIEW_STATS;
  }

  async findMany(params: { limit: number; offset: number; search?: string; genreId?: string }) {
    const { limit, offset, search, genreId } = params;

    const rows = await this.prisma.book.findMany({
      where: this.buildBookWhere(search, genreId),
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

  async findCount(params: { search?: string; genreId?: string }) {
    const { search, genreId } = params;

    return this.prisma.book.count({
      where: this.buildBookWhere(search, genreId),
    });
  }

  async findGenres() {
    return this.prisma.genre.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
      },
    });
  }
}
