import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, QueryFailedError, Repository } from 'typeorm';
import { Order, OrderStatus } from './order.entity';
import { OrderItem } from './order-item.entity';
import { Product } from '../products/product.entity';
import { User } from '../users/user.entity';

export type CreateOrderItemInput = {
  productId: string;
  quantity: number;
};

export type CreateOrderInput = {
  userId: string;
  items: CreateOrderItemInput[];
  idempotencyKey?: string;
};

export type ListOrdersInput = {
  userId?: string;
  status?: OrderStatus;
  from?: Date;
  to?: Date;
  limit: number;
  offset: number;
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async createOrder(input: CreateOrderInput): Promise<Order> {
    if (!input.userId || input.items.length === 0) {
      throw new BadRequestException('userId and items are required');
    }

    const user = await this.usersRepository.findOne({
      where: { id: input.userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (input.idempotencyKey) {
      const existing = await this.ordersRepository.findOne({
        where: { idempotencyKey: input.idempotencyKey },
        relations: { user: true, items: { product: true } },
      });

      if (existing) {
        return existing;
      }
    }

    const productIds = [...new Set(input.items.map((item) => item.productId))];
    const products = await this.productsRepository.find({
      where: { id: In(productIds) },
    });

    if (products.length !== productIds.length) {
      throw new NotFoundException('One or more products were not found');
    }

    const productsById = new Map(
      products.map((product) => [product.id, product]),
    );

    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const orderRepository = queryRunner.manager.getRepository(Order);
      const orderItemRepository = queryRunner.manager.getRepository(OrderItem);
      const productRepository = queryRunner.manager.getRepository(Product);

      const lockedProducts = await productRepository
        .createQueryBuilder('product')
        .setQueryRunner(queryRunner)
        .setLock('for_no_key_update')
        .where('product.id IN (:...ids)', { ids: productIds })
        .getMany();

      if (lockedProducts.length !== productIds.length) {
        throw new NotFoundException('One or more products were not found');
      }

      const lockedById = new Map(
        lockedProducts.map((product) => [product.id, product]),
      );

      for (const item of input.items) {
        const product = lockedById.get(item.productId);

        if (!product) {
          throw new NotFoundException('Product not found');
        }

        if (item.quantity <= 0) {
          throw new BadRequestException('Quantity must be greater than zero');
        }

        if (product.stock < item.quantity) {
          throw new ConflictException('Insufficient stock');
        }
      }

      for (const item of input.items) {
        const product = lockedById.get(item.productId);

        if (!product) {
          continue;
        }

        product.stock -= item.quantity;
      }

      await productRepository.save([...lockedById.values()]);

      const order = orderRepository.create({
        userId: user.id,
        user,
        status: OrderStatus.CREATED,
        idempotencyKey: input.idempotencyKey ?? null,
      });

      await orderRepository.save(order);

      const orderItems = input.items.map((item) => {
        const product = productsById.get(item.productId);

        if (!product) {
          throw new NotFoundException('Product not found');
        }

        return orderItemRepository.create({
          orderId: order.id,
          order,
          productId: product.id,
          product,
          quantity: item.quantity,
          priceSnapshot: product.price,
        });
      });

      await orderItemRepository.save(orderItems);
      await queryRunner.commitTransaction();

      const created = await this.ordersRepository.findOne({
        where: { id: order.id },
        relations: { user: true, items: { product: true } },
      });

      if (!created) {
        throw new Error('Order creation failed');
      }

      return created;
    } catch (error) {
      await queryRunner.rollbackTransaction();

      if (input.idempotencyKey && this.isUniqueViolation(error)) {
        const existing = await this.ordersRepository.findOne({
          where: { idempotencyKey: input.idempotencyKey },
          relations: { user: true, items: { product: true } },
        });

        if (existing) {
          return existing;
        }
      }

      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private isUniqueViolation(
    error: unknown,
  ): error is QueryFailedError & { driverError: { code: string } } {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const driverError = error.driverError as
      | Record<string, unknown>
      | undefined;
    const code = driverError?.code;

    return typeof code === 'string' && code === '23505';
  }

  async listOrders(input: ListOrdersInput): Promise<Order[]> {
    const qb = this.ordersRepository
      .createQueryBuilder('orders')
      .leftJoinAndSelect('orders.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('orders.user', 'user')
      .orderBy('orders.createdAt', 'DESC')
      .take(input.limit)
      .skip(input.offset);

    if (input.userId) {
      qb.andWhere('orders.userId = :userId', { userId: input.userId });
    }

    if (input.status) {
      qb.andWhere('orders.status = :status', { status: input.status });
    }

    if (input.from) {
      qb.andWhere('orders.createdAt >= :from', { from: input.from });
    }

    if (input.to) {
      qb.andWhere('orders.createdAt <= :to', { to: input.to });
    }

    return qb.getMany();
  }
}
