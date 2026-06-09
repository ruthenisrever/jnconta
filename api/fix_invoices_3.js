const fs = require('fs');
const path = 'c:\\Users\\ruthe\\.gemini\\antigravity\\scratch\\jnconta\\api\\src\\invoices.controller.ts';
let content = fs.readFileSync(path, 'utf8');

const regex = /unitKey: i\.unitKey \|\| 'KGM',/g;
const replacement = `unit: i.unitKey || i.unit || 'KGM',`;
content = content.replace(regex, replacement);

fs.writeFileSync(path, content);
console.log('Fixed unitKey to unit in invoices.controller.ts');
