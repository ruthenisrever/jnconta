const fs = require('fs');
const path = 'c:\\Users\\ruthe\\.gemini\\antigravity\\scratch\\jnconta\\api\\src\\app.module.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "import { StampingService } from './stamping.service';\\nimport { TaxService } from './tax.service';",
  "import { StampingService } from './stamping.service';\nimport { TaxService } from './tax.service';"
);

fs.writeFileSync(path, content);
console.log('Fixed syntax in app.module.ts');
