import { Injectable } from '@nestjs/common';
import { User } from 'src/users/entities/user.entity';
import { Raw } from 'typeorm';
import { AllCategoriesOutput } from './dtos/all-category.dto';
import { CategoryInput, CategoryOutput } from './dtos/category.dto';
import {
  CreateRestauarantInput,
  CreateRestauarantOutput,
} from './dtos/create-restaurant.dto';
import {
  DeleteRestaurantInput,
  DeleteRestaurantOutput,
} from './dtos/delete-restaurant.dto';
import {
  EditRestaurantInput,
  EditRestaurantOutput,
} from './dtos/edit-restaurant.dto';
import { RestaurantsInput, RestaurantsOutput } from './dtos/restaurants.dto';
import { RestaurantInput, RestaurantOutput } from './dtos/restuarant.dto';
import {
  SearchRestaurantInput,
  SearchRestaurantOutput,
} from './dtos/search-restaurant.dto';
import { Category } from './entities/category.entity';
import { CategoryRepository } from './repositories/category.repository';
import { RestaurantRepository } from './repositories/restaurant.repository';

@Injectable()
export class RestaurantService {
  constructor(
    private readonly restaurants: RestaurantRepository,
    private readonly categories: CategoryRepository,
  ) {}

  async createRestaurant(
    owner: User,
    createRestaurantDto: CreateRestauarantInput,
  ): Promise<CreateRestauarantOutput> {
    try {
      const newRestaurant = this.restaurants.create({
        owner,
        address: createRestaurantDto.address,
        name: createRestaurantDto.name,
        coverImg: createRestaurantDto.coverImg,
      });
      const category = await this.categories.getOrCreate(
        createRestaurantDto.categoryName,
      );
      newRestaurant.category = category;
      await this.restaurants.save(newRestaurant);
      return {
        ok: true,
      };
    } catch (error) {
      return {
        ok: false,
        error: '레스토랑을 만들 수 없습니다.',
      };
    }
  }

  async editRestaurant(
    owner: User,
    editRestaurantInput: EditRestaurantInput,
  ): Promise<EditRestaurantOutput> {
    try {
      const restaurant = await this.restaurants.findOne({
        where: { id: editRestaurantInput.restaurantId },
      });
      if (!restaurant) {
        return {
          ok: false,
          error: '해당 restaurant이 존재하지 않습니다.',
        };
      }
      if (owner.id !== restaurant.ownerId) {
        return {
          ok: false,
          error: 'restaurant의 Owner만 수정할 수 있습니다.',
        };
      }
      let category: Category = null;
      if (editRestaurantInput.categoryName) {
        category = await this.categories.getOrCreate(
          editRestaurantInput.categoryName,
        );
      }
      console.log(category);
      await this.restaurants.save([
        {
          id: editRestaurantInput.restaurantId,
          ...editRestaurantInput,
          ...(category && { category }),
        },
      ]);
      return {
        ok: true,
      };
    } catch (error) {
      return {
        ok: false,
        error: 'restaurant을 수정할 수 없습니다.',
      };
    }
  }

  async deleteRestaurant(
    owner: User,
    { restaurantId }: DeleteRestaurantInput,
  ): Promise<DeleteRestaurantOutput> {
    try {
      const restaurant = await this.restaurants.findOne({
        where: { id: restaurantId },
      });
      if (!restaurant) {
        return {
          ok: false,
          error: '해당 restaurant이 존재하지 않습니다.',
        };
      }
      if (owner.id !== restaurant.ownerId) {
        return {
          ok: false,
          error: 'restaurant의 Owner만 수정할 수 있습니다.',
        };
      }
      await this.restaurants.delete(restaurant);
      return {
        ok: true,
      };
    } catch (error) {
      return {
        ok: false,
        error: 'restaurant을 삭제할 수 없습니다.',
      };
    }
  }

  async allCategories(): Promise<AllCategoriesOutput> {
    try {
      const categories = await this.categories.find();
      return {
        ok: true,
        categories,
      };
    } catch (error) {
      return {
        ok: true,
        error: 'Category정보를 불러올 수 없습니다.',
      };
    }
  }

  countRestaurants(category: Category) {
    return this.restaurants.count({ category });
  }

  async findCategoryBySlug({
    slug,
    page,
  }: CategoryInput): Promise<CategoryOutput> {
    try {
      const category = await this.categories.findOne({
        where: { slug },
      });
      if (!category) {
        return {
          ok: false,
          error: '해당 Category를 찾을 수 없습니다.',
        };
      }
      const restaurants = await this.restaurants.find({
        where: { category },
        take: 25,
        skip: (page - 1) * 25,
      });
      const totalResults = await this.countRestaurants(category);
      return {
        ok: true,
        category,
        results: restaurants,
        totalPages: Math.ceil(totalResults / 25),
        totalResults,
      };
    } catch (error) {
      return {
        ok: false,
        error: 'Category를 찾는데 문제가 생겼습니다.',
      };
    }
  }

  async allRestaurants({ page }: RestaurantsInput): Promise<RestaurantsOutput> {
    try {
      const [results, totalResults] = await this.restaurants.findAndCount({
        take: 25,
        skip: (page - 1) * 25,
      });
      return {
        ok: true,
        results,
        totalPages: Math.ceil(totalResults / 25),
        totalResults,
      };
    } catch (error) {
      return {
        ok: false,
        error,
      };
    }
  }

  async findRestaurantById({
    restaurantId,
  }: RestaurantInput): Promise<RestaurantOutput> {
    try {
      const restaurant = await this.restaurants.findOne({
        where: { id: restaurantId },
      });
      if (!restaurant) {
        return {
          ok: false,
          error: 'restaurant을 찾을 수 없습니다.',
        };
      }
      return {
        ok: true,
        restaurant,
      };
    } catch (error) {
      return {
        ok: false,
        error: 'restaurant을 찾는데 실패하였습니다.',
      };
    }
  }

  async searchRestaurantByName({
    query,
    page,
  }: SearchRestaurantInput): Promise<SearchRestaurantOutput> {
    try {
      const [restaurants, totalResults] = await this.restaurants.findAndCount({
        where: {
          name: Raw((name) => `${name} ILIKE '%${query}%'`),
        },
        take: 25,
        skip: (page - 1) * 25,
      });
      return {
        ok: true,
        restaurants,
        totalResults,
        totalPages: Math.ceil(totalResults / 25),
      };
    } catch (error) {
      return {
        ok: false,
        error,
      };
    }
  }
}
