import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReview(params: { userId: string; bookId: string; rating: number }) {
    const { userId, bookId, rating } = params;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be an integer between 1 and 5');
    }

    try {
      return await this.prisma.review.create({
        data: {
          userId,
          bookId,
          rating,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Review already exists for this user and book');
      }

      throw error;
    }
  }
}
