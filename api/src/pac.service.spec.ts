import { Test, TestingModule } from '@nestjs/testing';
import { FinkokService } from './pac.service';

// ── Mock de fetch global ───────────────────────────────────────────────────────

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

// ── Helpers para construir respuestas SOAP ────────────────────────────────────

const soapResponse = (body: string) =>
  `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>${body}</soap:Body>
</soap:Envelope>`;

const creditResponse = (credit: string) =>
  soapResponse(`
    <get_creditResponse>
      <get_creditResult>${credit}</get_creditResult>
    </get_creditResponse>
  `);

const soapFault = (message: string) =>
  soapResponse(`
    <Fault>
      <faultcode>soap:Server</faultcode>
      <faultstring>${message}</faultstring>
    </Fault>
  `);

const stampOkResponse = (uuid: string) =>
  soapResponse(`
    <stampResponse>
      <stampResult>
        <UUID>${uuid}</UUID>
        <xml>&lt;cfdi:Comprobante/&gt;</xml>
        <Fecha>2024-01-15T10:00:00</Fecha>
        <SatSeal>seal-base64==</SatSeal>
      </stampResult>
    </stampResponse>
  `);

const stampErrorResponse = (codigo: string, mensaje: string) =>
  soapResponse(`
    <stampResponse>
      <stampResult>
        <Incidencias>
          <Incidencia>
            <CodigoError>${codigo}</CodigoError>
            <MensajeIncidencia>${mensaje}</MensajeIncidencia>
          </Incidencia>
        </Incidencias>
      </stampResult>
    </stampResponse>
  `);

const makeFetchOk = (body: string) =>
  Promise.resolve({
    ok: true,
    status: 200,
    text: () => Promise.resolve(body),
  });

const makeFetchError = (status: number) =>
  Promise.resolve({
    ok: false,
    status,
    text: () => Promise.resolve('<error/>'),
  });

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('FinkokService', () => {
  let service: FinkokService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [FinkokService],
    }).compile();

    service = module.get<FinkokService>(FinkokService);
  });

  // ── Resolución de URLs ────────────────────────────────────────────────────

  describe('resolveEndpoint (URL resolution)', () => {
    it('debe usar el endpoint de utilities de SANDBOX cuando la URL contiene "demo-"', async () => {
      mockFetch.mockReturnValue(makeFetchOk(creditResponse('150')));

      await service.testConnection('user', 'pass', 'https://demo-facturacion.finkok.com/servicios/soap/stamp.wsdl');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://demo-facturacion.finkok.com/servicios/soap/utilities',
        expect.any(Object),
      );
    });

    it('debe usar el endpoint de utilities de PRODUCCIÓN cuando la URL NO contiene "demo-"', async () => {
      mockFetch.mockReturnValue(makeFetchOk(creditResponse('5000')));

      await service.testConnection('user', 'pass', 'https://facturacion.finkok.com/servicios/soap/stamp.wsdl');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://facturacion.finkok.com/servicios/soap/utilities',
        expect.any(Object),
      );
    });

    it('debe usar SANDBOX por defecto si la URL es vacía o undefined', async () => {
      mockFetch.mockReturnValue(makeFetchOk(creditResponse('0')));

      await service.testConnection('user', 'pass', '');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://demo-facturacion.finkok.com/servicios/soap/utilities',
        expect.any(Object),
      );
    });

    it('stamp debe usar el endpoint de stamp (no utilities)', async () => {
      mockFetch.mockReturnValue(makeFetchOk(stampOkResponse('uuid-test-123')));

      await service.stamp('xml-base64', 'user', 'pass', 'https://demo-facturacion.finkok.com/servicios/soap/stamp.wsdl');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://demo-facturacion.finkok.com/servicios/soap/stamp',
        expect.any(Object),
      );
    });

    it('stamp en producción no debe usar URL de sandbox', async () => {
      mockFetch.mockReturnValue(makeFetchOk(stampOkResponse('uuid-prod-999')));

      await service.stamp('xml-base64', 'user', 'pass', 'https://facturacion.finkok.com/servicios/soap/stamp.wsdl');

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).not.toContain('demo-');
      expect(calledUrl).toContain('facturacion.finkok.com');
    });
  });

  // ── testConnection: parseo de respuestas ──────────────────────────────────

  describe('testConnection', () => {
    const SANDBOX_URL = 'https://demo-facturacion.finkok.com/servicios/soap/stamp.wsdl';

    it('debe retornar success:true con los créditos cuando la respuesta es correcta', async () => {
      mockFetch.mockReturnValue(makeFetchOk(creditResponse('250')));

      const result = await service.testConnection('user@test.com', 'pass123', SANDBOX_URL);

      expect(result.success).toBe(true);
      expect(result.credits).toBe('250');
      expect(result.error).toBeUndefined();
    });

    it('debe retornar success:false cuando Finkok responde con crédito "-1"', async () => {
      mockFetch.mockReturnValue(makeFetchOk(creditResponse('-1')));

      const result = await service.testConnection('user@test.com', 'wrong-pass', SANDBOX_URL);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('debe retornar success:false cuando la respuesta es un SOAP Fault', async () => {
      mockFetch.mockReturnValue(makeFetchOk(soapFault('Authentication failed')));

      const result = await service.testConnection('user', 'pass', SANDBOX_URL);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication failed');
    });

    it('debe retornar success:false si fetch lanza una excepción (sin red)', async () => {
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await service.testConnection('user', 'pass', SANDBOX_URL);

      expect(result.success).toBe(false);
      expect(result.error).toContain('ECONNREFUSED');
    });

    it('debe incluir el SOAPAction correcto en el header de la petición', async () => {
      mockFetch.mockReturnValue(makeFetchOk(creditResponse('100')));

      await service.testConnection('u', 'p', SANDBOX_URL);

      const requestOptions = mockFetch.mock.calls[0][1] as RequestInit;
      const headers = requestOptions.headers as Record<string, string>;
      expect(headers['SOAPAction']).toContain('get_credit');
    });

    it('debe enviar las credenciales en el body SOAP', async () => {
      mockFetch.mockReturnValue(makeFetchOk(creditResponse('10')));

      await service.testConnection('integrador@empresa.com', 'secreto-123', SANDBOX_URL);

      const body = mockFetch.mock.calls[0][1].body as string;
      expect(body).toContain('integrador@empresa.com');
      expect(body).toContain('secreto-123');
    });
  });

  // ── stamp: parseo de respuestas ───────────────────────────────────────────

  describe('stamp', () => {
    const SANDBOX_URL = 'https://demo-facturacion.finkok.com/servicios/soap/stamp.wsdl';

    it('debe retornar success:true con el UUID cuando el timbrado es correcto', async () => {
      mockFetch.mockReturnValue(makeFetchOk(stampOkResponse('550e8400-e29b-41d4-a716-446655440000')));

      const result = await service.stamp('xml-base64==', 'user', 'pass', SANDBOX_URL);

      expect(result.success).toBe(true);
      expect(result.uuid).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(result.xml).toBeDefined();
    });

    it('debe retornar success:false con el mensaje de incidencia cuando el PAC reporta error', async () => {
      mockFetch.mockReturnValue(makeFetchOk(stampErrorResponse('301', 'XML mal formado')));

      const result = await service.stamp('xml-invalido', 'user', 'pass', SANDBOX_URL);

      expect(result.success).toBe(false);
      expect(result.error).toContain('301');
      expect(result.error).toContain('XML mal formado');
    });

    it('debe retornar success:false cuando hay múltiples incidencias', async () => {
      const multiError = soapResponse(`
        <stampResponse>
          <stampResult>
            <Incidencias>
              <Incidencia>
                <CodigoError>301</CodigoError>
                <MensajeIncidencia>XML mal formado</MensajeIncidencia>
              </Incidencia>
              <Incidencia>
                <CodigoError>502</CodigoError>
                <MensajeIncidencia>RFC emisor no registrado</MensajeIncidencia>
              </Incidencia>
            </Incidencias>
          </stampResult>
        </stampResponse>
      `);
      mockFetch.mockReturnValue(makeFetchOk(multiError));

      const result = await service.stamp('xml', 'u', 'p', SANDBOX_URL);

      expect(result.success).toBe(false);
      expect(result.error).toContain('301');
      expect(result.error).toContain('502');
    });

    it('debe retornar success:false si el servidor responde con HTTP 500', async () => {
      mockFetch.mockReturnValue(makeFetchError(500));

      const result = await service.stamp('xml', 'u', 'p', SANDBOX_URL);

      expect(result.success).toBe(false);
      expect(result.error).toContain('500');
    });

    it('debe retornar success:false si la respuesta no contiene UUID', async () => {
      const noUuid = soapResponse(`
        <stampResponse>
          <stampResult>
            <xml>&lt;cfdi/&gt;</xml>
          </stampResult>
        </stampResponse>
      `);
      mockFetch.mockReturnValue(makeFetchOk(noUuid));

      const result = await service.stamp('xml', 'u', 'p', SANDBOX_URL);

      expect(result.success).toBe(false);
      expect(result.error).toContain('UUID');
    });

    it('debe retornar success:false si fetch lanza excepción (sin red)', async () => {
      mockFetch.mockRejectedValue(new Error('connect ETIMEDOUT'));

      const result = await service.stamp('xml', 'u', 'p', SANDBOX_URL);

      expect(result.success).toBe(false);
      expect(result.error).toContain('ETIMEDOUT');
    });
  });
});
