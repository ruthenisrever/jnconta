const fs = require('fs');
const path = 'c:\\Users\\ruthe\\.gemini\\antigravity\\scratch\\jnconta\\api\\api_test_internal.ts';
let content = fs.readFileSync(path, 'utf8');

const regex = /const employee = await prisma\.employee\.create\(\{[\s\S]*?companyId: company\.id\s*\}\s*\}\);/m;
const replacement = `const employee = await prisma.employee.findFirst() || await prisma.employee.create({
    data: {
      code: 'EMP-' + Date.now(),
      firstName: 'Juan',
      lastName: 'Pérez',
      rfc: 'JUPR800101XXX' + Math.floor(Math.random() * 1000000),
      curp: 'JUPR800101HXXXXX' + Math.floor(Math.random() * 1000000),
      hiredDate: new Date('2020-01-01'),
      dailySalary: 500,
      sdi: 525,
      contractType: '01',
      regimeType: '02',
      companyId: company.id
    }
  });`;

content = content.replace(regex, replacement);
fs.writeFileSync(path, content);
console.log('Fixed unique constraint in tests');
