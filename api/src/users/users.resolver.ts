import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { UserModel } from './user.model';
import { UsersService } from './users.service';

@Resolver(() => UserModel)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => [UserModel])
  async users(
    @Args('search', { type: () => String, nullable: true }) search?: string,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
    @Args('offset', { type: () => Int, nullable: true }) offset?: number,
  ) {
    const safeLimit = Math.min(Math.max(limit ?? 20, 1), 50);
    const safeOffset = Math.max(offset ?? 0, 0);

    return this.usersService.findMany({
      search: search?.trim() || undefined,
      limit: safeLimit,
      offset: safeOffset,
    });
  }
}
