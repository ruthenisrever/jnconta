import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { PrismaService } from './prisma.service';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

const TEST_SECRET = 'test-jwt-secret-for-specs';
process.env.JWT_SECRET = TEST_SECRET;

describe('AuthController', () => {
  let controller: AuthController;
  let prismaService: PrismaService;

  const makeUser = (overrides: Partial<any> = {}) => ({
    id: 'user-1',
    email: 'test@empresa.com',
    name: 'Ana Pérez',
    role: 'admin',
    passwordHash: '',
    companyId: 'company-123',
    createdAt: new Date(),
    company: { id: 'company-123', name: 'Test Corp SA' },
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            user: { findUnique: jest.fn(), update: jest.fn() },
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  // ─────────────────────────────────────────────
  // login
  // ─────────────────────────────────────────────
  describe('login', () => {
    it('debe rechazar si falta el email', async () => {
      await expect(controller.login({ email: '', password: 'pass123' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('debe rechazar si falta el password', async () => {
      await expect(controller.login({ email: 'user@test.com', password: '' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('debe rechazar si el usuario no existe en BD', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);
      await expect(controller.login({ email: 'ghost@test.com', password: 'abc' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('debe rechazar si el usuario no tiene passwordHash', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(makeUser({ passwordHash: null }));
      await expect(controller.login({ email: 'test@empresa.com', password: 'abc' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('debe rechazar si el password es incorrecto', async () => {
      const hash = await bcrypt.hash('correcto123', 10);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(makeUser({ passwordHash: hash }));
      await expect(controller.login({ email: 'test@empresa.com', password: 'incorrecto' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('debe retornar access_token y user al hacer login correcto', async () => {
      const hash = await bcrypt.hash('password123', 10);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(makeUser({ passwordHash: hash }));

      const result = await controller.login({ email: 'test@empresa.com', password: 'password123' });
      expect(result).toHaveProperty('access_token');
      expect(result.user.companyId).toBe('company-123');
    });

    it('el token debe ser un JWT válido y decodificable con el secreto correcto', async () => {
      const hash = await bcrypt.hash('password123', 10);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(makeUser({ passwordHash: hash }));

      const { access_token } = await controller.login({ email: 'test@empresa.com', password: 'password123' });
      const decoded: any = jwt.verify(access_token, TEST_SECRET);

      expect(decoded.sub).toBe('user-1');
      expect(decoded.email).toBe('test@empresa.com');
      expect(decoded.companyId).toBe('company-123');
      expect(decoded.role).toBe('admin');
    });

    it('el token debe incluir companyName en el payload', async () => {
      const hash = await bcrypt.hash('password123', 10);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(makeUser({ passwordHash: hash }));

      const { access_token } = await controller.login({ email: 'test@empresa.com', password: 'password123' });
      const decoded: any = jwt.decode(access_token);
      expect(decoded.companyName).toBe('Test Corp SA');
    });

    it('debe normalizar el email a minúsculas antes de buscar en BD', async () => {
      const hash = await bcrypt.hash('password123', 10);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(makeUser({ passwordHash: hash }));

      await controller.login({ email: '  TEST@EMPRESA.COM  ', password: 'password123' });
      expect(prismaService.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: 'test@empresa.com' } })
      );
    });

    it('el objeto user retornado no debe exponer passwordHash', async () => {
      const hash = await bcrypt.hash('password123', 10);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(makeUser({ passwordHash: hash }));

      const { user } = await controller.login({ email: 'test@empresa.com', password: 'password123' });
      expect((user as any).passwordHash).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────
  // me
  // ─────────────────────────────────────────────
  describe('me', () => {
    const makeToken = (payload: object = {}, opts: jwt.SignOptions = { expiresIn: '1h' }) =>
      jwt.sign({ sub: 'user-1', ...payload }, TEST_SECRET, opts);

    it('debe rechazar si no hay header Authorization', async () => {
      await expect(controller.me(undefined as any)).rejects.toThrow(UnauthorizedException);
    });

    it('debe rechazar si el header no empieza con "Bearer "', async () => {
      await expect(controller.me('Basic abc123')).rejects.toThrow(UnauthorizedException);
    });

    it('debe rechazar token firmado con secreto incorrecto', async () => {
      const wrongToken = jwt.sign({ sub: 'user-1' }, 'wrong-secret');
      await expect(controller.me(`Bearer ${wrongToken}`)).rejects.toThrow(UnauthorizedException);
    });

    it('debe rechazar token expirado', async () => {
      const expired = jwt.sign({ sub: 'user-1' }, TEST_SECRET, { expiresIn: 0 });
      await expect(controller.me(`Bearer ${expired}`)).rejects.toThrow(UnauthorizedException);
    });

    it('debe retornar datos del usuario con token válido', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(makeUser());
      const result = await controller.me(`Bearer ${makeToken()}`);
      expect(result.id).toBe('user-1');
      expect(result.companyId).toBe('company-123');
    });

    it('debe rechazar si el usuario del token ya no existe en BD', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);
      await expect(controller.me(`Bearer ${makeToken()}`)).rejects.toThrow(UnauthorizedException);
    });

    it('no debe exponer passwordHash en la respuesta', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(makeUser({ passwordHash: 'secret' }));
      const result: any = await controller.me(`Bearer ${makeToken()}`);
      expect(result.passwordHash).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────
  // changePassword
  // ─────────────────────────────────────────────
  describe('changePassword', () => {
    const makeToken = () => jwt.sign({ sub: 'user-1' }, TEST_SECRET, { expiresIn: '1h' });

    it('debe rechazar si no hay header de autorización', async () => {
      await expect(controller.changePassword(undefined as any, { currentPassword: 'a', newPassword: 'b' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('debe rechazar si el password actual es incorrecto', async () => {
      const hash = await bcrypt.hash('correcto', 10);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(makeUser({ passwordHash: hash }));
      await expect(controller.changePassword(`Bearer ${makeToken()}`, { currentPassword: 'incorrecto', newPassword: 'NuevoPass123' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('debe rechazar si el nuevo password tiene menos de 8 caracteres', async () => {
      const hash = await bcrypt.hash('correcto', 10);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(makeUser({ passwordHash: hash }));
      await expect(controller.changePassword(`Bearer ${makeToken()}`, { currentPassword: 'correcto', newPassword: 'corto' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('debe actualizar el hash cuando los datos son correctos', async () => {
      const hash = await bcrypt.hash('password_actual', 10);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(makeUser({ passwordHash: hash }));
      jest.spyOn(prismaService.user, 'update').mockResolvedValue({} as any);

      const result = await controller.changePassword(
        `Bearer ${makeToken()}`,
        { currentPassword: 'password_actual', newPassword: 'NuevoPassword123' }
      );
      expect(result.message).toMatch(/actualizada/i);
      expect(prismaService.user.update).toHaveBeenCalledTimes(1);
    });
  });
});
