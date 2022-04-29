import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRestauarantDto } from './dtos/create-restaurant.dto';
import { UpdateRestauarantDto } from './dtos/update-restaurant.dto';
import { Restaurant } from './entities/restaurant.entity';

@Injectable()
export class RestaurantService {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurant: Repository<Restaurant>,
  ) {}

  getAll(): Promise<Restaurant[]> {
    return this.restaurant.find();
  }

  createRestaurant(
    createRestaurantDto: CreateRestauarantDto,
  ): Promise<Restaurant> {
    const newRestaurant = this.restaurant.create(createRestaurantDto);
    return this.restaurant.save(newRestaurant);
  }

  updateRestaurant({ id, data }: UpdateRestauarantDto) {
    return this.restaurant.update(id, { ...data });
  }
}
