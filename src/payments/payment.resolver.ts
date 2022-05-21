import { Mutation, Resolver } from '@nestjs/graphql';
import { CreatePaymentOutput } from './dtos/create-payment.dto';
import { Payment } from './entities/payment.entity';
import { PaymentsService } from './payment.service';

@Resolver((of) => Payment)
export class PaymentsResolver {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Mutation((returns) => CreatePaymentOutput)
  createPayment() {}
}
