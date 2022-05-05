import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { getConnection } from 'typeorm';
import got from 'got';

jest.mock('got', () => {
  return {
    post: jest.fn(),
  };
});

const GRAPHQL_ENDPOINT = '/graphql';

const testUser = {
  email: 'dlwogns3413@gmail.com',
  password: '123',
};

describe('UserModule (e2e)', () => {
  let app: INestApplication;
  let jwtToken: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await getConnection().dropDatabase();
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 500));
    app.close();
  });

  describe('createAccount', () => {
    it('User을 만들어야한다.', async () => {
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .send({
          query: `
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
        `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.createAccount.ok).toBe(true);
          expect(res.body.data.createAccount.error).toBe(null);
        });
    });

    it('이메일이 이미 있다면 실패해야한다.', async () => {
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .send({
          query: `
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
        `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.createAccount.ok).toBe(false);
          expect(res.body.data.createAccount.error).toEqual(expect.any(String));
        });
    });
  });

  describe('login', () => {
    it('이메일 비밀번호가 맞다면 토큰을 발행하여 준다.', () => {
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .send({
          query: `
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
          `,
        })
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
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .send({
          query: `
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
          `,
        })
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
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .send({
          query: `
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
          `,
        })
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

  it.todo('userProfile');
  it.todo('me');
  it.todo('verifyEmail');
  it.todo('editProfile');
});
