import {
  Field,
  InputType,
  ObjectType,
  OmitType,
  PickType,
} from '@nestjs/graphql';
import { CoreOutput } from 'src/common/dtos/output.dto';
import { Restaurant } from '../entities/restaurant.entity';

@InputType()
export class CreateRestauarantInput extends PickType(Restaurant, [
  'address',
  'coverImg',
  'name',
]) {
  @Field((type) => String)
  categoryName: string;
}

@ObjectType()
export class CreateRestauarantOutput extends CoreOutput {}
