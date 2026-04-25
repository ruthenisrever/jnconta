import * as fs from 'fs';
import * as path from 'path';

try {
  const envConfig = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      if (val.startsWith('"') && val.endsWith('"')) { val = val.slice(1, -1); }
      process.env[key] = val;
    }
  });
} catch (e) {
  console.log('.env no encontrado o no se pudo leer.');
}

import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3010').split(',');
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests without origin (Postman, curl, same-origin via Nginx proxy)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origen ${origin} no está permitido.`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.setGlobalPrefix('api');
  const port = process.env.PORT || 3005;
  await app.listen(port, '0.0.0.0');
}
bootstrap();
