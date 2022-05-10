import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserRole } from 'src/users/entities/user.entity';
import { Category } from 'src/restaurants/entities/category.entity';
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
      owner: mockUser,
      input: {
        address: '123',
        name: 'BBQ',
        coverImg: 'https//',
        categoryName: 'Korea Bbq',
      },
    };
    it('Restaurant을 만들어야한다.', async () => {
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

    it('예외가 발생하면 실패해야 한다.', async () => {
      categoryRepository.getOrCreate.mockRejectedValue(new Error());
      const result = await service.createRestaurant(
        createRestaurantArgs.owner,
        createRestaurantArgs.input,
      );
      expect(result).toEqual({
        ok: false,
        error: '레스토랑을 만들 수 없습니다.',
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
    it('레스토랑을 찾지 못하면 실패해야한다.', async () => {
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
        error: '해당 restaurant이 존재하지 않습니다.',
      });
    });

    it('레스토랑 Owner가 아니면 실패해야한다.', async () => {
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
        error: 'restaurant의 Owner만 수정할 수 있습니다.',
      });
    });

    it('categoryName을 input으로 안주면 getOrCreate함수는 실행없이 성공해야한다.', async () => {
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

    it('categoryName을 input으로 주면 getOrCreate함수는 실행후 성공해야한다.', async () => {
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

    it('예외가 발생하면 실패해야한다.', async () => {
      restaurantRepository.findOne.mockRejectedValue(new Error());
      const result = await service.editRestaurant(
        editRestaurantArgs.owner,
        editRestaurantArgs.input,
      );
      expect(result).toEqual({
        ok: false,
        error: 'restaurant을 수정할 수 없습니다.',
      });
    });
  });

  describe('deleteRestaurant', () => {
    const deleteRestaurantArgs = {
      owner: mockUser,
      input: { restaurantId: 1 },
    };
    it('restaurant이 존재하지 않으면 실패해야한다.', async () => {
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
        error: '해당 restaurant이 존재하지 않습니다.',
      });
    });

    it('restaurant Owner가 아니면 실패해야한다.', async () => {
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
        error: 'restaurant의 Owner만 수정할 수 있습니다.',
      });
    });

    it('restaurant을 삭제해야 한다.', async () => {
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

    it('예외가 발생하면 실패해야한다.', async () => {
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
        error: 'restaurant을 삭제할 수 없습니다.',
      });
    });
  });

  describe('allCategories', () => {
    it('모든 Categorie들을 찾아야한다.', async () => {
      categoryRepository.find.mockResolvedValue(expect.any(Array));
      const result = await service.allCategories();

      expect(categoryRepository.find).toBeCalledTimes(1);
      expect(categoryRepository.find).toBeCalledWith();

      expect(result).toEqual({
        ok: true,
        categories: expect.any(Array),
      });
    });

    it('예외가 발생하면 실패해야한다.', async () => {
      categoryRepository.find.mockRejectedValue(new Error());
      const result = await service.allCategories();

      expect(categoryRepository.find).toBeCalledTimes(1);
      expect(categoryRepository.find).toBeCalledWith();

      expect(result).toEqual({
        ok: true,
        error: 'Category정보를 불러올 수 없습니다.',
      });
    });
  });
  describe('countRestaurants', () => {
    it('restaurant의 갯수를 반환해야한다.', async () => {
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
    it('category가 존재하지 않으면 실패해야한다.', async () => {
      categoryRepository.findOne.mockResolvedValue(undefined);
      const result = await service.findCategoryBySlug(findCategoryBySlugArgs);

      expect(categoryRepository.findOne).toBeCalledTimes(1);
      expect(categoryRepository.findOne).toBeCalledWith({
        where: { slug: findCategoryBySlugArgs.slug },
      });

      expect(result).toEqual({
        ok: false,
        error: '해당 Category를 찾을 수 없습니다.',
      });
    });

    it('slug로 Category를 찾는데 성공해야한다.', async () => {
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

    it('예외가 발생하면 실패해야한다.', async () => {
      categoryRepository.findOne.mockRejectedValue(new Error());
      const result = await service.findCategoryBySlug(findCategoryBySlugArgs);

      expect(categoryRepository.findOne).toBeCalledTimes(1);
      expect(categoryRepository.findOne).toBeCalledWith({
        where: { slug: findCategoryBySlugArgs.slug },
      });

      expect(result).toEqual({
        ok: false,
        error: 'Category를 찾는데 문제가 생겼습니다.',
      });
    });
  });
  it.todo('allRestaurants');
  it.todo('findRestaurantById');
  it.todo('searchRestaurantByName');
});
