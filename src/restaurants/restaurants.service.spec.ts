import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoryRepository } from './repositories/category.repository';
import { RestaurantRepository } from './repositories/restaurant.repository';
import { RestaurantService } from './restaurants.service';

const mockRepository = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  findOneOrFail: jest.fn(),
  findAndCount: jest.fn(),
  delete: jest.fn(),
  getOrCreate: jest.fn(),
  count: jest.fn(),
});

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('RestaurantService', () => {
  let service: RestaurantService;
  let restaurantRepository: MockRepository<RestaurantRepository>;
  let categoryRepository: MockRepository<CategoryRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RestaurantService,
        {
          provide: getRepositoryToken(CategoryRepository),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(RestaurantRepository),
          useValue: mockRepository(),
        },
      ],
    }).compile();
    service = module.get<RestaurantService>(RestaurantService);
    restaurantRepository = module.get(getRepositoryToken(RestaurantRepository));
    categoryRepository = module.get(getRepositoryToken(CategoryRepository));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it.todo('createRestaurant');
  it.todo('editRestaurant');
  it.todo('deleteRestaurant');
  it.todo('allCategories');
  it.todo('countRestaurants');
  it.todo('findCategoryBySlug');
  it.todo('allRestaurants');
  it.todo('findRestaurantById');
  it.todo('searchRestaurantByName');
});
