import { Field, InputType, PartialType } from '@nestjs/graphql';
import { CreateRestauarantDto } from './create-restaurant.dto';

@InputType()
export class UpdateRestauarantInputType extends PartialType(
  CreateRestauarantDto,
) {}

@InputType()
export class UpdateRestauarantDto {
  @Field((type) => Number)
  id: number;

  @Field((type) => UpdateRestauarantInputType)
  data: UpdateRestauarantInputType;
}
