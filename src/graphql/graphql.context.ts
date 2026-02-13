import type DataLoader from 'dataloader';
import { Product } from '../products/product.entity';

export type GraphqlLoaders = {
  productById: DataLoader<string, Product | null>;
};

export type GraphqlContext = {
  loaders: GraphqlLoaders;
};
