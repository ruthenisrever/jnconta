import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PayrollController } from './src/payroll.controller';
import { InvoicesController } from './src/invoices.controller';
import { PrismaService } from './src/prisma.service';

async function bootstrap() {
  console.log('--- INICIANDO PRUEBAS UNITARIAS DE MÓDULOS ---');
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const payrollController = app.get(PayrollController);
  const invoicesController = app.get(InvoicesController);
  const prisma = app.get(PrismaService);

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

  const employee = await prisma.employee.findFirst() || await prisma.employee.create({
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
  });

  console.log('✔ Datos base creados');

  // 2. Test Carta Porte creation via Controller
  console.log('\\n--- TEST: Crear Factura con Carta Porte y Pedimento ---');
  try {
    const cpData = await invoicesController.createCartaPorte({
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
    });
    console.log('✅ Carta Porte Creada Exitosamente. ID:', cpData.id);
  } catch (err) {
    console.error('❌ Error Carta Porte:', err.message);
  }

  // 3. Test Finiquito calculation via Controller
  console.log('\\n--- TEST: Calcular Finiquito ---');
  try {
    const finData = await payrollController.calculateFiniquito({
      employeeId: employee.id,
      companyId: company.id,
      periodId: period.id,
      terminationDate: new Date().toISOString(),
      terminationReason: 'DESPIDO_INJUSTIFICADO'
    });
    console.log('✅ Finiquito Calculado Exitosamente. ID:', finData.id);
    
    // Verify employee status
    const empStatus = await prisma.employee.findUnique({ where: { id: employee.id } });
    console.log('   - Empleado fue dado de baja?', empStatus.isActive === false && !!empStatus.terminationDate);

  } catch (err) {
    console.error('❌ Error Finiquito:', err.message);
  }

  // 4. Test Incidencias via Controller
  console.log('\\n--- TEST: Capturar Incidencia ---');
  try {
    const incData = await payrollController.createIncidence({
      employeeId: employee.id,
      periodId: period.id,
      type: 'HORAS_EXTRAS',
      hours: 3,
      extraType: 'DOBLES',
      date: new Date().toISOString()
    });
    console.log('✅ Incidencia Capturada. ID:', incData.id);
  } catch (err) {
    console.error('❌ Error Incidencia:', err.message);
  }

  console.log('\\n--- PRUEBAS COMPLETADAS ---');
  await app.close();
  process.exit(0);
}

bootstrap().catch(console.error);
