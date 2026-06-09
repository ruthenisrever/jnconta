import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SatService } from '../sat.service';

const CLAUDE_URL = 'https://api.anthropic.com/v1/messages';

// Respuestas fiscales precargadas para modo offline (cuando la API key está sin cuota)
const OFFLINE_KB: { keywords: string[]; respuesta: string }[] = [
  {
    keywords: ['isr', 'impuesto sobre la renta', 'retención', 'retencion'],
    respuesta: `**ISR (Impuesto Sobre la Renta) — Referencia Rápida 2024**\n\n| Concepto | Detalle |\n|---|---|\n| Tasa personas morales | **30%** sobre utilidad fiscal |\n| Retención honorarios | **10%** si el receptor factura |\n| Retención asimilados | **10%** |\n| Pago provisional | Mensual, acumulado vs coeficiente |\n| Declaración anual | Marzo (PM) / Abril (PF) |\n\n**Fórmula utilidad fiscal:** Ingresos acumulables − deducciones autorizadas − PTU pagada\n\n> Verifica en el módulo **Cálculo de Impuestos** los pagos provisionales de tu empresa.`,
  },
  {
    keywords: ['iva', 'impuesto al valor agregado', 'trasladado', 'acreditable'],
    respuesta: `**IVA (Impuesto al Valor Agregado) — Referencia 2024**\n\n| Tasa | Aplica |\n|---|---|\n| **16%** | Zona general |\n| **8%** | Zona fronteriza (franja 20 km) |\n| **0%** | Alimentos, medicinas, exportaciones |\n| **Exento** | Servicios médicos, educación, etc. |\n\n**IVA a pagar:** IVA trasladado − IVA acreditable\n\nDeclaración: mensual, a más tardar el **día 17** del mes siguiente.\n\n> Consulta tu saldo de IVA en el módulo **Cálculo de Impuestos**.`,
  },
  {
    keywords: ['imss', 'seguro social', 'cuota', 'patronal', 'obrera'],
    respuesta: `**Cuotas IMSS 2024 (principales)**\n\n| Ramo | Patronal | Obrera |\n|---|---|---|\n| Enfermedad/Maternidad (cuota fija) | 20.40% 1 SBM | — |\n| Invalidez y Vida | 1.75% | 0.625% |\n| Cesantía y Vejez | 3.150% | 1.125% |\n| Guarderías | 1.0% | — |\n| INFONAVIT | 5.0% | — |\n\nBase: **SBC (Salario Base de Cotización)**, tope 25 UMA.\n\n> Revisa el módulo **Nómina** para el cálculo automático por empleado.`,
  },
  {
    keywords: ['cfdi', 'factura', 'timbrado', 'sat', 'xml'],
    respuesta: `**CFDI 4.0 — Puntos Clave 2024**\n\n- Versión obligatoria: **4.0** (la 3.3 fue cancelada)\n- Requiere: RFC emisor/receptor, régimen fiscal, uso CFDI y **código postal** de ambas partes\n- Métodos de pago: **PUE** (pago en una exhibición) / **PPD** (pago en parcialidades)\n- Complemento de Pago: obligatorio al cobrar facturas PPD\n- Cancelación: requiere aceptación del receptor si el monto supera **$1,000 MXN**\n\n> Emite y timbra desde el módulo **Facturación CFDI**.`,
  },
  {
    keywords: ['diot', 'proveedores', 'declaración informativa'],
    respuesta: `**DIOT (Declaración Informativa de Operaciones con Terceros)**\n\n- Periodicidad: **Mensual** (a más tardar el 17 del mes siguiente)\n- Informa: IVA pagado a proveedores durante el período\n- Tipos de tercero: **04** Nacional / **05** Extranjero / **15** Global\n- Tipos de operación: **03** Servicios / **06** Bienes / **85** Otros\n- Formato: Archivo **TXT** de 38 columnas separadas por pipes\n\n> Genera y descarga tu DIOT desde el módulo **SAT → Cálculo de Impuestos**.`,
  },
  {
    keywords: ['depreciación', 'depreciacion', 'activo fijo', 'deduccion inmediata'],
    respuesta: `**Depreciación de Activos Fijos — LISR 2024**\n\n| Tipo de activo | Tasa anual |\n|---|---|\n| Mobiliario y equipo de oficina | **10%** |\n| Equipo de cómputo | **25%** |\n| Automóviles | **25%** (tope $175,000) |\n| Construcciones | **5%** |\n| Maquinaria industrial | **10%** |\n| Software | **35%** |\n\nMétodo: **Línea recta** (saldo histórico × tasa).\nDeducción inmediata: aplica solo en Zonas Económicas Especiales.\n\n> Consulta el módulo **Activos Fijos** para el calendario de depreciación.`,
  },
  {
    keywords: ['nómina', 'nomina', 'sueldo', 'subsidio', 'despensa'],
    respuesta: `**Nómina — Conceptos Clave 2024**\n\n**Percepciones exentas de ISR (art. 93 LISR):**\n- Horas extra: hasta 3 hrs/día, 9 semanas/año (50% exento, tope 5 UMA)\n- Vales de despensa: hasta **40% del SMG vigente** exentos\n- Fondo de ahorro: 13% del salario, máx. 1.3 UMA/día exento\n- Prima vacacional: 15 días mínimo, 25% exento hasta 15 SMG\n- Aguinaldo: mínimo **15 días**, exentos hasta 30 SMG\n\n**UMA 2024:** $108.57 diarios / $3,300.53 mensuales\n**SMG 2024:** $248.93 diarios (zona general)\n\n> Calcula recibos en el módulo **Nómina**.`,
  },
];

function offlineResponse(message: string): string | null {
  const lower = message.toLowerCase();
  const match = OFFLINE_KB.find((entry) =>
    entry.keywords.some((kw) => lower.includes(kw)),
  );
  if (match) return match.respuesta;
  return `**Modo Sin Conexión a IA** ⚡\n\nTu API Key de Claude no tiene cuota disponible o es inválida. Para activar la IA:\n1. Ve a [https://console.anthropic.com](https://console.anthropic.com)\n2. Saca tu llave y ponla en el .env como \`CLAUDE_API_KEY\`\n3. Reinicia el backend`;
}

@Injectable()
export class IaService {
  constructor(
    private prisma: PrismaService,
    private satService: SatService
  ) {}

  async respondToChat(companyId: string, history: any[], newMessage: string) {
    const apiKey = process.env.CLAUDE_API_KEY;

    const [company, employeesCount, bankBalResult, collectionResult, payablesResult, assetsCount, fiscalRisks] =
      await Promise.all([
        this.prisma.company.findUnique({ where: { id: companyId } }),
        this.prisma.employee.count({ where: { companyId } }).catch(() => 0),
        this.prisma.bankAccount.aggregate({ where: { companyId }, _sum: { balance: true } }).catch(() => ({ _sum: { balance: 0 } })),
        this.prisma.invoice.aggregate({ where: { companyId, status: 'VIGENTE' }, _sum: { total: true } }).catch(() => ({ _sum: { total: 0 } })),
        this.prisma.bill.aggregate({ where: { companyId, status: 'PENDIENTE' }, _sum: { total: true } }).catch(() => ({ _sum: { total: 0 } })),
        this.prisma.fixedAsset.count({ where: { companyId, isActive: true } }).catch(() => 0),
        this.satService.runRiskAnalysis(companyId).catch(() => []),
      ]);

    if (!company) throw new Error('Empresa no encontrada.');

    const totalBankBalance = bankBalResult._sum.balance ?? 0;
    const pendingCollection = collectionResult._sum.total ?? 0;
    const pendingPayments = payablesResult._sum.total ?? 0;

    if (!apiKey) {
      return { respuesta: offlineResponse(newMessage) ?? offlineResponse('') };
    }

    const systemPrompt = `Eres Javier, el Asistente Contable Inteligente oficial de JnConta, especializado en normativa contable y fiscal mexicana (LISR 2024, IMSS, LIVA, CFF). Responde en español, con Markdown.\nESTADO ACTUAL:\n- Razón Social: ${company.name} (RFC: ${company.rfc})\n- Régimen Fiscal: ${company.regimenFiscal}\n- Saldo en Bancos: $${totalBankBalance.toFixed(2)} MXN\n- Empleados activos: ${employeesCount}\n- Cuentas por Cobrar: $${pendingCollection.toFixed(2)} MXN\n- Cuentas por Pagar: $${pendingPayments.toFixed(2)} MXN\n- Activos Fijos vigentes: ${assetsCount}\n- RIESGO FISCAL: ${fiscalRisks.length > 0 ? 'RIESGO DETECTADO' : 'SALUDABLE'}\n\nREGLAS: Eres proactivo. Usa tablas Markdown para comparativas.`;

    const requestBody = {
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        ...history.map((msg: any) => ({
          role: msg.role === 'ai' ? 'assistant' : 'user',
          content: msg.content,
        })),
        { role: 'user', content: newMessage },
      ],
      temperature: 0.2,
    };

    const response = await fetch(CLAUDE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (data.error) {
      if (data.error.type === 'invalid_request_error' || data.error.type === 'authentication_error') {
        const offline = offlineResponse(newMessage);
        return { respuesta: offline ?? offlineResponse('') };
      }
      throw new Error('Error Claude API: ' + data.error.message);
    }

    return { respuesta: data.content[0].text };
  }

  async predictNextMonthTaxes(companyId: string) {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) return { text: 'API Key no configurada.' };

    try {
      const [billsResult, invoicesResult] = await Promise.all([
        this.prisma.bill.aggregate({ where: { companyId }, _sum: { total: true } }),
        this.prisma.invoice.aggregate({ where: { companyId }, _sum: { total: true } }),
      ]);

      const sumIncome = invoicesResult._sum.total ?? 0;
      const sumExpenses = billsResult._sum.total ?? 0;

      const prompt = `Analiza estos datos contables e identifica tendencia y proyección de pago provisional del siguiente mes (un párrafo). Ventas: $${sumIncome}, Gastos: $${sumExpenses}. IVA México 16%, ISR 30%. Sé directo.`;
      
      const response = await fetch(CLAUDE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: 200, messages: [{ role: 'user', content: prompt }], temperature: 0.3 }),
      });
      const data = await response.json();
      return { text: data.content?.[0]?.text || 'Sin datos suficientes.' };
    } catch {
      return { text: 'Proyección temporalmente inactiva.' };
    }
  }

  async auditAnomalies(companyId: string) {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) return { anomalies: [{ severity: 'baja', message: 'IA desactivada: configura CLAUDE_API_KEY.' }] };

    try {
      const logs = await this.prisma.auditLog.findMany({
        where: { companyId }, take: 10, orderBy: { createdAt: 'desc' },
      });
      const logsText = JSON.stringify(logs.map((l: any) => ({ a: l.action, e: l.entity, d: l.createdAt })));
      const prompt = `Revisa estos 10 logs y detecta anomalías o movimientos fuera de horario laboral México. Responde JSON EXACTO (sin \`\`\`json): [{"severity":"alta|media|baja","message":"observación"}]. Logs: ${logsText}`;
      
      const response = await fetch(CLAUDE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: 500, messages: [{ role: 'user', content: prompt }], temperature: 0.8 }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      let resText = data.content?.[0]?.text || '[]';
      resText = resText.replace(/```json/g, '').replace(/```/g, '').trim();
      return { anomalies: JSON.parse(resText) };
    } catch {
      return { anomalies: [{ severity: 'baja', message: 'Sin datos suficientes para el auditor heurístico.' }] };
    }
  }
}
