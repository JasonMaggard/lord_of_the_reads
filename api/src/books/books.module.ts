import { Module } from '@nestjs/common';
import { BooksResolver } from './books.resolver';
import { BooksService } from './books.service';
import { BookReviewStatsLoader } from './book-review-stats.loader';

@Module({
  providers: [BooksResolver, BooksService, BookReviewStatsLoader],
})
export class BooksModule {}
