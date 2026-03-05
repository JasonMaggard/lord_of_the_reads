import DataLoader from 'dataloader';
import { Injectable, Scope } from '@nestjs/common';
import { BooksService, BookReviewStats } from './books.service';

@Injectable({ scope: Scope.REQUEST })
export class BookReviewStatsLoader extends DataLoader<string, BookReviewStats> {
  constructor(private readonly booksService: BooksService) {
    super(async (bookIds) => {
      const statsByBookId = await booksService.getReviewStatsByBookIds([...bookIds]);

      return bookIds.map((bookId) => statsByBookId.get(bookId) ?? { reviewCount: 0, reviewMean: 0 });
    });
  }
}
