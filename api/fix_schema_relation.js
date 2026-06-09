const fs = require('fs');
const path = 'c:\\Users\\ruthe\\.gemini\\antigravity\\scratch\\jnconta\\api\\prisma\\schema.prisma';
let content = fs.readFileSync(path, 'utf8');

// Remove vacations from PayrollPeriod
content = content.replace(
  /incidences        Incidence\[\]\n\s*vacations         VacationRecord\[\]\n\s*createdAt         DateTime          @default\(now\(\)\)/g,
  `incidences        Incidence[]\n  createdAt         DateTime          @default(now())`
);

fs.writeFileSync(path, content);
console.log('Fixed schema relation mistake');
