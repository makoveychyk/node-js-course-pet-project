import 'dotenv/config';
import { In } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AppDataSource } from '../../data-source';
import { User } from '../users/user.entity';
import { Product } from '../products/product.entity';
import { Order } from '../orders/order.entity';
import { OrderItem } from '../orders/order-item.entity';

const usersSeedConfig = [
  {
    email: 'alice@example.com',
    password: 'password123',
    roles: ['user'],
    scopes: ['files:read', 'files:write', 'orders:read'],
  },
  {
    email: 'bob@example.com',
    password: 'password123',
    roles: ['support'],
    scopes: ['files:read', 'files:write', 'orders:read'],
  },
  {
    email: 'charlie@example.com',
    password: 'password123',
    roles: ['admin'],
    scopes: ['files:read', 'files:write', 'orders:read', 'orders:write'],
  },
];

const productNames = [
  'Coffee Mug',
  'Notebook',
  'Desk Lamp',
  'Mechanical Keyboard',
  'Wireless Mouse',
  'USB-C Cable',
  'Webcam',
  'Laptop Stand',
  'Monitor 24"',
  'Monitor 27"',
  'Headphones',
  'Microphone',
  'Backpack',
  'Water Bottle',
  'Sticker Pack',
  'T-Shirt',
  'Hoodie',
  'Pen Set',
  'Mouse Pad',
  'External SSD',
  'Power Bank',
  'Smart Plug',
  'Smart Bulb',
  'Router',
  'Keyboard Wrist Rest',
];

const productsSeed = productNames.map((title, index) => {
  const basePrice = 5 + index * 3;
  const lowStock = index % 5 === 0;
  return {
    title,
    price: (basePrice + 0.99).toFixed(2),
    isActive: true,
    stock: lowStock ? 2 : 20,
  };
});

const ordersSeed = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    userEmail: 'alice@example.com',
    items: [
      {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        productTitle: 'Coffee Mug',
        quantity: 1,
      },
      {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
        productTitle: 'Mechanical Keyboard',
        quantity: 1,
      },
    ],
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    userEmail: 'bob@example.com',
    items: [
      {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
        productTitle: 'Notebook',
        quantity: 2,
      },
      {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
        productTitle: 'Wireless Mouse',
        quantity: 1,
      },
    ],
  },
];

const dataSource = AppDataSource;

async function seed() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seeding is disabled in production');
  }

  await dataSource.initialize();

  try {
    const usersRepository = dataSource.getRepository(User);
    const productsRepository = dataSource.getRepository(Product);
    const ordersRepository = dataSource.getRepository(Order);
    const orderItemsRepository = dataSource.getRepository(OrderItem);

    const usersSeed = await Promise.all(
      usersSeedConfig.map(async (user) => ({
        email: user.email,
        passwordHash: await bcrypt.hash(user.password, 10),
        roles: user.roles,
        scopes: user.scopes,
      })),
    );

    await usersRepository.upsert(usersSeed, ['email']);
    await productsRepository.upsert(productsSeed, ['title']);

    const users = await usersRepository.find({
      where: { email: In(usersSeedConfig.map((user) => user.email)) },
    });
    const usersByEmail = new Map<string, User>(
      users.map((user) => [user.email, user]),
    );

    const productTitles = productsSeed.map((product) => product.title);
    const products = await productsRepository.find({
      where: { title: In(productTitles) },
    });
    const productsByTitle = new Map<string, Product>(
      products.map((product) => [product.title, product]),
    );

    const ordersToUpsert: Array<Partial<Order>> = [];
    const orderItemsToUpsert: Array<Partial<OrderItem>> = [];

    for (const orderSeed of ordersSeed) {
      const user = usersByEmail.get(orderSeed.userEmail);
      if (!user) {
        continue;
      }

      ordersToUpsert.push({
        id: orderSeed.id,
        userId: user.id,
      });

      for (const item of orderSeed.items) {
        const product = productsByTitle.get(item.productTitle);
        if (!product) {
          throw new Error(`Missing product: ${item.productTitle}`);
        }

        orderItemsToUpsert.push({
          id: item.id,
          orderId: orderSeed.id,
          productId: product.id,
          quantity: item.quantity,
          priceSnapshot: product.price,
        });
      }
    }

    if (ordersToUpsert.length > 0) {
      await ordersRepository.upsert(ordersToUpsert, ['id']);
    }

    if (orderItemsToUpsert.length > 0) {
      await orderItemsRepository.upsert(orderItemsToUpsert, ['id']);
    }
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
