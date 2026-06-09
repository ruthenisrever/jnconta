const fs = require('fs');
const path = 'c:\\Users\\ruthe\\.gemini\\antigravity\\scratch\\jnconta\\api\\src\\nomina.controller.ts';
let content = fs.readFileSync(path, 'utf8');

// 1. Import TaxService
if (!content.includes("import { TaxService } from './tax.service';")) {
  content = `import { TaxService } from './tax.service';\n` + content;
}

// 2. Inject TaxService in NominaController constructor
if (!content.includes('private taxService: TaxService')) {
  content = content.replace(
    /private taxes: PayrollTaxesService\s*\)/,
    `private taxes: PayrollTaxesService,\n    private taxService: TaxService\n  )`
  );
}

// 3. Update calcularLiquidacion to use TaxService
const calcRegex = /const isrAprox = baseGravable \* 0\.20; \/\/ Simplificado — en producción usar tabla mensual/;
if (calcRegex.test(content)) {
  content = content.replace(calcRegex, `const isrAprox = await this.taxService.calculateISR(baseGravable, 'MENSUAL', 2024);`);
}

fs.writeFileSync(path, content);
console.log('nomina.controller.ts updated successfully with TaxService');
