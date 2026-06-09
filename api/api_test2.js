const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runTests() {
  console.log('--- INICIANDO PRUEBAS DE FASE 2 Y 3 ---');

  // 1. Setup Data
  const company = await prisma.company.findFirst() || await prisma.company.create({
    data: { name: 'Empresa Test', rfc: 'TEST010203001' }
  });
  
  const client = await prisma.client.findFirst() || await prisma.client.create({
    data: { name: 'Cliente Test', code: 'C001', companyId: company.id }
  });

  const period = await prisma.payrollPeriod.findFirst() || await prisma.payrollPeriod.create({
    data: { 
      name: 'Periodo Prueba', 
      startDate: new Date(), 
      endDate: new Date(), 
      paymentDate: new Date(), 
      companyId: company.id 
    }
  });

  const employee = await prisma.employee.create({
    data: {
      code: 'EMP-' + Date.now(),
      firstName: 'Juan',
      lastName: 'Pérez',
      rfc: 'JUPR800101XXX' + Math.floor(Math.random() * 1000),
      curp: 'JUPR800101HXXXXX0' + Math.floor(Math.random() * 9),
      hiredDate: new Date('2020-01-01'),
      dailySalary: 500,
      sdi: 525,
      contractType: '01',
      regimeType: '02',
      companyId: company.id
    }
  });

  // Get first user and create token directly or bypass guard.
  // Wait, let's just bypass by using a mock token or actually logging in if user exists.
  let token = '';
  const user = await prisma.user.findFirst();
  if (user) {
    // try to login
    try {
      // Create a test user if needed, or we just remove the AuthGuard temporarily for the test, 
      // but it's better to login if we can.
      // Actually, since I have the DB, I can just create a JWT if I know the secret.
    } catch(e) {}
  }
  
  // Let's modify the script to directly call the service functions, bypassing the HTTP layer.
  // This is a much better Unit/Integration test anyway since we don't need to worry about JWTs!
}
runTests().catch(console.error);
