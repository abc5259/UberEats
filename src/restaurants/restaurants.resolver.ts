import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CreateRestauarantDto } from './dtos/create-restaurant.dto';
import { UpdateRestauarantDto } from './dtos/update-restaurant.dto';
import { Restaurant } from './entities/restaurant.entity';
import { RestaurantService } from './restaurants.service';

@Resolver((of) => Restaurant)
export class RestaurantResolver {
  constructor(private readonly restaurantService: RestaurantService) {}

  @Query(() => [Restaurant])
  restaurants(): Promise<Restaurant[]> {
    return this.restaurantService.getAll();
  }

  @Mutation((returns) => Boolean)
  async createRestauarants(
    @Args('input') createRestaurantDto: CreateRestauarantDto,
  ): Promise<boolean> {
    try {
      await this.restaurantService.createRestaurant(createRestaurantDto);
      return true;
    } catch (e) {
      console.log(e);
      return false;
    }
  }

  @Mutation((returns) => Boolean)
  async updateRestauarants(
    @Args('input') updateRestauarantDto: UpdateRestauarantDto,
  ): Promise<boolean> {
    try {
      await this.restaurantService.updateRestaurant(updateRestauarantDto);
      return true;
    } catch (e) {
      console.log(e);
      return false;
    }
  }
}
