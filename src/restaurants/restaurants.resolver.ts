import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CreateRestauarantDto } from './dtos/create-restaurant.dto';
import { Restaurant } from './entities/restaurant.entity';

@Resolver((of) => Restaurant)
export class RestaurantResolver {
  @Query(() => [Restaurant])
  restaurants(@Args('veganOnly') veganOnly: boolean): Restaurant[] {
    console.log(veganOnly);
    return [];
  }

  @Mutation((returns) => Boolean)
  createRestauarants(
    @Args() createRestaurantInput: CreateRestauarantDto,
  ): boolean {
    return true;
  }
}
