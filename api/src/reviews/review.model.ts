import { Field, GraphQLISODateTime, ID, Int, ObjectType } from '@nestjs/graphql';

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

  @Field()
  text!: string;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;
}
