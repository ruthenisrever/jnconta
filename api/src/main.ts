import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  
  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        'http://localhost:3010',
        'http://127.0.0.1:3010',
        process.env.FRONTEND_URL
      ].filter(Boolean);

      if (!origin || allowedOrigins.includes(origin) || origin.includes('localhost')) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origen ${origin} no está permitido.`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });
  app.setGlobalPrefix('api');
  const port = process.env.PORT || 3005;
  await app.listen(port, '0.0.0.0');
}
bootstrap();
