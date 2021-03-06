import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserRole } from 'src/users/entities/user.entity';
import { Category } from 'src/restaurants/entities/category.entity';
import { Raw, Repository } from 'typeorm';
import { CategoryRepository } from './repositories/category.repository';
import { RestaurantRepository } from './repositories/restaurant.repository';
import { RestaurantService } from './restaurants.service';
import { Dish } from './entities/dish.entity';

jest.mock('typeorm', () => {
  const actual = jest.requireActual('typeorm');
  return {
    ...actual,
    Raw: jest.fn(),
  };
});

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
  id: 1,
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
  let dishRepository: MockRepository<Dish>;

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
        {
          provide: getRepositoryToken(Dish),
          useValue: mockRepository(),
        },
      ],
    }).compile();
    service = module.get<RestaurantService>(RestaurantService);
    restaurantRepository = module.get(getRepositoryToken(RestaurantRepository));
    categoryRepository = module.get(getRepositoryToken(CategoryRepository));
    dishRepository = module.get(getRepositoryToken(Dish));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRestaurant', () => {
    const createRestaurantArgs = {
      owner: mockUser,
      input: {
        address: '123',
        name: 'BBQ',
        coverImg: 'https//',
        categoryName: 'Korea Bbq',
      },
    };
    it('Restaurant??? ??????????????????.', async () => {
      restaurantRepository.create.mockReturnValue({ category: null });
      categoryRepository.getOrCreate.mockResolvedValue({
        name: 'bbq',
        slug: 'korea-bbq',
      });
      const result = await service.createRestaurant(
        createRestaurantArgs.owner,
        createRestaurantArgs.input,
      );
      expect(restaurantRepository.create).toBeCalledTimes(1);
      expect(restaurantRepository.create).toBeCalledWith({
        owner: mockUser,
        address: createRestaurantArgs.input.address,
        name: createRestaurantArgs.input.name,
        coverImg: createRestaurantArgs.input.coverImg,
      });

      expect(categoryRepository.getOrCreate).toBeCalledTimes(1);
      expect(categoryRepository.getOrCreate).toBeCalledWith(
        createRestaurantArgs.input.categoryName,
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

    it('????????? ???????????? ???????????? ??????.', async () => {
      categoryRepository.getOrCreate.mockRejectedValue(new Error());
      const result = await service.createRestaurant(
        createRestaurantArgs.owner,
        createRestaurantArgs.input,
      );
      expect(result).toEqual({
        ok: false,
        error: '??????????????? ?????? ??? ????????????.',
      });
    });
  });

  describe('editRestaurant', () => {
    const oldRestaurant = {
      restaurantId: 1,
      name: 'BHC',
    };
    const editRestaurantArgs = {
      owner: mockUser,
      input: {
        ...oldRestaurant,
      },
    };
    const editRestaurantArgsWithCategoryName = {
      owner: mockUser,
      input: {
        ...oldRestaurant,
        categoryName: 'korea bhc',
      },
    };
    it('??????????????? ?????? ????????? ??????????????????.', async () => {
      restaurantRepository.findOne.mockResolvedValue(undefined);
      const result = await service.editRestaurant(
        editRestaurantArgs.owner,
        editRestaurantArgs.input,
      );

      expect(restaurantRepository.findOne).toBeCalledTimes(1);
      expect(restaurantRepository.findOne).toBeCalledWith({
        where: { id: editRestaurantArgs.input.restaurantId },
      });

      expect(result).toEqual({
        ok: false,
        error: '?????? restaurant??? ???????????? ????????????.',
      });
    });

    it('???????????? Owner??? ????????? ??????????????????.', async () => {
      restaurantRepository.findOne.mockResolvedValue({ ownerId: 2 });
      const result = await service.editRestaurant(
        editRestaurantArgs.owner,
        editRestaurantArgs.input,
      );

      expect(restaurantRepository.findOne).toBeCalledTimes(1);
      expect(restaurantRepository.findOne).toBeCalledWith({
        where: { id: editRestaurantArgs.input.restaurantId },
      });

      expect(result).toEqual({
        ok: false,
        error: 'restaurant??? Owner??? ????????? ??? ????????????.',
      });
    });

    it('categoryName??? input?????? ????????? getOrCreate????????? ???????????? ??????????????????.', async () => {
      restaurantRepository.findOne.mockResolvedValue({ ownerId: 1 });
      const result = await service.editRestaurant(
        editRestaurantArgs.owner,
        editRestaurantArgs.input,
      );

      expect(restaurantRepository.findOne).toBeCalledTimes(1);
      expect(restaurantRepository.findOne).toBeCalledWith({
        where: { id: editRestaurantArgs.input.restaurantId },
      });

      expect(categoryRepository.getOrCreate).toBeCalledTimes(0);

      expect(restaurantRepository.save).toBeCalledTimes(1);
      expect(restaurantRepository.save).toBeCalledWith([
        {
          id: editRestaurantArgs.input.restaurantId,
          ...editRestaurantArgs.input,
        },
      ]);

      expect(result).toEqual({
        ok: true,
      });
    });

    it('categoryName??? input?????? ?????? getOrCreate????????? ????????? ??????????????????.', async () => {
      restaurantRepository.findOne.mockResolvedValue({ ownerId: 1 });
      categoryRepository.getOrCreate.mockResolvedValue({
        name: 'korea bhc',
        slug: 'korea-bhc',
      });
      const result = await service.editRestaurant(
        editRestaurantArgsWithCategoryName.owner,
        editRestaurantArgsWithCategoryName.input,
      );

      expect(restaurantRepository.findOne).toBeCalledTimes(1);
      expect(restaurantRepository.findOne).toBeCalledWith({
        where: { id: editRestaurantArgs.input.restaurantId },
      });

      expect(categoryRepository.getOrCreate).toBeCalledTimes(1);
      expect(categoryRepository.getOrCreate).toBeCalledWith('korea bhc');

      expect(restaurantRepository.save).toBeCalledTimes(1);
      expect(restaurantRepository.save).toBeCalledWith([
        {
          id: editRestaurantArgsWithCategoryName.input.restaurantId,
          ...editRestaurantArgsWithCategoryName.input,
          category: {
            name: 'korea bhc',
            slug: 'korea-bhc',
          },
        },
      ]);

      expect(result).toEqual({
        ok: true,
      });
    });

    it('????????? ???????????? ??????????????????.', async () => {
      restaurantRepository.findOne.mockRejectedValue(new Error());
      const result = await service.editRestaurant(
        editRestaurantArgs.owner,
        editRestaurantArgs.input,
      );
      expect(result).toEqual({
        ok: false,
        error: 'restaurant??? ????????? ??? ????????????.',
      });
    });
  });

  describe('deleteRestaurant', () => {
    const deleteRestaurantArgs = {
      owner: mockUser,
      input: { restaurantId: 1 },
    };
    it('restaurant??? ???????????? ????????? ??????????????????.', async () => {
      restaurantRepository.findOne.mockResolvedValue(undefined);
      const result = await service.deleteRestaurant(
        deleteRestaurantArgs.owner,
        deleteRestaurantArgs.input,
      );

      expect(restaurantRepository.findOne).toBeCalledTimes(1);
      expect(restaurantRepository.findOne).toBeCalledWith({
        where: { id: deleteRestaurantArgs.input.restaurantId },
      });

      expect(result).toEqual({
        ok: false,
        error: '?????? restaurant??? ???????????? ????????????.',
      });
    });

    it('restaurant Owner??? ????????? ??????????????????.', async () => {
      restaurantRepository.findOne.mockResolvedValue({ ownerId: 2 });
      const result = await service.deleteRestaurant(
        deleteRestaurantArgs.owner,
        deleteRestaurantArgs.input,
      );

      expect(restaurantRepository.findOne).toBeCalledTimes(1);
      expect(restaurantRepository.findOne).toBeCalledWith({
        where: { id: deleteRestaurantArgs.input.restaurantId },
      });

      expect(result).toEqual({
        ok: false,
        error: 'restaurant??? Owner??? ????????? ??? ????????????.',
      });
    });

    it('restaurant??? ???????????? ??????.', async () => {
      restaurantRepository.findOne.mockResolvedValue({ ownerId: 1 });
      const result = await service.deleteRestaurant(
        deleteRestaurantArgs.owner,
        deleteRestaurantArgs.input,
      );

      expect(restaurantRepository.findOne).toBeCalledTimes(1);
      expect(restaurantRepository.findOne).toBeCalledWith({
        where: { id: deleteRestaurantArgs.input.restaurantId },
      });

      expect(restaurantRepository.delete).toBeCalledTimes(1);
      expect(restaurantRepository.delete).toBeCalledWith({ ownerId: 1 });

      expect(result).toEqual({
        ok: true,
      });
    });

    it('????????? ???????????? ??????????????????.', async () => {
      restaurantRepository.findOne.mockRejectedValue(new Error());
      const result = await service.deleteRestaurant(
        deleteRestaurantArgs.owner,
        deleteRestaurantArgs.input,
      );

      expect(restaurantRepository.findOne).toBeCalledTimes(1);
      expect(restaurantRepository.findOne).toBeCalledWith({
        where: { id: deleteRestaurantArgs.input.restaurantId },
      });

      expect(result).toEqual({
        ok: false,
        error: 'restaurant??? ????????? ??? ????????????.',
      });
    });
  });

  describe('allCategories', () => {
    it('?????? Categorie?????? ???????????????.', async () => {
      categoryRepository.find.mockResolvedValue(expect.any(Array));
      const result = await service.allCategories();

      expect(categoryRepository.find).toBeCalledTimes(1);
      expect(categoryRepository.find).toBeCalledWith();

      expect(result).toEqual({
        ok: true,
        categories: expect.any(Array),
      });
    });

    it('????????? ???????????? ??????????????????.', async () => {
      categoryRepository.find.mockRejectedValue(new Error());
      const result = await service.allCategories();

      expect(categoryRepository.find).toBeCalledTimes(1);
      expect(categoryRepository.find).toBeCalledWith();

      expect(result).toEqual({
        ok: true,
        error: 'Category????????? ????????? ??? ????????????.',
      });
    });
  });
  describe('countRestaurants', () => {
    it('restaurant??? ????????? ??????????????????.', async () => {
      restaurantRepository.count.mockResolvedValue(1);
      const result = await service.countRestaurants(expect.any(Category));
      expect(restaurantRepository.count).toBeCalledTimes(1);
      expect(restaurantRepository.count).toBeCalledWith({
        category: expect.any(Category),
      });
      expect(result).toEqual(1);
    });
  });

  describe('findCategoryBySlug', () => {
    const findCategoryBySlugArgs = { slug: 'korea-bbq', page: 1 };
    it('category??? ???????????? ????????? ??????????????????.', async () => {
      categoryRepository.findOne.mockResolvedValue(undefined);
      const result = await service.findCategoryBySlug(findCategoryBySlugArgs);

      expect(categoryRepository.findOne).toBeCalledTimes(1);
      expect(categoryRepository.findOne).toBeCalledWith({
        where: { slug: findCategoryBySlugArgs.slug },
      });

      expect(result).toEqual({
        ok: false,
        error: '?????? Category??? ?????? ??? ????????????.',
      });
    });

    it('slug??? Category??? ????????? ??????????????????.', async () => {
      categoryRepository.findOne.mockResolvedValue({ name: '', slug: '' });
      jest.spyOn(service, 'countRestaurants').mockImplementation(async () => 0);
      restaurantRepository.find.mockResolvedValue([]);
      const result = await service.findCategoryBySlug(findCategoryBySlugArgs);

      expect(categoryRepository.findOne).toBeCalledTimes(1);
      expect(categoryRepository.findOne).toBeCalledWith({
        where: { slug: findCategoryBySlugArgs.slug },
      });

      expect(restaurantRepository.find).toBeCalledTimes(1);
      expect(restaurantRepository.find).toBeCalledWith({
        where: { category: { name: '', slug: '' } },
        take: 25,
        skip: (findCategoryBySlugArgs.page - 1) * 25,
      });

      expect(service.countRestaurants).toBeCalledTimes(1);
      expect(service.countRestaurants).toBeCalledWith({ name: '', slug: '' });
      expect(result).toEqual({
        ok: true,
        category: { name: '', slug: '' },
        results: [],
        totalPages: Math.ceil(0 / 25),
        totalResults: 0,
      });
    });

    it('????????? ???????????? ??????????????????.', async () => {
      categoryRepository.findOne.mockRejectedValue(new Error());
      const result = await service.findCategoryBySlug(findCategoryBySlugArgs);

      expect(categoryRepository.findOne).toBeCalledTimes(1);
      expect(categoryRepository.findOne).toBeCalledWith({
        where: { slug: findCategoryBySlugArgs.slug },
      });

      expect(result).toEqual({
        ok: false,
        error: 'Category??? ????????? ????????? ???????????????.',
      });
    });
  });

  describe('allRestaurants', () => {
    const allRestaurantsArgs = { page: 1 };
    it('?????? Restaurant?????? ???????????? ??????????????????.', async () => {
      restaurantRepository.findAndCount.mockResolvedValue([[], 0]);
      const result = await service.allRestaurants(allRestaurantsArgs);

      expect(restaurantRepository.findAndCount).toBeCalledTimes(1);
      expect(restaurantRepository.findAndCount).toBeCalledWith({
        take: 25,
        skip: (allRestaurantsArgs.page - 1) * 25,
      });

      expect(result).toEqual({
        ok: true,
        results: [],
        totalPages: Math.ceil(0 / 25),
        totalResults: 0,
      });
    });

    it('????????? ???????????? ??????????????????.', async () => {
      restaurantRepository.findAndCount.mockRejectedValue(new Error());
      const result = await service.allRestaurants(allRestaurantsArgs);

      expect(restaurantRepository.findAndCount).toBeCalledTimes(1);
      expect(restaurantRepository.findAndCount).toBeCalledWith({
        take: 25,
        skip: (allRestaurantsArgs.page - 1) * 25,
      });

      expect(result).toEqual({
        ok: false,
        error: expect.any(Error),
      });
    });
  });

  describe('findRestaurantById', () => {
    const findRestaurantByIdArgs = { restaurantId: 1 };
    it('Restaurant??? ??????????????? ??????????????????.', async () => {
      restaurantRepository.findOne.mockResolvedValue(undefined);
      const result = await service.findRestaurantById(findRestaurantByIdArgs);

      expect(restaurantRepository.findOne).toBeCalledTimes(1);
      expect(restaurantRepository.findOne).toBeCalledWith({
        where: { id: findRestaurantByIdArgs.restaurantId },
        relations: ['menu'],
      });

      expect(result).toEqual({
        ok: false,
        error: 'restaurant??? ?????? ??? ????????????.',
      });
    });

    it('id??? ???????????? Restaurant??? ???????????????.', async () => {
      restaurantRepository.findOne.mockResolvedValue({ id: 1 });
      const result = await service.findRestaurantById(findRestaurantByIdArgs);

      expect(restaurantRepository.findOne).toBeCalledTimes(1);
      expect(restaurantRepository.findOne).toBeCalledWith({
        where: { id: findRestaurantByIdArgs.restaurantId },
        relations: ['menu'],
      });

      expect(result).toEqual({
        ok: true,
        restaurant: { id: 1 },
      });
    });

    it('????????? ???????????? ??????????????????.', async () => {
      restaurantRepository.findOne.mockRejectedValue(new Error());
      const result = await service.findRestaurantById(findRestaurantByIdArgs);

      expect(restaurantRepository.findOne).toBeCalledTimes(1);
      expect(restaurantRepository.findOne).toBeCalledWith({
        where: { id: findRestaurantByIdArgs.restaurantId },
        relations: ['menu'],
      });

      expect(result).toEqual({
        ok: false,
        error: 'restaurant??? ????????? ?????????????????????.',
      });
    });
  });

  describe('searchRestaurantByName', () => {
    const searchRestaurantByNameArgs = { query: '', page: 1 };
    it('query??? ???????????? Restaurant??? ???????????????.', async () => {
      restaurantRepository.findAndCount.mockResolvedValue([[], 0]);
      const result = await service.searchRestaurantByName(
        searchRestaurantByNameArgs,
      );
      expect(restaurantRepository.findAndCount).toBeCalledTimes(1);
      expect(Raw).toBeCalledTimes(1);
      expect(Raw).toBeCalledWith(expect.any(Function));
      expect(restaurantRepository.findAndCount).toBeCalledWith({
        where: {
          name: Raw(
            (name) => `${name} ILIKE '%${searchRestaurantByNameArgs.query}%'`,
          ),
        },
        take: 25,
        skip: (searchRestaurantByNameArgs.page - 1) * 25,
      });

      expect(result).toEqual({
        ok: true,
        restaurants: [],
        totalResults: 0,
        totalPages: Math.ceil(0 / 25),
      });
    });
    it('????????? ???????????? ??????????????????.', async () => {
      restaurantRepository.findAndCount.mockRejectedValue(new Error());
      const result = await service.searchRestaurantByName(
        searchRestaurantByNameArgs,
      );
      expect(restaurantRepository.findAndCount).toBeCalledTimes(1);
      expect(Raw).toBeCalled();
      expect(Raw).toBeCalledWith(expect.any(Function));
      expect(restaurantRepository.findAndCount).toBeCalledWith({
        where: {
          name: Raw(
            (name) => `${name} ILIKE '%${searchRestaurantByNameArgs.query}%'`,
          ),
        },
        take: 25,
        skip: (searchRestaurantByNameArgs.page - 1) * 25,
      });

      expect(result).toEqual({
        ok: false,
        error: expect.any(Error),
      });
    });
  });
});
