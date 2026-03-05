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
    const safeOffset = Math.max(offset ?? 0, 0);

    return this.booksService.findMany({
      limit: safeLimit,
      offset: safeOffset,
      search: search?.trim() || undefined,
    });
  }

  @Query(() => BookModel, { nullable: true })
  async book(@Args('id', { type: () => String }) id: string) {
    return this.booksService.findById(id);
  }
}
