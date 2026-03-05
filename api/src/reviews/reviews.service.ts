import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReview(params: { userId: string; bookId: string; rating: number; text: string }) {
    const { userId, bookId, rating, text } = params;
    const normalizedText = text.trim();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be an integer between 1 and 5');
    }

    if (!normalizedText) {
      throw new BadRequestException('Review text is required');
    }

    if (normalizedText.length > 2000) {
      throw new BadRequestException('Review text must be 2000 characters or fewer');
    }

    try {
      return await this.prisma.review.create({
        data: {
          userId,
          bookId,
          rating,
          text: normalizedText,
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
