import { Injectable } from '@nestjs/common';
import { Cron, Interval, SchedulerRegistry, Timeout } from '@nestjs/schedule';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { RestaurantRepository } from 'src/restaurants/repositories/restaurant.repository';
import { User } from 'src/users/entities/user.entity';
import { LessThan, Repository } from 'typeorm';
import {
  CreatePaymentInput,
  CreatePaymentOutput,
} from './dtos/create-payment.dto';
import { GetPaymentsOutput } from './dtos/get-payments.dto';
import { Payment } from './entities/payment.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly payments: Repository<Payment>,
    private readonly restaurants: RestaurantRepository,
    private schedulerRegistry: SchedulerRegistry,
  ) {}

  async createPayment(
    owner: User,
    { transactionId, restaurantId }: CreatePaymentInput,
  ): Promise<CreatePaymentOutput> {
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
      if (restaurant.ownerId !== owner.id) {
        return {
          ok: false,
          error: '접근 권한이 없습니다.',
        };
      }
      await this.payments.save(
        this.payments.create({
          transactionId,
          user: owner,
          restaurant,
        }),
      );
      restaurant.isPromoted = true;
      const date = new Date();
      date.setDate(date.getDate() + 7); //7일 이후까지
      restaurant.promotedUtil = date;
      await this.restaurants.save(restaurant);
      return {
        ok: true,
      };
    } catch (error) {
      return {
        ok: false,
        error: 'payment를 만들 수 없습니다.',
      };
    }
  }

  async getPayments(user: User): Promise<GetPaymentsOutput> {
    try {
      const payments = await this.payments.find({ where: { user } });
      return {
        ok: true,
        payments,
      };
    } catch (error) {
      return {
        ok: false,
        error: 'patments을 가져오는데 문제가 생겼습니다.',
      };
    }
  }

  @Cron('0 30 4 * * *') //매일 새벽4시 30분에 실행
  async checkPromotedRestaurants() {
    const restaurants = await this.restaurants.find({
      where: { isPromoted: true, promotedUtil: LessThan(new Date()) },
    });
    restaurants.forEach(async (restaurant) => {
      restaurant.isPromoted = false;
      restaurant.promotedUtil = null;
      await this.restaurants.save(restaurant);
    });
  }
}
