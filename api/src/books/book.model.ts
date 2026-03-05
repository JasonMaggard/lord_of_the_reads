import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { AuthorSummaryModel } from './author-summary.model';

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
}
