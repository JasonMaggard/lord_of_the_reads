import { Args, Int, Mutation, Resolver } from '@nestjs/graphql';
import { ReviewModel } from './review.model';
import { ReviewsService } from './reviews.service';

@Resolver(() => ReviewModel)
export class ReviewsResolver {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Mutation(() => ReviewModel)
  async createReview(
    @Args('userId', { type: () => String }) userId: string,
    @Args('bookId', { type: () => String }) bookId: string,
    @Args('rating', { type: () => Int }) rating: number,
  ) {
    return this.reviewsService.createReview({ userId, bookId, rating });
  }
}
