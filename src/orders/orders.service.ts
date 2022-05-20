import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PubSub } from 'graphql-subscriptions';
import {
  NEW_COOKED_ORDER,
  NEW_ORDER_UPDATE,
  NEW_PENDING_ORDER,
  PUB_SUB,
} from 'src/common/common.constants';
import { Dish } from 'src/restaurants/entities/dish.entity';
import { RestaurantRepository } from 'src/restaurants/repositories/restaurant.repository';
import { User, UserRole } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { CreateOrderInput, CreateOrderOutput } from './dtos/create-order.dto';
import { EditOrderInput, EditOrderOutput } from './dtos/edit-order.dto';
import { GetOrderInput, GetOrderOutput } from './dtos/get-order.dto';
import { GetOrdersInput, GetOrdersOutput } from './dtos/get-orders.dto';
import { TakeOrderInput, TakeOrderOutput } from './dtos/take-order.dto';
import { OrderItem } from './entities/order-item.entity';
import { Order, OrderStatus } from './entities/order.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orders: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItems: Repository<OrderItem>,
    @InjectRepository(Dish)
    private readonly dishes: Repository<Dish>,
    private readonly restaurants: RestaurantRepository,
    @Inject(PUB_SUB)
    private readonly pubsub: PubSub,
  ) {}

  async createOrder(
    customer: User,
    { restaurantId, items }: CreateOrderInput,
  ): Promise<CreateOrderOutput> {
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
      let orderFinalPrice = 0;
      const orderItems: OrderItem[] = [];
      for (const item of items) {
        const dish = await this.dishes.findOne({ where: { id: item.dishId } });
        if (!dish) {
          // error 처리
          return {
            ok: false,
            error: 'dish를 찾을 수 없습니다.',
          };
        }
        let dishFinalPrice = dish.price;
        for (const itemOptions of item.options) {
          const dishOption = dish.opsions.find(
            (dishOption) => dishOption.name === itemOptions.name,
          );
          if (dishOption) {
            if (dishOption.extra) {
              console.log(`추가 돈 + ${dishOption.extra}`);
              dishFinalPrice += dishOption.extra;
            } else {
              const dishOptionChoice = dishOption.choices.find(
                (optionChoice) => optionChoice.name === itemOptions.choice,
              );
              if (dishOptionChoice) {
                if (dishOptionChoice.extra) {
                  console.log(`추가 돈 + ${dishOptionChoice.extra}`);
                  dishFinalPrice += dishOptionChoice.extra;
                }
              }
            }
          }
        }
        orderFinalPrice += dishFinalPrice;
        const orderItem = await this.orderItems.save(
          this.orderItems.create({
            dish,
            opsions: item.options,
          }),
        );
        orderItems.push(orderItem);
      }
      const order = await this.orders.save(
        this.orders.create({
          restaurant,
          customer,
          total: orderFinalPrice,
          items: orderItems,
        }),
      );
      await this.pubsub.publish(NEW_PENDING_ORDER, {
        pendingOrders: { order, ownerId: restaurant.ownerId },
      });
      return {
        ok: true,
      };
    } catch (error) {
      return {
        ok: false,
        error: '주문을 할 수 없습니다.',
      };
    }
  }

  async getOrders(
    user: User,
    { status }: GetOrdersInput,
  ): Promise<GetOrdersOutput> {
    try {
      let orders: Order[] = [];
      if (user.role === UserRole.Client) {
        orders = await this.orders.find({
          where: { ...(status && { status }), customer: user },
        });
      } else if (user.role === UserRole.Delivery) {
        orders = await this.orders.find({
          where: { status, driver: user },
        });
      } else if (user.role === UserRole.Owner) {
        const restaurants = await this.restaurants.find({
          where: {
            ...(status && { status }),
            owner: user,
          },
          relations: ['orders'],
        });
        orders = restaurants.map((restaurant) => restaurant.orders).flat(1);
        if (status) {
          orders = orders.filter((order) => order.status === status);
        }
      }
      return {
        ok: true,
        orders,
      };
    } catch (error) {
      return {
        ok: false,
        error,
      };
    }
  }

  canSeeOrder(user: User, order: Order): boolean {
    let canSee = true;
    if (user.role === UserRole.Client && order.customerId !== user.id) {
      canSee = false;
    }
    if (user.role === UserRole.Delivery && order.driverId !== user.id) {
      canSee = false;
    }
    if (user.role === UserRole.Owner && order.restaurant.ownerId !== user.id) {
      canSee = false;
    }
    return canSee;
  }

  canEditOrder(user: User, status: OrderStatus): boolean {
    let canEdit = true;
    if (user.role === UserRole.Client) {
      canEdit = false;
    }
    if (user.role === UserRole.Owner) {
      if (status !== OrderStatus.Cooking && status !== OrderStatus.Cooked) {
        canEdit = false;
      }
    }
    if (user.role === UserRole.Delivery) {
      if (status !== OrderStatus.PickedUp && status !== OrderStatus.Delivered) {
        canEdit = false;
      }
    }
    return canEdit;
  }

  async getOrder(user: User, { id }: GetOrderInput): Promise<GetOrderOutput> {
    try {
      const order = await this.orders.findOne({
        where: { id },
      });
      if (!order) {
        return {
          ok: false,
          error: '주문을 찾을 수 없습니다.',
        };
      }
      if (!this.canSeeOrder(user, order)) {
        throw new Error();
      }
      return {
        ok: true,
        order,
      };
    } catch (error) {
      return {
        ok: false,
        error: '주문을 로드할 수 없습니다.',
      };
    }
  }

  async editOrder(
    user: User,
    { id, status }: EditOrderInput,
  ): Promise<EditOrderOutput> {
    try {
      const order = await this.orders.findOne({
        where: { id },
      });
      if (!order) {
        return {
          ok: false,
          error: '주문을 찾을 수 없습니다.',
        };
      }
      if (!this.canSeeOrder(user, order)) {
        throw new Error();
      }
      if (!this.canEditOrder(user, status)) {
        return {
          ok: false,
          error: '수정 권한이 없습니다.',
        };
      }
      await this.orders.save({
        id: order.id,
        status,
      });
      const updateOrder = { ...order, status };
      if (user.role === UserRole.Owner) {
        if (status === OrderStatus.Cooked) {
          await this.pubsub.publish(NEW_COOKED_ORDER, {
            cookedOrders: updateOrder,
          });
        }
      }
      await this.pubsub.publish(NEW_ORDER_UPDATE, {
        orderUpdates: updateOrder,
      });
      return {
        ok: true,
      };
    } catch (error) {
      return {
        ok: false,
        error,
      };
    }
  }

  async takeOrder(
    driver: User,
    { id }: TakeOrderInput,
  ): Promise<TakeOrderOutput> {
    try {
      const order = await this.orders.findOne({ where: { id } });
      if (!order) {
        return {
          ok: false,
          error: 'order을 찾을 수 없습니다.',
        };
      }
      if (order.driverId) {
        return {
          ok: false,
          error: '이미 배달이 잡힌 order입니다.',
        };
      }
      await this.orders.save({
        id: order.id,
        driver,
      });
      await this.pubsub.publish(NEW_ORDER_UPDATE, {
        orderUpdates: { ...order, driver },
      });
      return {
        ok: true,
      };
    } catch (error) {
      return {
        ok: false,
        error: 'order을 업데이트 할 수 없습니다.',
      };
    }
  }
}
