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

  console.log('✔ Datos base creados');

  // 2. Test Carta Porte creation via Controller
  console.log('\\n--- TEST: Crear Factura con Carta Porte y Pedimento ---');
  try {
    const cpResponse = await fetch('http://localhost:3005/api/invoices/carta-porte', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId: company.id,
        clientId: client.id,
        date: new Date().toISOString(),
        items: [
          { description: 'Transporte de Mercancia', quantity: 1, unitPrice: 5000, pedimento: '21  47  3807  8003832' }
        ],
        cartaPorte: {
          $: { Version: '3.1', IdCCP: 'CCC-123456', TotalDistRec: '150' },
          'cartaporte31:Ubicaciones': {
            'cartaporte31:Ubicacion': [{ $: { TipoUbicacion: 'Origen' } }, { $: { TipoUbicacion: 'Destino' } }]
          }
        }
      })
    });
    
    if (!cpResponse.ok) throw new Error(await cpResponse.text());
    const cpData = await cpResponse.json();
    console.log('✅ Carta Porte Creada Exitosamente. ID:', cpData.id);
    console.log('   - Tiene cartaPorteJson?', !!cpData.cartaPorteJson);
    console.log('   - Item con pedimento?', cpData.items[0].pedimento === '21  47  3807  8003832');
  } catch (err) {
    console.error('❌ Error Carta Porte:', err.message);
  }

  // 3. Test Finiquito calculation via Controller
  console.log('\\n--- TEST: Calcular Finiquito ---');
  try {
    const finResponse = await fetch('http://localhost:3005/api/payroll/calculate-finiquito', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId: employee.id,
        companyId: company.id,
        periodId: period.id,
        terminationDate: new Date().toISOString(),
        terminationReason: 'DESPIDO_INJUSTIFICADO'
      })
    });

    if (!finResponse.ok) throw new Error(await finResponse.text());
    const finData = await finResponse.json();
    console.log('✅ Finiquito Calculado Exitosamente. ID:', finData.id);
    console.log('   - isFiniquito:', finData.isFiniquito);
    console.log('   - totalPagado:', finData.totalPagado);
    console.log('   - numAñosServicio:', finData.numAnosServicio);
    
    // Verify employee status
    const empStatus = await prisma.employee.findUnique({ where: { id: employee.id } });
    console.log('   - Empleado fue dado de baja?', empStatus.isActive === false && !!empStatus.terminationDate);

  } catch (err) {
    console.error('❌ Error Finiquito:', err.message);
  }

  // 4. Test Incidencias via Controller
  console.log('\\n--- TEST: Capturar Incidencia ---');
  try {
    const incResponse = await fetch('http://localhost:3005/api/payroll/incidences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId: employee.id,
        periodId: period.id,
        type: 'HORAS_EXTRAS',
        hours: 3,
        extraType: 'DOBLES',
        date: new Date().toISOString()
      })
    });

    if (!incResponse.ok) throw new Error(await incResponse.text());
    const incData = await incResponse.json();
    console.log('✅ Incidencia Capturada. ID:', incData.id, '| Tipo:', incData.type, '| Horas:', incData.hours);
  } catch (err) {
    console.error('❌ Error Incidencia:', err.message);
  }

  console.log('\\n--- PRUEBAS COMPLETADAS ---');
  process.exit(0);
}

runTests().catch(console.error);
