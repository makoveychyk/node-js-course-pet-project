import DataLoader from 'dataloader';
import { Injectable } from '@nestjs/common';
import { ProductsService } from '../../products/products.service';
import { Product } from '../../products/product.entity';

@Injectable()
export class ProductLoaderFactory {
  constructor(private readonly productsService: ProductsService) {}

  create(): DataLoader<string, Product | null> {
    return new DataLoader<string, Product | null>(async (ids) => {
      const deduplicatedIds = Array.from(new Set<string>(ids));
      const products = await this.productsService.findByIds(deduplicatedIds);
      const byId = new Map(products.map((product) => [product.id, product]));

      return ids.map((id) => byId.get(id) ?? null);
    });
  }
}
