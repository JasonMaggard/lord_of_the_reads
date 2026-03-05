import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Format } from './format.enum';

@ObjectType()
export class OrderItemModel {
  @Field()
  bookId!: string;

  @Field(() => Format)
  format!: Format;

  @Field(() => Int)
  quantity!: number;

  @Field(() => Int)
  unitPriceCents!: number;
}
