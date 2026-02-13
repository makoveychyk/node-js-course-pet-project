import { Args, Context, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import {
  OrderGraphModel,
  OrderItemGraphModel,
  OrdersFilterInput,
  OrdersPaginationInput,
  ProductGraphModel,
} from './orders.graphql-types';
import type { GraphqlContext } from '../graphql/graphql.context';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

@Resolver(() => OrderGraphModel)
export class OrdersResolver {
  constructor(private readonly ordersService: OrdersService) {}

  @Query(() => [OrderGraphModel], { name: 'orders' })
  async orders(
    @Args('filter', { nullable: true }) filter?: OrdersFilterInput,
    @Args('pagination', { nullable: true }) pagination?: OrdersPaginationInput,
  ): Promise<Order[]> {
    this.validateDateRange(filter);
    const limit = this.normalizeLimit(pagination?.limit);
    const offset = this.normalizeOffset(pagination?.offset);

    return this.ordersService.listOrders(
      {
        userId: filter?.userId,
        status: filter?.status,
        from: filter?.dateFrom,
        to: filter?.dateTo,
        limit,
        offset,
      },
      { includeItemsProduct: false },
    );
  }

  @ResolveField(() => [OrderItemGraphModel])
  items(@Parent() order: Order) {
    return order.items ?? [];
  }

  private validateDateRange(filter?: OrdersFilterInput) {
    if (
      filter?.dateFrom &&
      filter?.dateTo &&
      filter.dateFrom.getTime() > filter.dateTo.getTime()
    ) {
      throw new BadRequestException('dateFrom must be earlier than dateTo');
    }
  }

  private normalizeLimit(limit?: number | null): number {
    if (limit === undefined || limit === null) {
      return DEFAULT_LIMIT;
    }

    if (!Number.isFinite(limit) || limit <= 0) {
      throw new BadRequestException('limit must be a positive number');
    }

    if (limit > MAX_LIMIT) {
      throw new BadRequestException(`limit cannot exceed ${MAX_LIMIT}`);
    }

    return limit;
  }

  private normalizeOffset(offset?: number | null): number {
    if (offset === undefined || offset === null) {
      return 0;
    }

    if (!Number.isFinite(offset) || offset < 0) {
      throw new BadRequestException('offset must be a non-negative number');
    }

    return offset;
  }
}

@Resolver(() => OrderItemGraphModel)
export class OrderItemsResolver {
  @ResolveField(() => ProductGraphModel)
  async product(
    @Parent() orderItem: OrderItem,
    @Context() context: GraphqlContext,
  ) {
    const product = await context.loaders.productById.load(
      orderItem.productId,
    );

    if (!product) {
      throw new NotFoundException(
        `Product with id ${orderItem.productId} was not found`,
      );
    }

    return product;
  }
}
