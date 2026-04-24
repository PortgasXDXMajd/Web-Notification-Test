import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const webOrigin = config.get<string>('WEB_ORIGIN') ?? 'http://localhost:3000';

  app.enableCors({
    origin: webOrigin,
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type']
  });

  const port = config.get<number>('PORT') ?? 3001;
  await app.listen(port);
}

void bootstrap();
