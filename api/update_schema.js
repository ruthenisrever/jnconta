const fs = require('fs');
const path = 'c:\\Users\\ruthe\\.gemini\\antigravity\\scratch\\jnconta\\api\\prisma\\schema.prisma';
let content = fs.readFileSync(path, 'utf8');

// 1. Add Employee termination fields
content = content.replace(
  /receipts\s+PayrollReceipt\[\]\s+createdAt/,
  `receipts          PayrollReceipt[]\n  incidences        Incidence[]\n  terminationDate   DateTime?\n  terminationReason String?\n  createdAt`
);

// 2. Add PayrollReceipt Finiquito fields
content = content.replace(
  /netAmount\s+Float\s+@default\(0\)\s+status\s+String\s+@default\("PENDIENTE"\)/,
  `netAmount         Float             @default(0)\n  status            String            @default("PENDIENTE") // PENDIENTE, TIMBRADO, CANCELADO\n  // Finiquitos / Separacion\n  isFiniquito       Boolean           @default(false)\n  totalPagado       Float?\n  numAnosServicio   Int?\n  ultimoSueldoMensOrd Float?\n  ingresoAcumulable Float?\n  ingresoNoAcumulable Float?`
);

// 3. Add Incidence model right before PayrollPeriod
const modelRegex = /model PayrollPeriod \{/;
const incidenceModel = `model Incidence {
  id                String            @id @default(uuid())
  employeeId        String
  employee          Employee          @relation(fields: [employeeId], references: [id])
  periodId          String
  period            PayrollPeriod     @relation(fields: [periodId], references: [id])
  type              String            // FALTAS, HORAS_EXTRAS, INCAPACIDAD, VACACIONES
  date              DateTime?
  days              Float?            // Ej. 1 falta, 2 dias de incapacidad
  hours             Int?              // Para Horas Extras
  extraType         String?           // DOBLES, TRIPLES (Para Horas Extras)
  notes             String?
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
}

`;
content = content.replace(modelRegex, incidenceModel + 'model PayrollPeriod {');

// 4. Also need to add incidences to PayrollPeriod
content = content.replace(
  /receipts\s+PayrollReceipt\[\]\s+createdAt/,
  `receipts          PayrollReceipt[]\n  incidences        Incidence[]\n  createdAt`
);

fs.writeFileSync(path, content);
console.log('Schema updated.');
