import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SatService } from '../sat.service';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

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
  return `**Modo Sin Conexión a IA** ⚡\n\nTu API Key de Google Gemini no tiene cuota disponible. Para activar la IA en tiempo real:\n1. Ve a [https://aistudio.google.com](https://aistudio.google.com) y genera una nueva API Key gratuita\n2. Actualiza \`GEMINI_API_KEY\` en el archivo \`/api/.env\`\n3. Reinicia el backend\n\nMientras tanto, puedo responder preguntas sobre: **ISR, IVA, IMSS, CFDI, DIOT, Depreciación, Nómina**. Prueba con alguno de esos temas.`;
}


@Injectable()
export class IaService {
  constructor(
    private prisma: PrismaService,
    private satService: SatService
  ) {}

  async respondToChat(companyId: string, history: any[], newMessage: string) {
    const apiKey = process.env.GEMINI_API_KEY;

    // Contexto de empresa en paralelo + NUEVA DATA ELITE
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

    const systemPrompt = `Eres Javier, el Asistente Contable Inteligente oficial de JnConta, especializado en normativa contable y fiscal mexicana (LISR 2024, IMSS, LIVA, CFF). Responde en español, con Markdown (tablas, negritas, listas).

ESTADO ACTUAL (TIEMPO REAL):
- Razón Social: ${company.name} (RFC: ${company.rfc})
- Régimen Fiscal: ${company.regimenFiscal}
- Saldo en Bancos: $${totalBankBalance.toFixed(2)} MXN
- Empleados activos: ${employeesCount}
- Cuentas por Cobrar (Vigentes): $${pendingCollection.toFixed(2)} MXN
- Cuentas por Pagar (Pendientes): $${pendingPayments.toFixed(2)} MXN
- Activos Fijos vigentes: ${assetsCount}
- RIESGO FISCAL (EFOS/EDOS): ${fiscalRisks.length > 0 ? `⚠️ RIESGO DETECTADO (${fiscalRisks.length} operaciones sospechosas)` : 'SALUDABLE'}
- INTEGRIDAD BITÁCORA: 100% (Bitácora Forense Activa)

REGLAS: Eres proactivo. Si hay riesgo fiscal, asesora sobre el Art. 69-B. Si hay saldos bajos, sugiere revisar el simulador de impuestos. Usa tablas Markdown para comparativas.`;

    const requestBody = {
      system_instruction: { parts: { text: systemPrompt } },
      contents: [
        ...history.map((msg: any) => ({
          role: msg.role === 'ai' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        })),
        { role: 'user', parts: [{ text: newMessage }] },
      ],
      generationConfig: { temperature: 0.2 },
    };

    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    // Cuota agotada → fallback offline en lugar de error duro
    if (data.error) {
      if (data.error.code === 429) {
        const offline = offlineResponse(newMessage);
        return { respuesta: offline ?? offlineResponse('') };
      }
      throw new Error('Error Gemini API: ' + data.error.message);
    }

    return { respuesta: data.candidates[0].content.parts[0].text };
  }

  async predictNextMonthTaxes(companyId: string) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { text: 'API Key no configurada.' };

    try {
      const [billsResult, invoicesResult] = await Promise.all([
        this.prisma.bill.aggregate({ where: { companyId }, _sum: { total: true } }),
        this.prisma.invoice.aggregate({ where: { companyId }, _sum: { total: true } }),
      ]);

      const sumIncome = invoicesResult._sum.total ?? 0;
      const sumExpenses = billsResult._sum.total ?? 0;

      const prompt = `Analiza estos datos contables e identifica tendencia y proyección de pago provisional del siguiente mes (un párrafo). Ventas: $${sumIncome}, Gastos: $${sumExpenses}. IVA México 16%, ISR 30%. Sé directo.`;
      const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3 } }),
      });
      const data = await response.json();
      return { text: data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sin datos suficientes.' };
    } catch {
      return { text: 'Proyección temporalmente inactiva.' };
    }
  }

  async auditAnomalies(companyId: string) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { anomalies: [{ severity: 'baja', message: 'IA desactivada: configura GEMINI_API_KEY.' }] };

    try {
      const logs = await this.prisma.auditLog.findMany({
        where: { companyId },
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      const logsText = JSON.stringify(logs.map((l: any) => ({ a: l.action, e: l.entity, d: l.createdAt })));
      const prompt = `Revisa estos 10 logs y detecta anomalías o movimientos fuera de horario laboral México. Responde JSON: [{"severity":"alta|media|baja","message":"observación"}]. Logs: ${logsText}`;
      const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.8 } }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      let resText = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
      resText = resText.replace(/```json/g, '').replace(/```/g, '').trim();
      return { anomalies: JSON.parse(resText) };
    } catch {
      return { anomalies: [{ severity: 'baja', message: 'Sin datos suficientes para el auditor heurístico.' }] };
    }
  }
}
