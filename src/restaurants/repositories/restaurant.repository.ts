import { EntityRepository, Repository } from 'typeorm';
import { Restaurant } from '../entities/restaurant.entity';
import { ErrorMessage } from '../errors/errors.message';

@EntityRepository(Restaurant)
export class RestaurantRepository extends Repository<Restaurant> {
  async findRestaurantOrError(restaurantId: number) {
    let restaurant = await this.findOne({
      where: { id: restaurantId },
    });
    if (!restaurant) {
      throw new Error(ErrorMessage.FindOndFail);
    }
    return restaurant;
  }
}
