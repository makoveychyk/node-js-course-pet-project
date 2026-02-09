import { NestFactory } from './framework/index.ts';
import { MiniAppModule } from './demo/app.module.ts';
import { RequestLogPipe } from './demo/pipes.ts';

async function bootstrap() {
  const app = await NestFactory.create(MiniAppModule);
  app.useGlobalPipes(new RequestLogPipe());

  const port = Number(process.env.MINI_NEST_PORT ?? 3500);
  await app.listen(port);
  console.log(`Mini Nest-like demo is running on http://localhost:${port}`);
}

bootstrap();
