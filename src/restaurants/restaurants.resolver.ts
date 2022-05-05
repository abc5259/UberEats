import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthUser } from 'src/auth/auth-user.decorator';
import { Role } from 'src/auth/role.guard';
import { User, UserRole } from 'src/users/entities/user.entity';
import {
  CreateRestauarantInput,
  CreateRestauarantOutput,
} from './dtos/create-restaurant.dto';
import { Restaurant } from './entities/restaurant.entity';
import { RestaurantService } from './restaurants.service';

@Resolver((of) => Restaurant)
export class RestaurantResolver {
  constructor(private readonly restaurantService: RestaurantService) {}

  @Mutation((returns) => CreateRestauarantOutput)
  @Role(['Owner'])
  async createRestauarants(
    @AuthUser() authUser: User,
    @Args('input') createRestauarantInput: CreateRestauarantInput,
  ): Promise<CreateRestauarantOutput> {
    return this.restaurantService.createRestaurant(
      authUser,
      createRestauarantInput,
    );
  }
}
