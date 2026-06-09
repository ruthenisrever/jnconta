const fs = require('fs');
const file = 'c:\\Users\\ruthe\\.gemini\\antigravity\\scratch\\jnconta\\api\\src\\invoices.controller.ts';
let content = fs.readFileSync(file, 'utf8');

// Replace all occurrences of items.map in create payload to include pedimento
content = content.replace(
  /unitKey:\s*i\.unitKey\s*\|\|\s*'KGM',/g,
  `unitKey: i.unitKey || 'KGM',\n          pedimento: i.pedimento || null,`
);
content = content.replace(
  /unit:\s*i\.unit\s*\|\|\s*'KGM',/g,
  `unit: i.unit || 'KGM',\n            pedimento: i.pedimento || null,`
);
content = content.replace(
  /satCode:\s*i\.satCode\s*\|\|\s*'01010101',/g,
  `satCode: i.satCode || '01010101',\n            pedimento: i.pedimento || null,`
);

fs.writeFileSync(file, content);
console.log('invoices.controller.ts updated');
