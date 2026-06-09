const fs = require('fs');
const path = require('path');

const file = 'c:\\Users\\ruthe\\.gemini\\antigravity\\scratch\\jnconta\\api\\src\\stamping.service.ts';
let content = fs.readFileSync(file, 'utf8');

// 1. Add pedimento to Concepto interface
content = content.replace(
  `  descuento?: string;`,
  `  descuento?: string;\n  pedimento?: string;`
);

// 2. Add cartaPorte to ComprobanteData
content = content.replace(
  `  complementoPago?: ComplementoPago;`,
  `  complementoPago?: ComplementoPago;\n  cartaPorte?: any;`
);

// 3. Add pedimento mapping in buildComprobanteData
content = content.replace(
  `        objetoImp: '02',`,
  `        objetoImp: '02',\n        pedimento: item.pedimento || undefined,`
);

// 4. Add cartaPorte parsing in buildComprobanteData
content = content.replace(
  `      conceptos,`,
  `      conceptos,\n      cartaPorte: doc.cartaPorteJson ? JSON.parse(doc.cartaPorteJson) : undefined,`
);

// 5. Add pedimento xml mapping in buildXml
content = content.replace(
  `              ...(item.descuento && { Descuento: item.descuento }),`,
  `              ...(item.descuento && { Descuento: item.descuento }),\n              ...(item.pedimento && { 'cfdi:InformacionAduanera': { $: { NumeroPedimento: item.pedimento } } }),`
);

// 6. Support both CartaPorte and REP in cfdi:Complemento
// The current code has:
/*
        },
          ...(c.complementoPago && {
            'cfdi:Complemento': {
              'pago20:Pagos': {
*/
// We need to change this logic to cleanly handle cfdi:Complemento
const compRegex = /          \.\.\.\(c\.complementoPago && \{[\s\S]*?'pago20:Pagos': \{[\s\S]*?\} \/\/ closes 'cfdi:Complemento'[\s\S]*?\}\),/;
// Wait, my previous multi_replace was manual. Let's just use string replace.
const oldComp = `          ...(c.complementoPago && {
            'cfdi:Complemento': {
              'pago20:Pagos': {
                $: { Version: '2.0' },
                'pago20:Totales': {
                  $: {
                    TotalTrasladosBaseIVA16: c.complementoPago.impuestosP.totalTrasladosBaseIVA16,
                    TotalTrasladosImpuestoIVA16: c.complementoPago.impuestosP.totalTrasladosImpuestoIVA16,
                  }
                },
                'pago20:Pago': {
                  $: {
                    FechaPago: c.complementoPago.fechaPago,
                    FormaDePagoP: c.complementoPago.formaDePagoP,
                    MonedaP: c.complementoPago.monedaP,
                    ...(c.complementoPago.tipoCambioP && { TipoCambioP: c.complementoPago.tipoCambioP }),
                    Monto: c.complementoPago.monto,
                    ...(c.complementoPago.numOperacion && { NumOperacion: c.complementoPago.numOperacion }),
                  },
                  'pago20:DoctoRelacionado': c.complementoPago.doctoRelacionado.map(dr => ({
                    $: {
                      IdDocumento: dr.idDocumento,
                      ...(dr.serie && { Serie: dr.serie }),
                      ...(dr.folio && { Folio: dr.folio }),
                      MonedaDR: dr.monedaDR,
                      EquivalenciaDR: dr.equivalenciaDR,
                      NumParcialidad: dr.numParcialidad,
                      ImpSaldoAnt: dr.impSaldoAnt,
                      ImpPagado: dr.impPagado,
                      ImpSaldoInsoluto: dr.impSaldoInsoluto,
                      ObjetoImpDR: dr.objetoImpDR,
                    },
                    'pago20:ImpuestosDR': {
                      'pago20:TrasladosDR': {
                        'pago20:TrasladoDR': dr.trasladosDR.map(tdr => ({
                          $: {
                            BaseDR: tdr.baseDR,
                            ImpuestoDR: tdr.impuestoDR,
                            TipoFactorDR: tdr.tipoFactorDR,
                            TasaOCuotaDR: tdr.tasaOCuotaDR,
                            ImporteDR: tdr.importeDR,
                          }
                        }))
                      }
                    }
                  })),
                  'pago20:ImpuestosP': {
                    'pago20:TrasladosP': {
                      'pago20:TrasladoP': c.complementoPago.impuestosP.trasladosP.map(tp => ({
                        $: {
                          BaseP: tp.baseP,
                          ImpuestoP: tp.impuestoP,
                          TipoFactorP: tp.tipoFactorP,
                          TasaOCuotaP: tp.tasaOCuotaP,
                          ImporteP: tp.importeP,
                        }
                      }))
                    }
                  }
                }
              }
            }
          }),`;

const newComp = `          ...((c.complementoPago || c.cartaPorte) && {
            'cfdi:Complemento': {
              ...(c.complementoPago && {
                'pago20:Pagos': {
                  $: { Version: '2.0' },
                  'pago20:Totales': {
                    $: {
                      TotalTrasladosBaseIVA16: c.complementoPago.impuestosP.totalTrasladosBaseIVA16,
                      TotalTrasladosImpuestoIVA16: c.complementoPago.impuestosP.totalTrasladosImpuestoIVA16,
                    }
                  },
                  'pago20:Pago': {
                    $: {
                      FechaPago: c.complementoPago.fechaPago,
                      FormaDePagoP: c.complementoPago.formaDePagoP,
                      MonedaP: c.complementoPago.monedaP,
                      ...(c.complementoPago.tipoCambioP && { TipoCambioP: c.complementoPago.tipoCambioP }),
                      Monto: c.complementoPago.monto,
                      ...(c.complementoPago.numOperacion && { NumOperacion: c.complementoPago.numOperacion }),
                    },
                    'pago20:DoctoRelacionado': c.complementoPago.doctoRelacionado.map(dr => ({
                      $: {
                        IdDocumento: dr.idDocumento,
                        ...(dr.serie && { Serie: dr.serie }),
                        ...(dr.folio && { Folio: dr.folio }),
                        MonedaDR: dr.monedaDR,
                        EquivalenciaDR: dr.equivalenciaDR,
                        NumParcialidad: dr.numParcialidad,
                        ImpSaldoAnt: dr.impSaldoAnt,
                        ImpPagado: dr.impPagado,
                        ImpSaldoInsoluto: dr.impSaldoInsoluto,
                        ObjetoImpDR: dr.objetoImpDR,
                      },
                      'pago20:ImpuestosDR': {
                        'pago20:TrasladosDR': {
                          'pago20:TrasladoDR': dr.trasladosDR.map(tdr => ({
                            $: {
                              BaseDR: tdr.baseDR,
                              ImpuestoDR: tdr.impuestoDR,
                              TipoFactorDR: tdr.tipoFactorDR,
                              TasaOCuotaDR: tdr.tasaOCuotaDR,
                              ImporteDR: tdr.importeDR,
                            }
                          }))
                        }
                      }
                    })),
                    'pago20:ImpuestosP': {
                      'pago20:TrasladosP': {
                        'pago20:TrasladoP': c.complementoPago.impuestosP.trasladosP.map(tp => ({
                          $: {
                            BaseP: tp.baseP,
                            ImpuestoP: tp.impuestoP,
                            TipoFactorP: tp.tipoFactorP,
                            TasaOCuotaP: tp.tasaOCuotaP,
                            ImporteP: tp.importeP,
                          }
                        }))
                      }
                    }
                  }
                }
              }),
              ...(c.cartaPorte && {
                'cartaporte31:CartaPorte': c.cartaPorte
              })
            }
          }),`;

content = content.replace(oldComp, newComp);

fs.writeFileSync(file, content);
console.log('stamping.service.ts updated');
