const fs = require('fs');
const file = 'c:\\Users\\ruthe\\.gemini\\antigravity\\scratch\\jnconta\\api\\src\\stamping.service.ts';
let content = fs.readFileSync(file, 'utf8');

const anchor = `    // ── Impuestos del Comprobante (globales) ──`;
const replacement = `    // ── Complemento Carta Porte 3.1 ──
    if (c.cartaPorte) {
      push(c.cartaPorte.$?.Version);
      push(c.cartaPorte.$?.IdCCP);
      push(c.cartaPorte.$?.TranspInternac);
      push(c.cartaPorte.$?.RegimenAduanero);
      push(c.cartaPorte.$?.EntradaSalidaMerc);
      push(c.cartaPorte.$?.PaisDeOrigenODestino);
      push(c.cartaPorte.$?.ViaEntradaSalida);
      push(c.cartaPorte.$?.TotalDistRec);

      if (c.cartaPorte['cartaporte31:Ubicaciones']) {
        const ubicaciones = Array.isArray(c.cartaPorte['cartaporte31:Ubicaciones']['cartaporte31:Ubicacion']) 
          ? c.cartaPorte['cartaporte31:Ubicaciones']['cartaporte31:Ubicacion'] 
          : [c.cartaPorte['cartaporte31:Ubicaciones']['cartaporte31:Ubicacion']].filter(Boolean);
        
        for (const u of ubicaciones) {
          push(u.$?.TipoUbicacion);
          push(u.$?.IDUbicacion);
          push(u.$?.RFCRemitenteDestinatario);
          push(u.$?.NombreRemitenteDestinatario);
          push(u.$?.NumRegIdTrib);
          push(u.$?.ResidenciaFiscal);
          push(u.$?.NumEstacion);
          push(u.$?.NombreEstacion);
          push(u.$?.NavegacionTrafico);
          push(u.$?.FechaHoraSalidaLlegada);
          push(u.$?.TipoEstacion);
          push(u.$?.DistanciaRecorrida);
          
          if (u['cartaporte31:Domicilio']) {
            const dom = u['cartaporte31:Domicilio'].$;
            push(dom?.Calle);
            push(dom?.NumeroExterior);
            push(dom?.NumeroInterior);
            push(dom?.Colonia);
            push(dom?.Localidad);
            push(dom?.Referencia);
            push(dom?.Municipio);
            push(dom?.Estado);
            push(dom?.Pais);
            push(dom?.CodigoPostal);
          }
        }
      }

      if (c.cartaPorte['cartaporte31:Mercancias']) {
        const mercs = c.cartaPorte['cartaporte31:Mercancias'];
        push(mercs.$?.PesoBrutoTotal);
        push(mercs.$?.UnidadPeso);
        push(mercs.$?.PesoNetoTotal);
        push(mercs.$?.NumTotalMercancias);
        push(mercs.$?.CargoPorTasacion);

        const mercList = Array.isArray(mercs['cartaporte31:Mercancia']) 
          ? mercs['cartaporte31:Mercancia'] 
          : [mercs['cartaporte31:Mercancia']].filter(Boolean);

        for (const m of mercList) {
          push(m.$?.BienesTransp);
          push(m.$?.ClaveSTCC);
          push(m.$?.Descripcion);
          push(m.$?.Cantidad);
          push(m.$?.ClaveUnidad);
          push(m.$?.Unidad);
          push(m.$?.Dimensiones);
          push(m.$?.MaterialPeligroso);
          push(m.$?.CveMaterialPeligroso);
          push(m.$?.Embalaje);
          push(m.$?.DescripEmbalaje);
          push(m.$?.PesoEnKg);
          push(m.$?.ValorMercancia);
          push(m.$?.Moneda);
          push(m.$?.FraccionArancelaria);
          push(m.$?.UUIDComercioExt);
        }

        if (mercs['cartaporte31:Autotransporte']) {
          const auto = mercs['cartaporte31:Autotransporte'];
          push(auto.$?.PermSCT);
          push(auto.$?.NumPermisoSCT);

          if (auto['cartaporte31:IdentificacionVehicular']) {
            const iv = auto['cartaporte31:IdentificacionVehicular'].$;
            push(iv?.ConfigVehicular);
            push(iv?.PesoBrutoVehicular);
            push(iv?.PlacaVM);
            push(iv?.AnioModeloVM);
          }
          if (auto['cartaporte31:Seguros']) {
            const seg = auto['cartaporte31:Seguros'].$;
            push(seg?.AseguraRespCivil);
            push(seg?.PolizaRespCivil);
            push(seg?.AseguraMedAmbiente);
            push(seg?.PolizaMedAmbiente);
            push(seg?.AseguraCarga);
            push(seg?.PolizaCarga);
            push(seg?.PrimaSeguro);
          }
          if (auto['cartaporte31:Remolques'] && auto['cartaporte31:Remolques']['cartaporte31:Remolque']) {
            const rems = Array.isArray(auto['cartaporte31:Remolques']['cartaporte31:Remolque']) 
              ? auto['cartaporte31:Remolques']['cartaporte31:Remolque'] 
              : [auto['cartaporte31:Remolques']['cartaporte31:Remolque']];
            for (const r of rems) {
              push(r.$?.SubTipoRem);
              push(r.$?.Placa);
            }
          }
        }
      }

      if (c.cartaPorte['cartaporte31:FiguraTransporte'] && c.cartaPorte['cartaporte31:FiguraTransporte']['cartaporte31:TiposFigura']) {
        const figs = Array.isArray(c.cartaPorte['cartaporte31:FiguraTransporte']['cartaporte31:TiposFigura']) 
          ? c.cartaPorte['cartaporte31:FiguraTransporte']['cartaporte31:TiposFigura'] 
          : [c.cartaPorte['cartaporte31:FiguraTransporte']['cartaporte31:TiposFigura']];
        
        for (const f of figs) {
          push(f.$?.TipoFigura);
          push(f.$?.RFCFigura);
          push(f.$?.NumLicencia);
          push(f.$?.NombreFigura);
          push(f.$?.NumRegIdTribFigura);
          push(f.$?.ResidenciaFiscalFigura);
        }
      }
    }

    // ── Informacion Aduanera en Conceptos ──
    // Wait, InformacionAduanera in CFDI 4.0 Cadena Original goes inside the Conceptos loop.
    // I need to add pedimento mapping inside Conceptos.

    // ── Impuestos del Comprobante (globales) ──`;

// Wait! InformacionAduanera must be added INSIDE the conceptos loop!
const conceptLoopAnchor = `      // Impuestos del Concepto — Traslados`;
const conceptLoopReplacement = `      // InformacionAduanera
      if (concepto.pedimento) {
        push(concepto.pedimento);
      }

      // Impuestos del Concepto — Traslados`;

content = content.replace(anchor, replacement);
content = content.replace(conceptLoopAnchor, conceptLoopReplacement);

fs.writeFileSync(file, content);
console.log("update_cadena_original.js complete");
