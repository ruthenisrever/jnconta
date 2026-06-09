const fs = require('fs');
const path = 'c:\\Users\\ruthe\\.gemini\\antigravity\\scratch\\jnconta\\api\\src\\invoices.controller.ts';
let content = fs.readFileSync(path, 'utf8');

const regex = /items: \{ create: items\.map\(\(i: any\) => \(\{\s*description: i\.description,\s*quantity: Number\(i\.quantity\),\s*unitPrice: Number\(i\.unitPrice\),\s*amount: Number\(i\.quantity\) \* Number\(i\.unitPrice\),\s*taxRate: cfdiType === 'T' \? 0 : 0\.16,\s*satCode: i\.satCode \|\| '78101800',\s*unitKey: i\.unitKey \|\| 'KGM',\s*pedimento: i\.pedimento \|\| null,\s*\}\)\) \},/g;

const replacement = `items: { create: items.map((i: any) => {
          const qty = Number(i.quantity);
          const price = Number(i.unitPrice);
          const amount = qty * price;
          const taxRate = cfdiType === 'T' ? 0 : 0.16;
          return {
            description: i.description,
            quantity: qty,
            unitPrice: price,
            amount: amount,
            taxRate: taxRate,
            subtotal: amount,
            tax: amount * taxRate,
            total: amount + (amount * taxRate),
            satCode: i.satCode || '78101800',
            unitKey: i.unitKey || 'KGM',
            pedimento: i.pedimento || null,
          };
        }) },`;

content = content.replace(regex, replacement);
fs.writeFileSync(path, content);
console.log('Fixed missing subtotal fields in invoices.controller.ts');
