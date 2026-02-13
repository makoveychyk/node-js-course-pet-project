import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { join } from 'path';
import type { GraphqlContext } from './graphql.context';
import { GraphqlLoadersModule } from './graphql-loaders.module';
import { ProductLoaderFactory } from './dataloaders/product.loader';

@Module({
  imports: [
    GraphqlLoadersModule,
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [GraphqlLoadersModule],
      inject: [ProductLoaderFactory],
      useFactory: (productLoaderFactory: ProductLoaderFactory) => ({
        path: '/graphql',
        autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
        sortSchema: true,
        playground: false,
        plugins: [ApolloServerPluginLandingPageLocalDefault()],
        context: (): GraphqlContext => ({
          loaders: {
            productById: productLoaderFactory.create(),
          },
        }),
      }),
    }),
  ],
  exports: [GraphQLModule],
})
export class GraphqlModule {}
