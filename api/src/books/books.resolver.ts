import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { BookModel } from './book.model';
import { BooksService } from './books.service';

@Resolver(() => BookModel)
export class BooksResolver {
  constructor(private readonly booksService: BooksService) {}

  @Query(() => [BookModel])
  async books(
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
    @Args('offset', { type: () => Int, nullable: true }) offset?: number,
    @Args('search', { type: () => String, nullable: true }) search?: string,
  ) {
    const safeLimit = Math.min(Math.max(limit ?? 20, 1), 50);
    const safeOffset = Math.min(Math.max(offset ?? 0, 0), 10_000);
    const normalizedSearch = search?.trim().slice(0, 100) || undefined;

    return this.booksService.findMany({
      limit: safeLimit,
      offset: safeOffset,
      search: normalizedSearch,
    });
  }

  @Query(() => BookModel, { nullable: true })
  async book(@Args('id', { type: () => String }) id: string) {
    return this.booksService.findById(id);
  }
}
