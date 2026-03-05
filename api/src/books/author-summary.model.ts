import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AuthorSummaryModel {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;
}
