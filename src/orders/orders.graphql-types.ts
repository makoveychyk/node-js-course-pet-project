import {
  Field,
  GraphQLISODateTime,
  ID,
  InputType,
  Int,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { Order, OrderStatus } from './order.entity';
import { OrderItem } from './order-item.entity';
import { Product } from '../products/product.entity';

registerEnumType(OrderStatus, { name: 'OrderStatus' });

@ObjectType('Product')
export class ProductGraphModel implements Pick<Product, 'id' | 'title' | 'price'> {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field()
  price: string;
}

@ObjectType('OrderItem')
export class OrderItemGraphModel
  implements
    Pick<
      OrderItem,
      'id' | 'orderId' | 'productId' | 'quantity' | 'priceSnapshot'
    >
{
  @Field(() => ID)
  id: string;

  @Field()
  orderId: string;

  @Field()
  productId: string;

  @Field(() => Int)
  quantity: number;

  @Field()
  priceSnapshot: string;

  @Field(() => ProductGraphModel)
  product: ProductGraphModel;
}

@ObjectType('Order')
export class OrderGraphModel
  implements Pick<Order, 'id' | 'userId' | 'status' | 'createdAt'>
{
  @Field(() => ID)
  id: string;

  @Field()
  userId: string;

  @Field(() => OrderStatus)
  status: OrderStatus;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => [OrderItemGraphModel])
  items: OrderItemGraphModel[];
}

@InputType()
export class OrdersFilterInput {
  @Field({ nullable: true })
  userId?: string;

  @Field(() => OrderStatus, { nullable: true })
  status?: OrderStatus;

  @Field(() => GraphQLISODateTime, { nullable: true })
  dateFrom?: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  dateTo?: Date;
}

@InputType()
export class OrdersPaginationInput {
  @Field(() => Int, { nullable: true })
  limit?: number;

  @Field(() => Int, { nullable: true })
  offset?: number;
}
