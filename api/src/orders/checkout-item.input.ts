import { Field, InputType, Int } from '@nestjs/graphql';
import { Format } from './format.enum';

@InputType()
export class CheckoutItemInput {
  @Field()
  bookId!: string;

  @Field(() => Format)
  format!: Format;

  @Field(() => Int)
  quantity!: number;
}
