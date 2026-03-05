import { Args, Float, Int, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { BookModel } from './book.model';
import { BooksService } from './books.service';
import { BookReviewStatsLoader } from './book-review-stats.loader';
import { GenreSummaryModel } from './genre-summary.model';

@Resolver(() => BookModel)
export class BooksResolver {
  constructor(
    private readonly booksService: BooksService,
    private readonly bookReviewStatsLoader: BookReviewStatsLoader,
  ) {}

  @Query(() => [BookModel])
  async books(
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
    @Args('offset', { type: () => Int, nullable: true }) offset?: number,
    @Args('search', { type: () => String, nullable: true }) search?: string,
    @Args('genreId', { type: () => String, nullable: true }) genreId?: string,
  ) {
    const safeLimit = Math.min(Math.max(limit ?? 20, 1), 50);
    const safeOffset = Math.min(Math.max(offset ?? 0, 0), 10_000);
    const normalizedSearch = search?.trim().slice(0, 100) || undefined;
    const normalizedGenreId = genreId?.trim() || undefined;

    return this.booksService.findMany({
      limit: safeLimit,
      offset: safeOffset,
      search: normalizedSearch,
      genreId: normalizedGenreId,
    });
  }

  @Query(() => Int)
  async booksCount(
    @Args('search', { type: () => String, nullable: true }) search?: string,
    @Args('genreId', { type: () => String, nullable: true }) genreId?: string,
  ) {
    const normalizedSearch = search?.trim().slice(0, 100) || undefined;
    const normalizedGenreId = genreId?.trim() || undefined;

    return this.booksService.findCount({
      search: normalizedSearch,
      genreId: normalizedGenreId,
    });
  }

  @Query(() => [GenreSummaryModel])
  async genres() {
    return this.booksService.findGenres();
  }

  @Query(() => BookModel, { nullable: true })
  async book(@Args('id', { type: () => String }) id: string) {
    return this.booksService.findById(id);
  }

  @ResolveField(() => Int)
  async reviewCount(@Parent() book: BookModel) {
    const stats = await this.bookReviewStatsLoader.load(book.id);

    return stats.reviewCount;
  }

  @ResolveField(() => Float)
  async reviewMean(@Parent() book: BookModel) {
    const stats = await this.bookReviewStatsLoader.load(book.id);

    return stats.reviewMean;
  }
}
