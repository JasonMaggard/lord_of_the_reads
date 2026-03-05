import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CheckoutItemInput } from './checkout-item.input';
import { OrderModel } from './order.model';
import { OrdersService } from './orders.service';

@Resolver(() => OrderModel)
export class OrdersResolver {
  constructor(private readonly ordersService: OrdersService) {}

  @Mutation(() => OrderModel)
  async checkout(
    @Args('userId', { type: () => String }) userId: string,
    @Args('items', { type: () => [CheckoutItemInput] }) items: CheckoutItemInput[],
  ) {
    return this.ordersService.checkout({ userId, items });
  }

  @Query(() => OrderModel, { nullable: true })
  async order(@Args('id', { type: () => String }) id: string) {
    return this.ordersService.findById(id);
  }

  @Query(() => [OrderModel])
  async userOrders(
    @Args('userId', { type: () => String }) userId: string,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
    @Args('offset', { type: () => Int, nullable: true }) offset?: number,
  ) {
    const safeLimit = Math.min(Math.max(limit ?? 20, 1), 50);
    const safeOffset = Math.min(Math.max(offset ?? 0, 0), 10_000);

    return this.ordersService.findByUser(userId.trim(), safeLimit, safeOffset);
  }
}
