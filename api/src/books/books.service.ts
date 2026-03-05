import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type ReviewStatsRow = {
  bookId: string;
  reviewCount: number;
  reviewMean: Prisma.Decimal;
};

@Injectable()
export class BooksService {
  constructor(private readonly prisma: PrismaService) {}

  private async getReviewStatsByBookIds(bookIds: string[]) {
    if (bookIds.length === 0) {
      return new Map<string, { reviewCount: number; reviewMean: number }>();
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
      },
      orderBy: [{ title: 'asc' }, { id: 'asc' }],
      take: limit,
      skip: offset,
    });

    const reviewStatsByBookId = await this.getReviewStatsByBookIds(rows.map((row) => row.id));

    return rows.map((row) => {
      const stats = reviewStatsByBookId.get(row.id) ?? { reviewCount: 0, reviewMean: 0 };

      return {
      id: row.id,
      title: row.title,
      priceCents: row.priceCents,
      publisherId: row.publisherId,
      authors: row.bookAuthors.map((link) => ({
        id: link.author.id,
        name: link.author.name,
      })),
      reviewCount: stats.reviewCount,
      reviewMean: stats.reviewMean,
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
      },
    });

    if (!row) {
      return null;
    }

    const statsByBookId = await this.getReviewStatsByBookIds([row.id]);
    const stats = statsByBookId.get(row.id) ?? { reviewCount: 0, reviewMean: 0 };

    return {
      id: row.id,
      title: row.title,
      priceCents: row.priceCents,
      publisherId: row.publisherId,
      authors: row.bookAuthors.map((link) => ({
        id: link.author.id,
        name: link.author.name,
      })),
      reviewCount: stats.reviewCount,
      reviewMean: stats.reviewMean,
    };
  }
}
