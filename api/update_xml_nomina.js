const fs = require('fs');
const path = 'c:\\Users\\ruthe\\.gemini\\antigravity\\scratch\\jnconta\\api\\src\\stamping.service.ts';
let content = fs.readFileSync(path, 'utf8');

// 1. Add namespace to Comprobante root
const xsiRegex = /'\.\.\.\(c\.complementoPago && \{ '\\xmlns:pago20': 'http:\/\/www\.sat\.gob\.mx\/Pagos20' \}\),'/;
// We'll replace using a more robust string match.
content = content.replace(
  /\.\.\.\(c\.complementoPago && \{ 'xmlns:pago20': 'http:\/\/www\.sat\.gob\.mx\/Pagos20' \}\),/,
  `...(c.complementoPago && { 'xmlns:pago20': 'http://www.sat.gob.mx/Pagos20' }),\n          ...(c.nomina && { 'xmlns:nomina12': 'http://www.sat.gob.mx/nomina12' }),`
);

content = content.replace(
  /'xsi:schemaLocation':\s*'http:\/\/www\.sat\.gob\.mx\/cfd\/4 http:\/\/www\.sat\.gob\.mx\/sitio_internet\/cfd\/4\/cfdv40\.xsd'\s*\+\s*\(c\.complementoPago \? ' http:\/\/www\.sat\.gob\.mx\/Pagos20 http:\/\/www\.sat\.gob\.mx\/sitio_internet\/cfd\/Pagos\/Pagos20\.xsd' : ''\),/g,
  `'xsi:schemaLocation': 'http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd' + (c.complementoPago ? ' http://www.sat.gob.mx/Pagos20 http://www.sat.gob.mx/sitio_internet/cfd/Pagos/Pagos20.xsd' : '') + (c.nomina ? ' http://www.sat.gob.mx/nomina12 http://www.sat.gob.mx/sitio_internet/cfd/nomina/nomina12.xsd' : ''),`
);

// 2. Add nomina to cfdi:Complemento
content = content.replace(
  /\.\.\.\(\(c\.complementoPago \|\| c\.cartaPorte\) && \{/,
  `...((c.complementoPago || c.cartaPorte || c.nomina) && {`
);

content = content.replace(
  /'cartaporte31:CartaPorte': c\.cartaPorte\n\s*\}\)/,
  `'cartaporte31:CartaPorte': c.cartaPorte\n              }),\n              ...(c.nomina && {\n                'nomina12:Nomina': c.nomina\n              })`
);

fs.writeFileSync(path, content);
console.log('Stamping service XML generation updated for Nomina 1.2');
