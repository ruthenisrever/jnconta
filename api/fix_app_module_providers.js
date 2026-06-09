const fs = require('fs');
const path = 'c:\\Users\\ruthe\\.gemini\\antigravity\\scratch\\jnconta\\api\\src\\app.module.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace("providers: [\\n    TaxService,", "providers: [\n    TaxService,");

fs.writeFileSync(path, content);
console.log('Fixed \\n syntax in app.module.ts');
