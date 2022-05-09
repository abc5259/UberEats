import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserRole } from 'src/users/entities/user.entity';
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
type MockCategoryRepository = Partial<
  Record<keyof CategoryRepository, jest.Mock>
>;

const mockUser: User = {
  id: expect.any(Number),
  email: expect.any(String),
  password: expect.any(String),
  role: expect.any(UserRole),
  verified: expect.any(Boolean),
  restaurants: expect.any(Array),
  hashPassword: jest.fn(),
  checkPassword: jest.fn(),
  createdAt: expect.any(Date),
  updatedAt: expect.any(Date),
};

describe('RestaurantService', () => {
  let service: RestaurantService;
  let restaurantRepository: MockRepository<RestaurantRepository>;
  let categoryRepository: MockCategoryRepository;

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

  describe('createRestaurant', () => {
    const createRestaurantArgs = {
      address: '123',
      name: 'BBQ',
      coverImg: 'https//',
      categoryName: 'Korea Bbq',
    };
    it('Restaurant을 만들어야한다.', async () => {
      restaurantRepository.create.mockReturnValue({ category: null });
      categoryRepository.getOrCreate.mockResolvedValue({
        name: 'bbq',
        slug: 'korea-bbq',
      });
      const result = await service.createRestaurant(
        mockUser,
        createRestaurantArgs,
      );
      expect(restaurantRepository.create).toBeCalledTimes(1);
      expect(restaurantRepository.create).toBeCalledWith({
        owner: mockUser,
        address: createRestaurantArgs.address,
        name: createRestaurantArgs.name,
        coverImg: createRestaurantArgs.coverImg,
      });

      expect(categoryRepository.getOrCreate).toBeCalledTimes(1);
      expect(categoryRepository.getOrCreate).toBeCalledWith(
        createRestaurantArgs.categoryName,
      );

      expect(restaurantRepository.save).toBeCalledTimes(1);
      expect(restaurantRepository.save).toBeCalledWith({
        category: {
          name: 'bbq',
          slug: 'korea-bbq',
        },
      });

      expect(result).toEqual({
        ok: true,
      });
    });

    it('예외가 발생하면 실패해야 한다.', async () => {
      categoryRepository.getOrCreate.mockRejectedValue(new Error());
      const result = await service.createRestaurant(
        mockUser,
        createRestaurantArgs,
      );
      expect(result).toEqual({
        ok: false,
        error: '레스토랑을 만들 수 없습니다.',
      });
    });
  });
  it.todo('editRestaurant');
  it.todo('deleteRestaurant');
  it.todo('allCategories');
  it.todo('countRestaurants');
  it.todo('findCategoryBySlug');
  it.todo('allRestaurants');
  it.todo('findRestaurantById');
  it.todo('searchRestaurantByName');
});
