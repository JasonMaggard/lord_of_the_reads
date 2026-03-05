import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import { AuthorSummaryModel } from './author-summary.model';
import { GenreSummaryModel } from './genre-summary.model';

@ObjectType()
export class BookModel {
  @Field(() => ID)
  id!: string;

  @Field()
  title!: string;

  @Field(() => Int)
  priceCents!: number;

  @Field()
  publisherId!: string;

  @Field(() => [AuthorSummaryModel])
  authors!: AuthorSummaryModel[];

  @Field(() => [GenreSummaryModel])
  genres!: GenreSummaryModel[];

  @Field(() => Int)
  reviewCount!: number;

  @Field(() => Float)
  reviewMean!: number;
}
