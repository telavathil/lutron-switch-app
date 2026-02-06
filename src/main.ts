import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { join } from 'path';
import { create } from 'express-handlebars';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const hbs = create({
    extname: 'hbs',
    layoutsDir: join(__dirname, '..', 'src', 'views', 'layouts'),
    defaultLayout: 'main',
    partialsDir: join(__dirname, '..', 'src', 'views', 'partials'),
  });

  app.engine('hbs', hbs.engine);
  app.setBaseViewsDir(join(__dirname, '..', 'src', 'views'));
  app.setViewEngine('hbs');

  app.useStaticAssets(join(__dirname, '..', 'public'));

  app.enableCors();

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
