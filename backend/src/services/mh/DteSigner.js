/**
 * DteSigner: Encargado de firmar el JSON con la llave privada del Tenant y generar el JWT
 */
class DteSigner {
  /**
   * Toma el payload JSON del DTE, obtiene el certificado del tenant, y genera el JWT ("documento")
   */
  async sign(jsonDte, tenantId) {
    console.log(`Buscando certificado para el tenant ${tenantId}...`);
    // 1. Obtener llave privada y cert desde la DB segura o Vault
    
    console.log('Firmando payload (SHA256 / RSA)...');
    // 2. Firmar jsonDte -> base64
    // 3. Empaquetar en JWT según estándar de MH
    
    const signedPayload = {
      nit: "00000000000000",
      activo: true,
      passwordPri: "password_certificado",
      dteJson: jsonDte
    };
    
    // Para la prueba/simulación, retornamos un payload mockeado
    return signedPayload;
  }
}

module.exports = new DteSigner();
