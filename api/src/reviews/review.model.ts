import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { GraphQLISODateTime } from '@nestjs/graphql';

@ObjectType()
export class ReviewModel {
  @Field(() => ID)
  id!: string;

  @Field()
  userId!: string;

  @Field()
  bookId!: string;

  @Field(() => Int)
  rating!: number;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;
}
