import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';

// --- Decorador @Public() ---
// Usa esto para marcar un endpoint como público (sin necesidad de token).
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// --- JWT Guard Global ---
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Si el endpoint está marcado con @Public(), lo dejamos pasar sin revisar el token.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de acceso requerido. Inicia sesión.');
    }

    const token = authHeader.replace('Bearer ', '');
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new UnauthorizedException('Error interno: El servidor no tiene configurado el secreto de seguridad (JWT_SECRET).');
    }

    try {
      const payload = jwt.verify(token, secret) as any;
      // Adjuntamos el payload al request para que los controladores puedan acceder al usuario.
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado. Por favor inicia sesión de nuevo.');
    }
  }
}
