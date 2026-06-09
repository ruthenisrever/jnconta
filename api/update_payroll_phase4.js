const fs = require('fs');
const path = 'c:\\Users\\ruthe\\.gemini\\antigravity\\scratch\\jnconta\\api\\src\\payroll.controller.ts';
let content = fs.readFileSync(path, 'utf8');

// 1. Inject TaxService
if (!content.includes('import { TaxService }')) {
  content = `import { TaxService } from './tax.service';\n` + content;
  content = content.replace(
    /constructor\(private readonly prisma: PrismaService\)/,
    `constructor(private readonly prisma: PrismaService, private readonly taxService: TaxService)`
  );
}

// 2. Update calculateFiniquito to use taxService
const finiquitoRegex = /const totalISR = [^;]+;/;
const finiquitoReplacement = `const baseGravable = totalPagado; // Simplification, should separate exentos
    const isr = await this.taxService.calculateISR(baseGravable, 'MENSUAL', 2024);
    const imss = this.taxService.calculateIMSS(employee.sdi, numAnosServicio > 0 ? 30 : 15);
    const totalISR = isr;`;
content = content.replace(finiquitoRegex, finiquitoReplacement);

// 3. Update createIncidence to deduct vacations
const incidenceRegex = /return this\.prisma\.incidence\.create\(\{/;
const incidenceReplacement = `if (type === 'VACACIONES') {
      const vDays = days || 1;
      const vacRecord = await this.prisma.vacationRecord.findFirst({
        where: { employeeId, balance: { gte: vDays } },
        orderBy: { year: 'asc' }
      });
      if (!vacRecord) throw new BadRequestException('No hay saldo suficiente de vacaciones');
      await this.prisma.vacationRecord.update({
        where: { id: vacRecord.id },
        data: { takenDays: vacRecord.takenDays + vDays, balance: vacRecord.balance - vDays }
      });
    }

    return this.prisma.incidence.create({`;
content = content.replace(incidenceRegex, incidenceReplacement);

fs.writeFileSync(path, content);
console.log('payroll.controller.ts updated for Phase 4');
