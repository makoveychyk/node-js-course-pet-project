import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { OrdersService } from './orders.service';
import { Product } from '../products/product.entity';
import { User } from '../users/user.entity';
import { OrdersController } from './orders.controller';
import { OrdersResolver, OrderItemsResolver } from './orders.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, Product, User])],
  providers: [OrdersService, OrdersResolver, OrderItemsResolver],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
