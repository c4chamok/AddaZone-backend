import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AuthIoAdapter } from './gateway/gateway.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5173/',
      'http://192.168.0.100:5173',
      'http://192.168.0.100:5173/',
    ],
    credentials: true,
  });
  app.use(cookieParser());
  const adapter = new AuthIoAdapter(app);
  app.useWebSocketAdapter(adapter);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((e: any) => {
  console.log('error : ', e);
});
