import { Test } from '@nestjs/testing';
import { CONFIG_OPTIONS } from 'src/common/common.constants';
import { MailService } from './mail.service';
import got from 'got';
import * as FormData from 'form-data';

jest.mock('got');
jest.mock('form-data');

const API_KEY = 'test-apikey';
const DOMAIN = 'test-domain';
const FROM_EMAIL = 'test-fromEmail';

describe('MailService', () => {
  let service: MailService;
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: CONFIG_OPTIONS,
          useValue: { apikey: API_KEY, domain: DOMAIN, fromEmail: FROM_EMAIL },
        },
      ],
    }).compile();
    service = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendVerificationEmail', () => {
    const sendVerificationEmailArgs = { email: 'email', code: 'code' };
    it('sendEmail함수를 호출시켜야한다.', async () => {
      jest.spyOn(service, 'sendEmail').mockImplementation(async () => true);
      service.sendVerificationEmail(
        sendVerificationEmailArgs.email,
        sendVerificationEmailArgs.code,
      );
      expect(service.sendEmail).toHaveBeenCalledTimes(1);
      expect(service.sendEmail).toBeCalledWith('이메일 인증', 'verify-email', [
        { key: 'code', value: sendVerificationEmailArgs.code },
        { key: 'username', value: sendVerificationEmailArgs.email },
      ]);
    });
  });

  describe('sendVerificationEmail', () => {
    it('이메일을 전송해야한다.', async () => {
      const emailVars = [{ key: 'code', value: 'code' }];
      const result = await service.sendEmail('', '', emailVars);
      const formSpy = jest.spyOn(FormData.prototype, 'append');
      expect(formSpy).toBeCalledTimes(5);
      expect(got.post).toBeCalledTimes(1);
      expect(got.post).toBeCalledWith(
        `https://api.mailgun.net/v3/${DOMAIN}/messages`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`api:${API_KEY}`).toString(
              'base64',
            )}`,
          },
          body: expect.any(FormData),
        },
      );
      expect(result).toEqual(true);
    });

    it('예외가 발생하면 false를 리턴한다.', async () => {
      const gotSpy = jest.spyOn(got, 'post');
      gotSpy.mockRejectedValue(new Error());
      const result = await service.sendEmail('', '', []);
      expect(result).toEqual(false);
    });
  });
});
