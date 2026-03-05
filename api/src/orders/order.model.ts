import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';
import { OrderItemModel } from './order-item.model';

@ObjectType()
export class OrderModel {
  @Field(() => ID)
  id!: string;

  @Field()
  userId!: string;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => [OrderItemModel])
  items!: OrderItemModel[];
}
