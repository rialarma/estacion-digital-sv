const dteBuilder = require('./DteBuilder');
const dteSigner = require('./DteSigner');
const mhApiClient = require('./MhApiClient');

/**
 * DteOrchestrator: Punto de entrada principal para procesar DTEs.
 * Coordina Builder -> Signer -> ApiClient -> DB
 */
class DteOrchestrator {
  
  /**
   * Procesa una venta generada en Supabase y la convierte en DTE
   */
  async processSale(saleData, tenantData, clientData) {
    try {
      console.log('--- Iniciando orquestación de DTE ---');
      
      // 1. Construir JSON crudo según el tipo de documento (FCF vs CCF)
      let jsonDte;
      if (saleData.dte_type === '01') {
        jsonDte = dteBuilder.buildFCF(saleData, tenantData);
      } else if (saleData.dte_type === '03') {
        jsonDte = dteBuilder.buildCCF(saleData, tenantData, clientData);
      } else {
        throw new Error(`Tipo DTE ${saleData.dte_type} no soportado aún.`);
      }

      // 2. Firmar JSON y obtener JWT
      const signedPayload = await dteSigner.sign(jsonDte, tenantData.id);

      // 3. Autenticar con MH (esto podría estar en cache para optimizar)
      const token = await mhApiClient.authenticate(tenantData.nit, "tenant_mh_password");

      // 4. Enviar a MH
      const mhResponse = await mhApiClient.sendDte(signedPayload, token);

      console.log('--- DTE procesado exitosamente ---', mhResponse.selloRecibido);
      
      // 5. Retornar los datos para que el controlador actualice la DB (Supabase)
      return mhResponse;
      
    } catch (error) {
      console.error('Error orquestando DTE:', error.message);
      throw error;
    }
  }
}

module.exports = new DteOrchestrator();
