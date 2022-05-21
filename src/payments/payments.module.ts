import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantRepository } from 'src/restaurants/repositories/restaurant.repository';
import { Payment } from './entities/payment.entity';
import { PaymentsResolver } from './payment.resolver';
import { PaymentsService } from './payment.service';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, RestaurantRepository])],
  providers: [PaymentsResolver, PaymentsService],
})
export class PaymentsModule {}
