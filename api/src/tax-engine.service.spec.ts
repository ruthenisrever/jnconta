import { Test, TestingModule } from '@nestjs/testing';
import { TaxEngineService } from './tax-engine.service';
import { PrismaService } from './prisma.service';

const SAMPLE_XML_IVA16 = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0" SubTotal="10000.00" Total="11600.00">
  <cfdi:Emisor Rfc="PROV010101AAA" Nombre="Proveedor SA" RegimenFiscal="601"/>
  <cfdi:Receptor Rfc="EMP010101BBB" Nombre="Empresa SA" UsoCFDI="G03"/>
  <cfdi:Impuestos TotalImpuestosTrasladados="1600.00">
    <cfdi:Traslados>
      <cfdi:Traslado Base="10000.00" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="1600.00"/>
    </cfdi:Traslados>
  </cfdi:Impuestos>
</cfdi:Comprobante>`;

const SAMPLE_XML_RETENCIONES = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0" SubTotal="5000.00" Total="4400.00">
  <cfdi:Emisor Rfc="PROF010101AAA" Nombre="Profesionista SA" RegimenFiscal="612"/>
  <cfdi:Receptor Rfc="EMP010101BBB" Nombre="Empresa SA" UsoCFDI="G03"/>
  <cfdi:Impuestos TotalImpuestosTrasladados="800.00" TotalImpuestosRetenidos="600.00">
    <cfdi:Retenciones>
      <cfdi:Retencion Impuesto="001" Importe="500.00"/>
      <cfdi:Retencion Impuesto="002" Importe="100.00"/>
    </cfdi:Retenciones>
    <cfdi:Traslados>
      <cfdi:Traslado Base="5000.00" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="800.00"/>
    </cfdi:Traslados>
  </cfdi:Impuestos>
</cfdi:Comprobante>`;

describe('TaxEngineService', () => {
  let service: TaxEngineService;
  let prisma: any;

  const mockPrisma = {
    xmlDocument: { findUnique: jest.fn() },
    taxControl: { upsert: jest.fn() },
    supplier: { findFirst: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaxEngineService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TaxEngineService>(TaxEngineService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('processXmlTaxes', () => {
    it('debe retornar null si el documento XML no existe', async () => {
      prisma.xmlDocument.findUnique.mockResolvedValue(null);
      const result = await service.processXmlTaxes('notfound', 'c1', new Date(), 'ACREDITABLE');
      expect(result).toBeNull();
    });

    it('debe extraer IVA 16% correctamente de un XML válido', async () => {
      prisma.xmlDocument.findUnique.mockResolvedValue({ id: 'x1', rawXml: SAMPLE_XML_IVA16, emisorRfc: 'PROV010101AAA', receptorRfc: 'EMP010101BBB' });
      prisma.supplier.findFirst.mockResolvedValue({ id: 'sup1' });
      prisma.taxControl.upsert.mockImplementation(({ create }) => Promise.resolve(create));

      const result: any = await service.processXmlTaxes('x1', 'c1', new Date(), 'ACREDITABLE');
      expect(result.iva16).toBeCloseTo(1600, 0);
      expect(result.base16).toBeCloseTo(10000, 0);
      expect(result.iva8).toBe(0);
      expect(result.retIva).toBe(0);
      expect(result.retIsr).toBe(0);
    });

    it('debe extraer retenciones de ISR e IVA correctamente', async () => {
      prisma.xmlDocument.findUnique.mockResolvedValue({ id: 'x2', rawXml: SAMPLE_XML_RETENCIONES, emisorRfc: 'PROF010101AAA', receptorRfc: 'EMP010101BBB' });
      prisma.supplier.findFirst.mockResolvedValue({ id: 'sup2' });
      prisma.taxControl.upsert.mockImplementation(({ create }) => Promise.resolve(create));

      const result: any = await service.processXmlTaxes('x2', 'c1', new Date(), 'ACREDITABLE');
      expect(result.retIsr).toBeCloseTo(500, 0);
      expect(result.retIva).toBeCloseTo(100, 0);
      expect(result.iva16).toBeCloseTo(800, 0);
    });

    it('debe retornar null si el XML tiene formato inválido', async () => {
      prisma.xmlDocument.findUnique.mockResolvedValue({ id: 'x3', rawXml: '<invalid>not cfdi', emisorRfc: 'A', receptorRfc: 'B' });
      const result = await service.processXmlTaxes('x3', 'c1', new Date(), 'TRASLADADO');
      expect(result).toBeNull();
    });

    it('debe asignar el RFC correcto según el tipo (ACREDITABLE=emisor, TRASLADADO=receptor)', async () => {
      prisma.xmlDocument.findUnique.mockResolvedValue({ id: 'x4', rawXml: SAMPLE_XML_IVA16, emisorRfc: 'EMISOR_RFC', receptorRfc: 'RECEPTOR_RFC' });
      prisma.supplier.findFirst.mockResolvedValue(null);
      prisma.taxControl.upsert.mockImplementation(({ create }) => Promise.resolve(create));

      const resultAcreditable: any = await service.processXmlTaxes('x4', 'c1', new Date(), 'ACREDITABLE');
      expect(resultAcreditable.rfc).toBe('EMISOR_RFC');

      prisma.taxControl.upsert.mockImplementation(({ create }) => Promise.resolve(create));
      const resultTrasladado: any = await service.processXmlTaxes('x4', 'c1', new Date(), 'TRASLADADO');
      expect(resultTrasladado.rfc).toBe('RECEPTOR_RFC');
    });
  });
});
