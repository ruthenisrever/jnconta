const fs = require('fs');
const path = 'c:\\Users\\ruthe\\.gemini\\antigravity\\scratch\\jnconta\\api\\src\\stamping.service.ts';
let content = fs.readFileSync(path, 'utf8');

// 1. In buildComprobanteData, fix IVA calculation for PAYROLL
const ivaRegex = /const tasa = '0\.160000';\s*const ivaImporte = fmt\(parseFloat\(base\) \* 0\.16\);/g;
const ivaReplacement = `const tasa = entity === 'PAYROLL' ? '' : '0.160000';\n      const ivaImporte = entity === 'PAYROLL' ? '0' : fmt(parseFloat(base) * 0.16);`;
content = content.replace(ivaRegex, ivaReplacement);

const trasladosRegex = /traslados: \[\{ base, impuesto: '002', tipoFactor: 'Tasa', tasaOCuota: tasa, importe: ivaImporte \}\],/g;
const trasladosReplacement = `traslados: entity === 'PAYROLL' ? [] : [{ base, impuesto: '002', tipoFactor: 'Tasa', tasaOCuota: tasa, importe: ivaImporte }],`;
content = content.replace(trasladosRegex, trasladosReplacement);

const objImpRegex = /objetoImp: '02',/g;
const objImpReplacement = `objetoImp: entity === 'PAYROLL' ? '01' : '02',`;
content = content.replace(objImpRegex, objImpReplacement);

// 2. Add nomina to ComprobanteData interface
content = content.replace(/cartaPorte\?: any;/, `cartaPorte?: any;\n  nomina?: any;`);

// 3. Inject nomina logic into buildCadenaOriginal
const anchorCadena = `// ── Complemento Carta Porte 3.1 ──`;
const nominaCadena = `// ── Complemento Nomina 1.2 ──
    if (c.nomina) {
      push(c.nomina.$?.Version);
      push(c.nomina.$?.TipoNomina);
      push(c.nomina.$?.FechaPago);
      push(c.nomina.$?.FechaInicialPago);
      push(c.nomina.$?.FechaFinalPago);
      push(c.nomina.$?.NumDiasPagados);
      push(c.nomina.$?.TotalPercepciones);
      push(c.nomina.$?.TotalDeducciones);
      push(c.nomina.$?.TotalOtrosPagos);

      if (c.nomina['nomina12:Receptor']) {
        const r = c.nomina['nomina12:Receptor'].$;
        push(r?.Curp);
        push(r?.NumSeguridadSocial);
        push(r?.FechaInicioRelLaboral);
        push(r?.Antigüedad);
        push(r?.TipoContrato);
        push(r?.Sindicalizado);
        push(r?.TipoJornada);
        push(r?.TipoRegimen);
        push(r?.NumEmpleado);
        push(r?.Departamento);
        push(r?.Puesto);
        push(r?.RiesgoPuesto);
        push(r?.PeriodicidadPago);
        push(r?.Banco);
        push(r?.CuentaBancaria);
        push(r?.SalarioBaseCotApor);
        push(r?.SalarioDiarioIntegrado);
        push(r?.ClaveEntFed);
      }

      if (c.nomina['nomina12:Percepciones']) {
        const p = c.nomina['nomina12:Percepciones'];
        push(p.$?.TotalSueldos);
        push(p.$?.TotalSeparacionIndemnizacion);
        push(p.$?.TotalJubilacionPensionRetiro);
        push(p.$?.TotalGravado);
        push(p.$?.TotalExento);

        if (p['nomina12:Percepcion']) {
          const arr = Array.isArray(p['nomina12:Percepcion']) ? p['nomina12:Percepcion'] : [p['nomina12:Percepcion']];
          for (const per of arr) {
            push(per.$?.TipoPercepcion);
            push(per.$?.Clave);
            push(per.$?.Concepto);
            push(per.$?.ImporteGravado);
            push(per.$?.ImporteExento);
            // Horas Extra
            if (per['nomina12:HorasExtra']) {
              const heArr = Array.isArray(per['nomina12:HorasExtra']) ? per['nomina12:HorasExtra'] : [per['nomina12:HorasExtra']];
              for (const he of heArr) {
                push(he.$?.Dias);
                push(he.$?.TipoHoras);
                push(he.$?.HorasExtra);
                push(he.$?.ImportePagado);
              }
            }
          }
        }
        
        // Finiquitos
        if (p['nomina12:SeparacionIndemnizacion']) {
          const si = p['nomina12:SeparacionIndemnizacion'].$;
          push(si?.TotalPagado);
          push(si?.NumAñosServicio);
          push(si?.UltimoSueldoMensOrd);
          push(si?.IngresoAcumulable);
          push(si?.IngresoNoAcumulable);
        }
      }

      if (c.nomina['nomina12:Deducciones']) {
        const d = c.nomina['nomina12:Deducciones'];
        push(d.$?.TotalOtrasDeducciones);
        push(d.$?.TotalImpuestosRetenidos);
        
        if (d['nomina12:Deduccion']) {
          const dArr = Array.isArray(d['nomina12:Deduccion']) ? d['nomina12:Deduccion'] : [d['nomina12:Deduccion']];
          for (const ded of dArr) {
            push(ded.$?.TipoDeduccion);
            push(ded.$?.Clave);
            push(ded.$?.Concepto);
            push(ded.$?.Importe);
          }
        }
      }
      
      if (c.nomina['nomina12:Incapacidades']) {
        const incs = c.nomina['nomina12:Incapacidades'];
        if (incs['nomina12:Incapacidad']) {
          const incArr = Array.isArray(incs['nomina12:Incapacidad']) ? incs['nomina12:Incapacidad'] : [incs['nomina12:Incapacidad']];
          for (const inc of incArr) {
            push(inc.$?.DiasIncapacidad);
            push(inc.$?.TipoIncapacidad);
            push(inc.$?.ImporteMonetario);
          }
        }
      }
    }

    // ── Complemento Carta Porte 3.1 ──`;
content = content.replace(anchorCadena, nominaCadena);

fs.writeFileSync(path, content);
console.log('Stamping service payroll chain updated.');
