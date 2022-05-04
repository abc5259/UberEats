import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Verification } from './entities/verification.entity';
import { UsersService } from './users.service';
import { JwtService } from 'src/jwt/jwt.service';
import { MailService } from 'src/mail/mail.service';
import { Repository } from 'typeorm';
const mockRepository = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  findOneOrFail: jest.fn(),
  delete: jest.fn(),
});

const mockJwtService = () => ({
  sign: jest.fn(() => 'signed-token'),
  verify: jest.fn(),
});

const mockMailService = () => ({
  sendVerificationEmail: jest.fn(),
});

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('UserService', () => {
  let service: UsersService;
  let userRepository: MockRepository<User>;
  let verificationRepository: MockRepository<Verification>;
  let mailService: MailService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(Verification),
          useValue: mockRepository(),
        },
        {
          provide: JwtService,
          useValue: mockJwtService(),
        },
        {
          provide: MailService,
          useValue: mockMailService(),
        },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
    mailService = module.get<MailService>(MailService);
    jwtService = module.get<JwtService>(JwtService);
    userRepository = module.get(getRepositoryToken(User));
    verificationRepository = module.get(getRepositoryToken(Verification));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAccount', () => {
    const createAccountArgs = {
      email: 'dlwogns3413@gmail.com',
      password: '123',
      role: 0,
    };

    it('유저가 존재하면 실패해야한다.', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 1,
        email: 'dlwogns3413@gmail.com',
      });
      const result = await service.createAccount(createAccountArgs);
      expect(result).toMatchObject({
        ok: false,
        error: '이미 존재하는 이메일 입니다.',
      });
    });

    it('유저가 존재하지 않는다면 새로운 유저를 만들어야한다.', async () => {
      userRepository.findOne.mockResolvedValue(undefined);
      userRepository.create.mockReturnValue(createAccountArgs);
      userRepository.save.mockResolvedValue(createAccountArgs);
      verificationRepository.create.mockReturnValue({
        user: createAccountArgs,
      });
      verificationRepository.save.mockResolvedValue({ code: '', userId: 1 });
      const result = await service.createAccount(createAccountArgs);
      expect(userRepository.create).toHaveBeenCalledTimes(1);
      expect(userRepository.create).toHaveBeenCalledWith(createAccountArgs);

      expect(userRepository.save).toHaveBeenCalledTimes(1);
      expect(userRepository.save).toHaveBeenCalledWith(createAccountArgs);

      expect(verificationRepository.create).toHaveBeenCalledTimes(1);
      expect(verificationRepository.create).toHaveBeenCalledWith({
        user: createAccountArgs,
      });

      expect(verificationRepository.save).toHaveBeenCalledTimes(1);
      expect(verificationRepository.save).toHaveBeenCalledWith({
        user: createAccountArgs,
      });

      expect(mailService.sendVerificationEmail).toHaveBeenCalledTimes(1);
      expect(mailService.sendVerificationEmail).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
      );

      expect(result).toMatchObject({ ok: true });
    });

    it('예외가 발생하면 실패해야한다.', async () => {
      userRepository.findOne.mockRejectedValue(new Error());
      const result = await service.createAccount(createAccountArgs);
      expect(result).toEqual({
        ok: false,
        error: '계정을 생성할 수 없습니다.',
      });
    });
  });

  describe('login', () => {
    const loginArgs = { email: 'dlwogns3413@naver.com', password: '123' };
    it('유저가 존재하지 않는다면 실패해야한다.', async () => {
      userRepository.findOne.mockResolvedValue(undefined);
      const result = await service.login(loginArgs);
      expect(userRepository.findOne).toHaveBeenCalledTimes(1);
      expect(userRepository.findOne).toHaveBeenCalledWith(expect.any(Object));
      expect(result).toEqual({
        ok: false,
        error: '존재하지 않는 이메일입니다.',
      });
    });

    it('비밀번호가 틀리면 실패해야 한다.', async () => {
      const mockedUser = {
        id: 1,
        checkPassword: jest.fn(() => Promise.resolve(false)),
      };
      userRepository.findOne.mockResolvedValue(mockedUser);
      const result = await service.login(loginArgs);
      expect(result).toEqual({
        ok: false,
        error: '비밀번호가 틀렸습니다.',
      });
    });

    it('비밀번호가 맞으면 토큰을 발행한다.', async () => {
      const mockedUser = {
        id: 1,
        checkPassword: jest.fn(() => Promise.resolve(true)),
      };
      userRepository.findOne.mockResolvedValue(mockedUser);
      jwtService.sign;
      const result = await service.login(loginArgs);
      expect(jwtService.sign).toHaveBeenCalledTimes(1);
      expect(jwtService.sign).toHaveBeenCalledWith(expect.any(Number));
      expect(result).toEqual({ ok: true, token: 'signed-token' });
    });

    it('예외가 발생하면 실패해야한다.', async () => {
      userRepository.findOne.mockRejectedValue(new Error());
      const result = await service.login(loginArgs);
      expect(result).toEqual({ ok: false, error: expect.any(Error) });
    });
  });

  describe('findById', () => {
    const findByIdArgs = { id: 1 };
    it('유저가 있으면 해당 유저를 반환해야한다.', async () => {
      userRepository.findOneOrFail.mockResolvedValue(findByIdArgs);
      const result = await service.findById(1);
      expect(result).toEqual({
        ok: true,
        user: findByIdArgs,
      });
    });

    it('유저가 없다면 실패해야한다.', async () => {
      userRepository.findOneOrFail.mockRejectedValue(new Error());
      const result = await service.findById(expect.any(Number));
      expect(result).toEqual({
        ok: false,
        error: '해당 유저를 찾을 수 없습니다.',
      });
    });
  });

  describe('editProfile', () => {
    it('email을 update해야한다.', async () => {
      const oldUser = { email: 'old@naver.com', verified: true };
      const editProfileArgs = { userId: 1, input: { email: 'new@naver.com' } };
      const newVerification = { code: 'uuidCode' };
      const newUser = {
        email: editProfileArgs.input.email,
        verified: false,
      };

      userRepository.findOne.mockResolvedValue(oldUser);
      verificationRepository.create.mockReturnValue(newVerification);
      verificationRepository.save.mockResolvedValue(newVerification);

      const result = await service.editProfile(
        editProfileArgs.userId,
        editProfileArgs.input,
      );

      expect(userRepository.findOne).toHaveBeenCalledTimes(1);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: editProfileArgs.userId },
      });

      expect(verificationRepository.create).toBeCalledTimes(1);
      expect(verificationRepository.create).toHaveBeenCalledWith({
        user: newUser,
      });

      expect(verificationRepository.save).toBeCalledTimes(1);
      expect(verificationRepository.save).toHaveBeenCalledWith(newVerification);

      expect(mailService.sendVerificationEmail).toBeCalledTimes(1);
      expect(mailService.sendVerificationEmail).toBeCalledWith(
        newUser.email,
        newVerification.code,
      );

      expect(result).toEqual({
        ok: true,
      });
    });

    it('password를 update해야한다', async () => {
      const oldUser = { password: 'oldPassword' };
      const editProfileArgs = { userId: 1, input: { password: 'newPassword' } };
      const newUser = { password: editProfileArgs.input.password };
      userRepository.findOne.mockResolvedValue(oldUser);
      const result = await service.editProfile(
        editProfileArgs.userId,
        editProfileArgs.input,
      );

      expect(userRepository.findOne).toHaveBeenCalledTimes(1);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: editProfileArgs.userId },
      });

      expect(userRepository.save).toBeCalledTimes(1);
      expect(userRepository.save).toBeCalledWith(newUser);

      expect(result).toEqual({ ok: true });
    });

    it('예외가 발생하면 실패해야한다.', async () => {
      userRepository.findOne.mockRejectedValue(new Error());
      const editProfileArgs = { userId: 1, input: { email: 'email' } };
      const result = await service.editProfile(
        editProfileArgs.userId,
        editProfileArgs.input,
      );
      expect(result).toEqual({
        ok: false,
        error: expect.any(Error),
      });
    });
  });

  describe('verifyEmail', () => {
    const verifyEmailArgs = { code: 'code' };
    it('verification이 없다면 실패해야한다.', async () => {
      verificationRepository.findOne.mockResolvedValue(undefined);
      const result = await service.verifyEmail(verifyEmailArgs.code);
      expect(result).toEqual({
        ok: false,
        error: 'Verification not found.',
      });
    });

    it('verification이 있다면 verified를 true로 바꿔줘야한다.', async () => {
      const verification = { id: 1, code: 'code', user: { verified: false } };
      verificationRepository.findOne.mockResolvedValue(verification);
      const result = await service.verifyEmail(verifyEmailArgs.code);

      expect(verificationRepository.findOne).toBeCalledTimes(1);
      expect(verificationRepository.findOne).toBeCalledWith({
        where: { code: verifyEmailArgs.code },
        relations: ['user'],
      });

      expect(userRepository.save).toBeCalledTimes(1);
      expect(userRepository.save).toBeCalledWith({ verified: true });

      expect(verificationRepository.delete).toBeCalledTimes(1);
      expect(verificationRepository.delete).toBeCalledWith(verification.id);

      expect(result).toEqual({
        ok: true,
      });
    });

    it('예외가 발생하면 실패해야한다.', async () => {
      verificationRepository.findOne.mockRejectedValue(new Error());
      const result = await service.verifyEmail(verifyEmailArgs.code);

      expect(verificationRepository.findOne).toBeCalledTimes(1);
      expect(verificationRepository.findOne).toBeCalledWith({
        where: { code: verifyEmailArgs.code },
        relations: ['user'],
      });

      expect(result).toEqual({ ok: false, error: 'email 인증 불가' });
    });
  });
});
