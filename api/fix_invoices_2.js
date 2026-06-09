const fs = require('fs');
const path = 'c:\\Users\\ruthe\\.gemini\\antigravity\\scratch\\jnconta\\api\\src\\invoices.controller.ts';
let content = fs.readFileSync(path, 'utf8');

const regex = /amount: amount,/g;
const replacement = `// removed amount`;
content = content.replace(regex, replacement);

fs.writeFileSync(path, content);
console.log('Removed amount field in invoices.controller.ts');
