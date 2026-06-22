/**
 * DteBuilder: Ensambla el JSON estructurado según el catálogo del MH
 */
class DteBuilder {
  /**
   * Construye el cuerpo JSON para una Factura de Consumidor Final (FCF - Tipo 01)
   */
  buildFCF(saleData, tenantData) {
    // Aquí se construirá la estructura JSON:
    // {
    //   identificacion: { version, ambiente, tipoDte... },
    //   documentoRelacionado: null,
    //   emisor: { nit, nrc, nombre, actividad... },
    //   receptor: { nombre, documento... },
    //   cuerpoDocumento: [...items],
    //   resumen: { totalGravada, totalIva, totalPagar... },
    //   extension: { nombreEntrega, dociEntrega... },
    //   apendice: null
    // }
    console.log('Construyendo JSON para FCF...');
    return {
      identificacion: {
        version: 1,
        ambiente: "00", // 00=Pruebas, 01=Producción
        tipoDte: "01",
        numeroControl: "DTE-01-...",
        codigoGeneracion: saleData.codigo_generacion
      },
      // Resto de la estructura pendiente de implementar
    };
  }

  /**
   * Construye el cuerpo JSON para un Comprobante de Crédito Fiscal (CCF - Tipo 03)
   */
  buildCCF(saleData, tenantData, clientData) {
    console.log('Construyendo JSON para CCF...');
    return {};
  }
}

module.exports = new DteBuilder();
