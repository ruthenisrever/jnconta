const fetch = require('node-fetch');

async function probeFinkok() {
    const username = 'rutheni.qm@gmail.com';
    const password = 'Ingeniero66';
    const endpoint = 'https://facturacion.finkok.com/servicios/soap/utilities';

    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:util="http://facturacion.finkok.com/utilities">
  <soapenv:Header/>
  <soapenv:Body>
    <util:get_credit>
      <util:username>${username}</util:username>
      <util:password>${password}</util:password>
    </util:get_credit>
  </soapenv:Body>
</soapenv:Envelope>`;

    console.log('--- PROBANDO FINKOK PRODUCCIÓN REAL ---');
    console.log('Endpoint:', endpoint);

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                SOAPAction: '"http://facturacion.finkok.com/utilities/get_credit"',
            },
            body: soapEnvelope
        });

        console.log('Status:', response.status);
        const text = await response.text();
        console.log('Raw Response XML:');
        console.log(text);
        
        if (text.includes('Fault')) {
            console.log('\n❌ ERROR EN EL SOBRE SOAP (FAULT)');
        }
    } catch (e) {
        console.error('Error de red:', e.message);
    }
}

probeFinkok();
