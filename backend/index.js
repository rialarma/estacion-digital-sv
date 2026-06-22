require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// ─────────────────────────────────────────────────────────────────────────────
// CICLO DE VIDA DE UN DTE (Documento Tributario Electrónico) — El Salvador
// ─────────────────────────────────────────────────────────────────────────────
// 1. ERP crea la orden → status: 'PENDIENTE'  (campo sello_recepcion: null)
// 2. ERP envía JSON al firmador → firmador firma y envía a Hacienda (MH)
//    → status: 'ENVIADO_A_MH'
// 3a. MH acepta → devuelve sello de recepción → POST /api/firmador/sello
//    → status: 'SELLADO'  (campo sello_recepcion: "<sello>")
// 3b. MH rechaza → POST /api/firmador/rechazado
//    → status: 'RECHAZADO' (campo observaciones: "<motivo>")
// ─────────────────────────────────────────────────────────────────────────────
// NOTA: Los campos necesarios en la tabla 'orders' de Supabase son:
//   status            TEXT  DEFAULT 'PENDIENTE'
//   dte_tipo          TEXT  (FCF, CCF, NCF, NDF, etc.)
//   codigo_generacion TEXT  (UUID generado por el ERP)
//   sello_recepcion   TEXT  (devuelto por MH, nulo hasta ser sellado)
//   json_firmado      JSONB (el DTE completo tal como lo recibe el firmador)
//   observaciones     TEXT  (motivo de rechazo si aplica)
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend Estación Digital SV corriendo correctamente' });
});

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTOS — generación de PDF
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/documents/generate', (req, res) => {
  const { orderData } = req.body;

  if (!orderData) {
    return res.status(400).json({ error: 'orderData es requerido' });
  }

  // TODO: Implementar generación de PDF con pdfkit
  // Solo se permite generar PDF de documentos con status SELLADO
  if (orderData.status !== 'SELLADO') {
    return res.status(400).json({
      error: 'Solo se puede generar PDF de documentos con estado SELLADO.',
      status: orderData.status,
    });
  }

  res.json({
    success: true,
    message: 'Documento generado con éxito',
    documentUrl: `http://localhost:${PORT}/api/documents/download/${orderData.id}`,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FIRMADOR — Endpoints preparados para conectar el firmador de Hacienda
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/firmador/sello
 *
 * Este endpoint será llamado por el firmador cuando Hacienda devuelva
 * el sello de recepción de un DTE aprobado.
 *
 * Body esperado:
 * {
 *   "codigo_generacion": "UUID-DEL-DTE",
 *   "sello_recepcion":   "SELLO-DEVUELTO-POR-MH",
 *   "fecha_hora_mh":     "2024-01-01T12:00:00"  // opcional
 * }
 *
 * Acción: Actualizar el registro en Supabase → status = 'SELLADO'
 */
app.post('/api/firmador/sello', async (req, res) => {
  const { codigo_generacion, sello_recepcion, fecha_hora_mh } = req.body;

  if (!codigo_generacion || !sello_recepcion) {
    return res.status(400).json({
      error: 'Se requieren codigo_generacion y sello_recepcion',
    });
  }

  // TODO: Conectar con Supabase para actualizar el documento
  // Ejemplo de implementación cuando se conecte:
  //
  // const { createClient } = require('@supabase/supabase-js');
  // const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  //
  // const { error } = await supabase
  //   .from('orders')
  //   .update({
  //     status: 'SELLADO',
  //     sello_recepcion: sello_recepcion,
  //     fecha_sellado: fecha_hora_mh || new Date().toISOString(),
  //   })
  //   .eq('codigo_generacion', codigo_generacion);
  //
  // if (error) return res.status(500).json({ error: error.message });

  console.log(`[FIRMADOR] Sello recibido para DTE: ${codigo_generacion} → ${sello_recepcion}`);

  res.json({
    success: true,
    message: `DTE ${codigo_generacion} marcado como SELLADO`,
    sello_recepcion,
  });
});

/**
 * POST /api/firmador/rechazado
 *
 * Llamado por el firmador cuando Hacienda rechaza un DTE.
 *
 * Body esperado:
 * {
 *   "codigo_generacion": "UUID-DEL-DTE",
 *   "observaciones":     "Motivo del rechazo devuelto por MH"
 * }
 */
app.post('/api/firmador/rechazado', async (req, res) => {
  const { codigo_generacion, observaciones } = req.body;

  if (!codigo_generacion) {
    return res.status(400).json({ error: 'Se requiere codigo_generacion' });
  }

  // TODO: Conectar con Supabase para actualizar el documento
  // const { error } = await supabase
  //   .from('orders')
  //   .update({
  //     status: 'RECHAZADO',
  //     observaciones: observaciones || 'Rechazado por Hacienda sin observaciones',
  //   })
  //   .eq('codigo_generacion', codigo_generacion);

  console.log(`[FIRMADOR] DTE RECHAZADO: ${codigo_generacion} — ${observaciones}`);

  res.json({
    success: true,
    message: `DTE ${codigo_generacion} marcado como RECHAZADO`,
    observaciones,
  });
});

/**
 * POST /api/firmador/enviado
 *
 * Llamado internamente por el ERP cuando se envía el DTE al firmador.
 * Cambia el estado de PENDIENTE a ENVIADO_A_MH.
 *
 * Body esperado:
 * {
 *   "codigo_generacion": "UUID-DEL-DTE",
 *   "json_firmado": { ...el JSON del DTE completo... }
 * }
 */
app.post('/api/firmador/enviado', async (req, res) => {
  const { codigo_generacion, json_firmado } = req.body;

  if (!codigo_generacion) {
    return res.status(400).json({ error: 'Se requiere codigo_generacion' });
  }

  // TODO: Conectar con Supabase para actualizar el documento
  // const { error } = await supabase
  //   .from('orders')
  //   .update({
  //     status: 'ENVIADO_A_MH',
  //     json_firmado: json_firmado || null,
  //   })
  //   .eq('codigo_generacion', codigo_generacion);

  console.log(`[FIRMADOR] DTE enviado a MH: ${codigo_generacion}`);

  res.json({
    success: true,
    message: `DTE ${codigo_generacion} marcado como ENVIADO_A_MH`,
  });
});

app.listen(PORT, () => {
  console.log(`Estación Digital SV Backend corriendo en el puerto ${PORT}`);
  console.log(`Endpoints del firmador listos en /api/firmador/`);
});
