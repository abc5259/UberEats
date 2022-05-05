import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { getConnection, Repository } from 'typeorm';
import got from 'got';
import { User } from 'src/users/entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Verification } from 'src/users/entities/verification.entity';

jest.mock('got', () => {
  return {
    post: jest.fn(),
  };
});

const GRAPHQL_ENDPOINT = '/graphql';

const testUser = {
  email: 'dlwogns3413@gmail.com',
  password: '123',
  role: 'Client',
};

describe('UserModule (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let verificationRepository: Repository<Verification>;
  let jwtToken: string;

  const baseTest = () => request(app.getHttpServer()).post(GRAPHQL_ENDPOINT);
  const publicTest = (query: string) => baseTest().send({ query });
  const privateTest = (query: string) =>
    baseTest().set('X-JWT', jwtToken).send({ query });

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    userRepository = module.get(getRepositoryToken(User));
    verificationRepository = module.get(getRepositoryToken(Verification));
    await app.init();
  });

  afterAll(async () => {
    await getConnection().dropDatabase();
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 500));
    app.close();
  });

  describe('createAccount', () => {
    it('User을 만들어야한다.', async () => {
      return publicTest(`
          mutation {
            createAccount(input: {
              email: "${testUser.email}"
              password: "${testUser.password}"
              role: ${testUser.role}
            }) {
              ok 
              error 
            }
          }
        `)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.createAccount.ok).toBe(true);
          expect(res.body.data.createAccount.error).toBe(null);
        });
    });

    it('이메일이 이미 있다면 실패해야한다.', async () => {
      return publicTest(`
          mutation {
            createAccount(input: {
              email: "${testUser.email}"
              password: "${testUser.password}"
              role: Client
            }) {
              ok 
              error 
            }
          }
        `)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.createAccount.ok).toBe(false);
          expect(res.body.data.createAccount.error).toEqual(expect.any(String));
        });
    });
  });

  describe('login', () => {
    it('이메일 비밀번호가 맞다면 토큰을 발행하여 준다.', () => {
      return publicTest(`
            mutation {
              login(input: {
                email: "${testUser.email}"
                password: "${testUser.password}"
              }) {
                ok 
                token 
                error 
              }
            }
          `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: { login },
            },
          } = res;
          expect(login.ok).toBe(true);
          expect(login.token).toEqual(expect.any(String));
          expect(login.error).toBe(null);
          jwtToken = login.token;
        });
    });

    it('존재하지 않는 이메일이면 실패해야한다', () => {
      return publicTest(`
            mutation {
              login(input: {
                email: "${testUser.email}fake"
                password: "${testUser.password}"
              }) {
                ok 
                token 
                error 
              }
            }
          `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: { login },
            },
          } = res;
          expect(login.ok).toBe(false);
          expect(login.token).toBe(null);
          expect(login.error).toBe('존재하지 않는 이메일입니다.');
        });
    });

    it('비밀번호가 틀렸다면 실패해야한다', () => {
      return publicTest(`
            mutation {
              login(input: {
                email: "${testUser.email}"
                password: "${testUser.password}fake"
              }) {
                ok 
                token 
                error 
              }
            }
          `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: { login },
            },
          } = res;
          expect(login.ok).toBe(false);
          expect(login.token).toBe(null);
          expect(login.error).toBe('비밀번호가 틀렸습니다.');
        });
    });
  });

  describe('userProfile', () => {
    let userId: number;
    beforeAll(async () => {
      const [user] = await userRepository.find();
      userId = user.id;
    });
    it('id에 해당하는 유저 정보를 제공해야한다.', () => {
      return privateTest(`
          {
            userProfile(userId:${userId}) {
              ok 
              error 
              user {
                id
              }
            }
          }
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                userProfile: {
                  ok,
                  error,
                  user: { id },
                },
              },
            },
          } = res;
          expect(ok).toBe(true);
          expect(error).toBe(null);
          expect(id).toBe(userId);
        });
    });
    it('id에 해당하는 유저가 없다면 실패해야한다.', () => {
      return privateTest(`
          {
            userProfile(userId:666) {
              ok 
              error 
              user {
                id
              }
            }
          }
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                userProfile: { ok, error, user },
              },
            },
          } = res;
          expect(ok).toBe(false);
          expect(error).toBe('해당 유저를 찾을 수 없습니다.');
          expect(user).toBe(null);
        });
    });
  });

  describe('me', () => {
    it('로그인한 유저 정보를 반환해야한다.', () => {
      return privateTest(`
          {
            me {
              email 
              role 
            }
          }
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                me: { email, role },
              },
            },
          } = res;
          expect(email).toBe(testUser.email);
          expect(role).toBe(testUser.role);
        });
    });

    it('토큰이 일치하지 않는다면 실패해야한다', () => {
      return publicTest(`
          {
            me {
              email 
              role 
            }
          }
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: { errors },
          } = res;
          const [error] = errors;
          console.log(res.body);
          expect(error.message).toBe('Forbidden resource');
        });
    });
  });

  describe('editProfile', () => {
    const NEW_EMAIL = 'dlwogns3413@naver.com';
    const NEW_PASSWORD = '12345';
    it('email과 password 업데이트 해야한다.', () => {
      return privateTest(`
            mutation {
              editProfile(input: {
                email: "${NEW_EMAIL}"
                password: "${NEW_PASSWORD}"
              }) {
                ok 
                error 
              }
            }
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                editProfile: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(true);
          expect(error).toBe(null);
        });
    });
    it('유저의 email이 바껴야하고 verified가 false가 되야한다.', () => {
      return privateTest(`
              {
                me {
                  email 
                  verified
                }
              }
            `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                me: { email, verified },
              },
            },
          } = res;
          expect(email).toBe(NEW_EMAIL);
          expect(verified).toBe(false);
        });
    });
    it('업데이트된 이메일과 비밀번호로 로그인이 되야한다', () => {
      return publicTest(`
            mutation {
              login(input: {
                email: "${NEW_EMAIL}"
                password: "${NEW_PASSWORD}"
              }) {
                ok 
                token 
                error 
              }
            }
          `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: { login },
            },
          } = res;
          expect(login.ok).toBe(true);
          expect(login.token).toEqual(expect.any(String));
          expect(login.error).toBe(null);
          jwtToken = login.token;
        });
    });
  });

  describe('verifyEmail', () => {
    let verificationCode: string;
    beforeAll(async () => {
      const [verification] = await verificationRepository.find();
      verificationCode = verification.code;
    });
    it('code가 올바르지 않다면 이메일 인증은 실패해야한다.', () => {
      return publicTest(`
          mutation {
            verifyEmail(input: {code: "xxxxxx"}) {
              ok 
              error
            }
          }
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                verifyEmail: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(false);
          expect(error).toBe('Verification not found.');
        });
    });
    it('이메일을 인증해야한다.', () => {
      return publicTest(`
          mutation {
            verifyEmail(input: {code: "${verificationCode}"}) {
              ok 
              error
            }
          }
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                verifyEmail: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(true);
          expect(error).toBe(null);
        });
    });
  });
});
