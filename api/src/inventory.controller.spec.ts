import { Test, TestingModule } from '@nestjs/testing';
import { InventoryController } from './inventory.controller';
import { PrismaService } from './prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('InventoryController — Kardex', () => {
  let controller: InventoryController;
  let prisma: any;

  const mockPrisma = {
    inventoryMovement: { findMany: jest.fn(), create: jest.fn() },
    product: { update: jest.fn(), findUnique: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [{ provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    controller = module.get<InventoryController>(InventoryController);
    prisma = module.get<PrismaService>(PrismaService);
  });

  // ──────────────────────────────────────────────
  // getKardex
  // ──────────────────────────────────────────────
  describe('getKardex', () => {
    it('debe lanzar BadRequestException sin companyId', async () => {
      await expect(controller.getKardex('prod1', null as any)).rejects.toThrow(BadRequestException);
    });

    it('debe retornar array vacío si no hay movimientos', async () => {
      (prisma as any).inventoryMovement.findMany.mockResolvedValue([]);
      const result = await controller.getKardex('prod1', 'c1');
      expect(result).toEqual([]);
    });

    it('debe acumular correctamente el stock con ENTRADAs y SALIDAs', async () => {
      (prisma as any).inventoryMovement.findMany.mockResolvedValue([
        { type: 'ENTRADA', quantity: 100, unitCost: 50, totalCost: 5000 },
        { type: 'ENTRADA', quantity: 50,  unitCost: 60, totalCost: 3000 },
        { type: 'SALIDA',  quantity: 30,  unitCost: 50, totalCost: 0 },
      ]);

      const result: any[] = await controller.getKardex('prod1', 'c1');
      expect(result).toHaveLength(3);
      expect(result[0].stockAcumulado).toBe(100);
      expect(result[1].stockAcumulado).toBe(150);
      expect(result[2].stockAcumulado).toBe(120);
    });

    it('debe calcular el costo promedio ponderado correctamente', async () => {
      // ENTRADA 100u x $50 = $5000; ENTRADA 50u x $60 = $3000; total 150u x $8000
      // CostoPromedio tras 2 entradas = 8000/150 ≈ 53.33
      (prisma as any).inventoryMovement.findMany.mockResolvedValue([
        { type: 'ENTRADA', quantity: 100, unitCost: 50, totalCost: 5000 },
        { type: 'ENTRADA', quantity: 50,  unitCost: 60, totalCost: 3000 },
      ]);

      const result: any[] = await controller.getKardex('prod1', 'c1');
      expect(result[1].costoPromedio).toBeCloseTo(8000 / 150, 2);
    });

    it('debe retornar costoPromedio = 0 cuando el stock llega a 0', async () => {
      (prisma as any).inventoryMovement.findMany.mockResolvedValue([
        { type: 'ENTRADA', quantity: 10, unitCost: 100, totalCost: 1000 },
        { type: 'SALIDA',  quantity: 10, unitCost: 100, totalCost: 0 },
      ]);

      const result: any[] = await controller.getKardex('prod1', 'c1');
      expect(result[1].stockAcumulado).toBe(0);
      expect(result[1].costoPromedio).toBe(0);
    });
  });

  // ──────────────────────────────────────────────
  // addMovement
  // ──────────────────────────────────────────────
  describe('addMovement', () => {
    it('debe lanzar BadRequestException si faltan campos requeridos', async () => {
      await expect(controller.addMovement({ companyId: 'c1', productId: null, type: 'ENTRADA' }))
        .rejects.toThrow(BadRequestException);
      await expect(controller.addMovement({ companyId: null, productId: 'p1', type: 'SALIDA' }))
        .rejects.toThrow(BadRequestException);
    });

    it('debe crear movimiento y actualizar stock', async () => {
      (prisma as any).inventoryMovement.create.mockResolvedValue({ id: 'mov1', type: 'ENTRADA', quantity: 50, totalCost: 2500 });
      mockPrisma.product.update.mockResolvedValue({ id: 'p1', stock: 150 });

      const result: any = await controller.addMovement({
        companyId: 'c1', productId: 'p1', type: 'ENTRADA', quantity: 50, unitCost: 50
      });

      expect((prisma as any).inventoryMovement.create).toHaveBeenCalled();
      expect(mockPrisma.product.update).toHaveBeenCalledWith(expect.objectContaining({
        data: { stock: { increment: 50 } }
      }));
      expect(result.id).toBe('mov1');
    });

    it('debe decrementar el stock en SALIDAs', async () => {
      (prisma as any).inventoryMovement.create.mockResolvedValue({ id: 'mov2', type: 'SALIDA', quantity: 20 });
      mockPrisma.product.update.mockResolvedValue({ id: 'p1', stock: 80 });

      await controller.addMovement({
        companyId: 'c1', productId: 'p1', type: 'SALIDA', quantity: 20, unitCost: 50
      });

      expect(mockPrisma.product.update).toHaveBeenCalledWith(expect.objectContaining({
        data: { stock: { decrement: 20 } }
      }));
    });
  });

  // ──────────────────────────────────────────────
  // recalculate
  // ──────────────────────────────────────────────
  describe('recalculate', () => {
    it('debe recalcular el stock correctamente desde el historial', async () => {
      (prisma as any).inventoryMovement.findMany.mockResolvedValue([
        { type: 'ENTRADA', quantity: 200 },
        { type: 'SALIDA',  quantity: 50 },
        { type: 'ENTRADA', quantity: 30 },
        { type: 'SALIDA',  quantity: 80 },
      ]);
      mockPrisma.product.update.mockResolvedValue({ id: 'p1', stock: 100 });

      const result: any = await controller.recalculate('p1', { companyId: 'c1' });
      expect(result.stockRecalculado).toBe(100); // 200 - 50 + 30 - 80 = 100
      expect(result.totalMovements).toBe(4);
    });

    it('debe lanzar BadRequestException sin companyId', async () => {
      await expect(controller.recalculate('p1', {})).rejects.toThrow(BadRequestException);
    });
  });
});
