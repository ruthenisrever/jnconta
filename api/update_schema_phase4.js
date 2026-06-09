const fs = require('fs');
const path = 'c:\\Users\\ruthe\\.gemini\\antigravity\\scratch\\jnconta\\api\\prisma\\schema.prisma';
let content = fs.readFileSync(path, 'utf8');

const newModels = `
model IsrTable {
  id          String   @id @default(uuid())
  periodicity String   // MENSUAL, QUINCENAL, SEMANAL, ANUAL
  year        Int      // 2024, 2025, 2026
  lowerLimit  Float
  upperLimit  Float
  fixedFee    Float
  percentage  Float
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model SubsidioTable {
  id          String   @id @default(uuid())
  periodicity String   // MENSUAL, QUINCENAL, SEMANAL, ANUAL
  year        Int
  lowerLimit  Float
  upperLimit  Float
  amount      Float
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model VacationRecord {
  id          String   @id @default(uuid())
  employeeId  String
  employee    Employee @relation(fields: [employeeId], references: [id])
  year        Int      // Año en que se devengaron (ej. 2024, o Aniversario 1)
  earnedDays  Int      // Días de derecho (ej. 12)
  takenDays   Int      @default(0) // Días ya tomados
  balance     Int      // earnedDays - takenDays
  expiresAt   DateTime? // Fecha caducidad según LFT
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
`;

// Insert new models at the end of the file
if (!content.includes('model IsrTable')) {
  content += '\n' + newModels;
}

// Add vacations relation to Employee
if (!content.includes('vacations         VacationRecord[]')) {
  content = content.replace(
    /incidences        Incidence\[\]/g,
    `incidences        Incidence[]\n  vacations         VacationRecord[]`
  );
}

fs.writeFileSync(path, content);
console.log('schema.prisma updated with Phase 4 models.');
