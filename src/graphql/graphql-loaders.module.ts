import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { ProductLoaderFactory } from './dataloaders/product.loader';

@Module({
  imports: [ProductsModule],
  providers: [ProductLoaderFactory],
  exports: [ProductLoaderFactory],
})
export class GraphqlLoadersModule {}
