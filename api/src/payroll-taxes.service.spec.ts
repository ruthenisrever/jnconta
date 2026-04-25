import { PayrollTaxesService } from './payroll-taxes.service';

describe('PayrollTaxesService', () => {
  let service: PayrollTaxesService;

  beforeEach(() => {
    service = new PayrollTaxesService();
  });

  describe('calculateIsr', () => {
    it('debe retornar 0 para ingreso 0', () => {
      expect(service.calculateIsr(0)).toBe(0);
    });

    it('debe calcular ISR correctamente para el primer tramo (< 746.05)', () => {
      // Ingreso: 500, cuota fija: 0, tasa: 1.92%
      const result = service.calculateIsr(500);
      const expected = (500 - 0.01) * 0.0192 + 0.00;
      expect(result).toBeCloseTo(expected, 1);
    });

    it('debe calcular ISR para ingreso en tramo medio (31,236.50 - 49,233)', () => {
      // Tramo: lowerLimit=31236.50, fixedFee=5004.12, rate=23.52%
      const ingreso = 40000;
      const result = service.calculateIsr(ingreso);
      const expected = 5004.12 + (40000 - 31236.50) * 0.2352;
      expect(result).toBeCloseTo(expected, 1);
    });

    it('debe calcular ISR para salario mínimo mensual (~6,000)', () => {
      const result = service.calculateIsr(6000);
      // Tramo: lowerLimit=746.05, fixedFee=14.32, rate=6.40%
      const expected = 14.32 + (6000 - 746.05) * 0.0640;
      expect(result).toBeCloseTo(expected, 1);
    });

    it('debe calcular ISR para alto ingreso (> 375,975)', () => {
      const ingreso = 500000;
      const result = service.calculateIsr(ingreso);
      const expected = 117912.32 + (500000 - 375975.62) * 0.35;
      expect(result).toBeCloseTo(expected, 1);
    });

    it('debe ser mayor para ingresos más altos (progresividad)', () => {
      const isr10k = service.calculateIsr(10000);
      const isr50k = service.calculateIsr(50000);
      const isr100k = service.calculateIsr(100000);
      expect(isr50k).toBeGreaterThan(isr10k);
      expect(isr100k).toBeGreaterThan(isr50k);
    });
  });

  describe('calculateImssObrero', () => {
    // UMA 2024 = 108.57
    const UMA = 108.57;

    it('debe retornar un número positivo para parámetros válidos', () => {
      const result = service.calculateImssObrero(200, 15);
      expect(result).toBeGreaterThan(0);
    });

    it('debe incluir el excedente de 3 UMA cuando SDI > 3 UMA', () => {
      const sdiAlto = UMA * 4; // encima de 3 UMAs
      const sdiNormal = UMA * 2; // debajo de 3 UMAs
      const resultAlto = service.calculateImssObrero(sdiAlto, 15);
      const resultNormal = service.calculateImssObrero(sdiNormal, 15);
      // El SDI alto debe pagar más porque tiene cuota de excedente
      expect(resultAlto).toBeGreaterThan(resultNormal);
    });

    it('no debe incluir excedente cuando SDI <= 3 UMA', () => {
      const sdi = UMA * 2; // exactamente 2 UMAs (< 3)
      const days = 15;
      const base = sdi * days;
      const gastosMedicos = base * 0.00375;
      const invalidezVida = base * 0.00625;
      const cesantiaVejez = base * 0.01125;
      const expected = Number((gastosMedicos + invalidezVida + cesantiaVejez).toFixed(2));
      expect(service.calculateImssObrero(sdi, days)).toBeCloseTo(expected, 2);
    });

    it('debe escalar proporcionalmente con los días trabajados', () => {
      const sdi = 300;
      const result15 = service.calculateImssObrero(sdi, 15);
      const result30 = service.calculateImssObrero(sdi, 30);
      expect(result30).toBeCloseTo(result15 * 2, 1);
    });
  });

  describe('adjustToPeriod', () => {
    it('debe ajustar mensual a quincenal (15 días)', () => {
      const monthly = 1000;
      const result = service.adjustToPeriod(monthly, 15);
      expect(result).toBeCloseTo((1000 / 30.4) * 15, 2);
    });

    it('debe retornar el mismo valor para 30.4 días', () => {
      const monthly = 2000;
      const result = service.adjustToPeriod(monthly, 30.4);
      expect(result).toBeCloseTo(2000, 2);
    });
  });
});
