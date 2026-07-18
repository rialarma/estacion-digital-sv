import React, { useState, useEffect } from 'react';
import {
  Download, FileText, Printer, Clock, CheckCircle,
  XCircle, Send, Stamp, FlaskConical, RefreshCw,
  ChevronRight, AlertTriangle, Mail, MessageCircle
} from 'lucide-react';
import { supabase } from '../supabase';
import PageHeader from '../components/PageHeader';

// ─────────────────────────────────────────────────────────────────────────────
// ESTADOS DTE — ciclo de vida de un documento tributario electrónico (El Salvador)
// ─────────────────────────────────────────────────────────────────────────────
// PENDIENTE      → Documento creado localmente, aún no enviado al firmador
// ENVIADO_A_MH   → JSON firmado enviado al portal de Hacienda, esperando sello
// SELLADO        → Hacienda devolvió el sello de recepción (documento válido)
// RECHAZADO      → Hacienda rechazó el documento (error en datos o firma)
// ─────────────────────────────────────────────────────────────────────────────

const ESTADO_CONFIG = {
  PENDIENTE: {
    label: 'Pendiente',
    color: '#fbbf24',
    bg: 'rgba(251, 191, 36, 0.12)',
    border: 'rgba(251, 191, 36, 0.3)',
    Icon: Clock,
  },
  ENVIADO_A_MH: {
    label: 'Enviado a MH',
    color: '#60a5fa',
    bg: 'rgba(96, 165, 250, 0.12)',
    border: 'rgba(96, 165, 250, 0.3)',
    Icon: Send,
  },
  SELLADO: {
    label: 'Sellado',
    color: '#4ade80',
    bg: 'rgba(74, 222, 128, 0.12)',
    border: 'rgba(74, 222, 128, 0.3)',
    Icon: CheckCircle,
  },
  RECHAZADO: {
    label: 'Rechazado',
    color: '#f87171',
    bg: 'rgba(248, 113, 113, 0.12)',
    border: 'rgba(248, 113, 113, 0.3)',
    Icon: XCircle,
  },
};

// Genera un sello de recepción falso con formato similar al real de MH
const generarSelloFalso = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bloque = (n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${bloque(8)}-${bloque(4)}-${bloque(4)}-${bloque(4)}-${bloque(12)}`;
};

const EstadoBadge = ({ status }) => {
  const cfg = ESTADO_CONFIG[status] || ESTADO_CONFIG['PENDIENTE'];
  const { label, color, bg, border, Icon } = cfg;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      color,
      background: bg,
      border: `1px solid ${border}`,
      padding: '4px 10px',
      borderRadius: '6px',
      fontWeight: 600,
      fontSize: '12px',
      whiteSpace: 'nowrap',
    }}>
      <Icon size={12} />
      {label}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Panel de simulación del firmador para un documento individual
// ─────────────────────────────────────────────────────────────────────────────
const SimuladorFirmador = ({ doc, onSimular }) => {
  const [simulando, setSimulando] = useState(false);

  const simular = async (accion) => {
    setSimulando(true);
    // Simula latencia de red al firmador (~1.5s)
    await new Promise(r => setTimeout(r, 1500));
    onSimular(doc.id, accion);
    setSimulando(false);
  };

  if (doc.status === 'PENDIENTE') {
    return (
      <button
        onClick={() => simular('ENVIAR')}
        disabled={simulando}
        title="[SIMULACIÓN] Enviar al firmador MH"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '4px 10px',
          borderRadius: '6px',
          border: '1px solid rgba(96, 165, 250, 0.4)',
          background: 'rgba(96, 165, 250, 0.1)',
          color: '#60a5fa',
          cursor: simulando ? 'not-allowed' : 'pointer',
          fontSize: '12px',
          fontWeight: 600,
          transition: 'all 0.2s',
          opacity: simulando ? 0.6 : 1,
        }}
      >
        {simulando
          ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Enviando...</>
          : <><Send size={12} /> Enviar a MH</>
        }
      </button>
    );
  }

  if (doc.status === 'ENVIADO_A_MH') {
    return (
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <button
          onClick={() => simular('SELLAR')}
          disabled={simulando}
          title="[SIMULACIÓN] MH aprueba y devuelve sello"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            borderRadius: '6px',
            border: '1px solid rgba(74, 222, 128, 0.4)',
            background: 'rgba(74, 222, 128, 0.1)',
            color: '#4ade80',
            cursor: simulando ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: 600,
            transition: 'all 0.2s',
            opacity: simulando ? 0.6 : 1,
          }}
        >
          {simulando
            ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Procesando...</>
            : <><CheckCircle size={12} /> Aprobar (MH)</>
          }
        </button>
        <button
          onClick={() => simular('RECHAZAR')}
          disabled={simulando}
          title="[SIMULACIÓN] MH rechaza el documento"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            borderRadius: '6px',
            border: '1px solid rgba(248, 113, 113, 0.4)',
            background: 'rgba(248, 113, 113, 0.1)',
            color: '#f87171',
            cursor: simulando ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: 600,
            transition: 'all 0.2s',
            opacity: simulando ? 0.6 : 1,
          }}
        >
          {simulando ? '' : <><XCircle size={12} /> Rechazar (MH)</>}
        </button>
      </div>
    );
  }

  // SELLADO o RECHAZADO — estado terminal
  return (
    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
      {doc.status === 'SELLADO' ? '✓ Proceso completado' : '✗ Proceso finalizado'}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const Documents = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterEstado, setFilterEstado] = useState('TODOS');
  // overrides: { [docId]: { status, sello_recepcion, observaciones } }
  // Permite simular cambios de estado SIN tocar Supabase todavía.
  // Cuando se conecte el firmador real, estos overrides se eliminarán y
  // el estado vendrá directamente de la base de datos.
  const [overrides, setOverrides] = useState({});

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    
    // Nueva consulta: leer de 'dtes', joinear con 'sales' y luego con 'clients'
    const { data, error } = await supabase
      .from('dtes')
      .select(`
        *,
        sales (
          total,
          subtotal,
          tax_iva,
          clients ( name )
        )
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Normalizar los datos para que el componente los consuma igual que antes
      const normalized = data.map(dte => ({
        ...dte,
        // Mapear campos del DTE a la estructura que usa el componente
        dte_tipo: dte.dte_type,
        total: dte.sales?.total ?? 0,
        clients: dte.sales?.clients ?? null,
      }));
      setDocuments(normalized);
    } else if (error) {
      console.error('Error fetching documents:', error);
      alert('Error cargando documentos: ' + error.message);
    }
    setLoading(false);
  };

  // Aplica los overrides de simulación al listado real de Supabase
  const documentosConOverride = documents.map(doc => ({
    ...doc,
    ...(overrides[doc.id] || {}),
  }));

  // ─── Lógica de simulación ──────────────────────────────────────────────────
  // Aquí es donde el firmador real actuaría: recibiría el JSON del DTE,
  // lo firmaría, lo enviaría a Hacienda y recibiría el sello de vuelta.
  // Por ahora, simulamos cada paso manualmente para probar el flujo.
  // ──────────────────────────────────────────────────────────────────────────
  const handleSimular = (docId, accion) => {
    setOverrides(prev => {
      const current = { ...prev[docId], ...documents.find(d => d.id === docId) };

      if (accion === 'ENVIAR') {
        // Paso 1: PENDIENTE → ENVIADO_A_MH
        // (firmador toma el JSON y lo envía a Hacienda)
        return { ...prev, [docId]: { status: 'ENVIADO_A_MH', sello_recepcion: null, observaciones: null } };
      }

      if (accion === 'SELLAR') {
        // Paso 2a: ENVIADO_A_MH → SELLADO
        // (Hacienda devuelve el sello de recepción)
        const selloFalso = generarSelloFalso();
        return { ...prev, [docId]: { status: 'SELLADO', sello_recepcion: selloFalso, observaciones: null } };
      }

      if (accion === 'RECHAZAR') {
        // Paso 2b: ENVIADO_A_MH → RECHAZADO
        // (Hacienda rechaza por error en datos o firma)
        return { ...prev, [docId]: { status: 'RECHAZADO', sello_recepcion: null, observaciones: 'Error 400 — NIT no encontrado en base de datos MH (simulado)' } };
      }

      return prev;
    });
  };

  const handleResetDoc = (docId) => {
    setOverrides(prev => {
      const next = { ...prev };
      delete next[docId];
      return next;
    });
  };

  const handleDownload = (docId) => {
    alert(`[PDF] Generando documento sellado ${docId}.\nEn producción, el backend Node.js generará el PDF con el sello embebido.`);
  };

  // ─── Filtros y conteos ─────────────────────────────────────────────────────
  const estadosFiltro = ['TODOS', 'PENDIENTE', 'ENVIADO_A_MH', 'SELLADO', 'RECHAZADO'];

  const documentosFiltrados = filterEstado === 'TODOS'
    ? documentosConOverride
    : documentosConOverride.filter(d => d.status === filterEstado);

  const conteos = {
    PENDIENTE:    documentosConOverride.filter(d => d.status === 'PENDIENTE').length,
    ENVIADO_A_MH: documentosConOverride.filter(d => d.status === 'ENVIADO_A_MH').length,
    SELLADO:      documentosConOverride.filter(d => d.status === 'SELLADO').length,
    RECHAZADO:    documentosConOverride.filter(d => d.status === 'RECHAZADO').length,
  };

  const haySimulaciones = Object.keys(overrides).length > 0;

  return (
    <div className="page-container">
      <PageHeader title="Firmador DTE" icon={FileText}>
        <button className="glass-button" onClick={fetchDocuments} disabled={loading}>
          Actualizar
        </button>
      </PageHeader>

      {/* Banner modo simulación */}
      <div style={{
        marginBottom: '20px',
        padding: '12px 16px',
        background: 'rgba(251, 191, 36, 0.06)',
        border: '1px dashed rgba(251, 191, 36, 0.4)',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '13px',
        color: 'var(--text-muted)',
      }}>
        <FlaskConical size={16} color="#fbbf24" style={{ flexShrink: 0 }} />
        <span>
          <strong style={{ color: '#fbbf24' }}>Modo Simulación activo</strong> — Usa los botones en la columna
          &quot;Simular Firmador&quot; para avanzar el estado de cada documento sin necesidad de conectar el firmador real.
          Los cambios son solo en memoria; al conectar el firmador, esta columna desaparecerá.
        </span>
        {haySimulaciones && (
          <button
            onClick={() => setOverrides({})}
            style={{
              marginLeft: 'auto',
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid rgba(251, 191, 36, 0.4)',
              background: 'transparent',
              color: '#fbbf24',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <RefreshCw size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            Resetear todo
          </button>
        )}
      </div>

      {/* Tarjetas de estado */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {Object.entries(ESTADO_CONFIG).map(([key, cfg]) => {
          const { label, color, bg, border, Icon } = cfg;
          return (
            <div
              key={key}
              onClick={() => setFilterEstado(filterEstado === key ? 'TODOS' : key)}
              style={{
                background: filterEstado === key ? bg : 'rgba(255,255,255,0.04)',
                border: `1px solid ${filterEstado === key ? border : 'var(--border-color)'}`,
                borderRadius: '12px',
                padding: '16px 20px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Icon size={16} color={color} />
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{label}</span>
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color }}>{conteos[key]}</div>
            </div>
          );
        })}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {estadosFiltro.map(e => (
          <button
            key={e}
            onClick={() => setFilterEstado(e)}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: filterEstado === e ? 'var(--primary)' : 'transparent',
              color: filterEstado === e ? '#fff' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              transition: 'all 0.2s',
            }}
          >
            {e === 'TODOS' ? 'Todos' : ESTADO_CONFIG[e]?.label || e}
          </button>
        ))}
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Cargando documentos...</div>
        ) : (
          <table className="glass-table">
            <thead>
              <tr>
                <th>Tipo / Código</th>
                <th>Cliente</th>
                <th>Fecha Emisión</th>
                <th>Total</th>
                <th>Estado DTE</th>
                <th>Sello de Recepción</th>
                <th style={{ color: '#fbbf24' }}>⚗ Simular Firmador</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {documentosFiltrados.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
                    No hay documentos con este estado.
                  </td>
                </tr>
              )}
              {documentosFiltrados.map(doc => {
                const date = new Date(doc.created_at).toLocaleDateString('es-SV');
                const codigoCorto = doc.codigo_generacion
                  ? doc.codigo_generacion.split('-')[0].toUpperCase()
                  : doc.id.split('-')[0].toUpperCase();
                const tipoLabel = doc.dte_tipo || 'FCF';
                const estaModificado = !!overrides[doc.id];

                return (
                  <tr key={doc.id} style={{
                    background: estaModificado ? 'rgba(251, 191, 36, 0.03)' : undefined,
                  }}>
                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={16} />
                        <div>
                          <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 400 }}>{tipoLabel}</div>
                          <div>{codigoCorto}</div>
                        </div>
                      </div>
                    </td>
                    <td>{doc.clients?.name || 'Consumidor Final'}</td>
                    <td>{date}</td>
                    <td>${Number(doc.total).toFixed(2)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <EstadoBadge status={doc.status} />
                        {estaModificado && (
                          <button
                            onClick={() => handleResetDoc(doc.id)}
                            title="Resetear simulación"
                            style={{
                              background: 'none', border: 'none', color: 'var(--text-muted)',
                              cursor: 'pointer', padding: '2px', lineHeight: 1,
                            }}
                          >
                            <RefreshCw size={11} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      {doc.sello_recepcion ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Stamp size={14} color="#4ade80" />
                          <span
                            style={{ fontSize: '11px', fontFamily: 'monospace', color: '#4ade80', letterSpacing: '0.5px', cursor: 'help' }}
                            title={doc.sello_recepcion}
                          >
                            {doc.sello_recepcion.substring(0, 18)}…
                          </span>
                        </div>
                      ) : doc.observaciones ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <AlertTriangle size={13} color="#f87171" />
                          <span
                            style={{ fontSize: '11px', color: '#f87171', cursor: 'help' }}
                            title={doc.observaciones}
                          >
                            {doc.observaciones.substring(0, 28)}…
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          Esperando sello MH…
                        </span>
                      )}
                    </td>

                    {/* Columna de simulación — desaparecerá cuando se conecte el firmador real */}
                    <td>
                      <SimuladorFirmador doc={doc} onSimular={handleSimular} />
                    </td>

                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleDownload(doc.id)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}
                          title={doc.status !== 'SELLADO' ? 'Solo disponible cuando el documento esté sellado' : 'Descargar PDF'}
                          disabled={doc.status !== 'SELLADO'}
                        >
                          <Download size={18} style={{ opacity: doc.status !== 'SELLADO' ? 0.25 : 1 }} />
                        </button>
                        <button
                          onClick={() => window.print()}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}
                          title={doc.status !== 'SELLADO' ? 'Solo disponible cuando el documento esté sellado' : 'Imprimir'}
                          disabled={doc.status !== 'SELLADO'}
                        >
                          <Printer size={18} style={{ opacity: doc.status !== 'SELLADO' ? 0.25 : 1 }} />
                        </button>
                        <button
                          onClick={() => alert('Simulando envío por correo...')}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}
                          title={doc.status !== 'SELLADO' ? 'Solo disponible cuando el documento esté sellado' : 'Enviar por Correo'}
                          disabled={doc.status !== 'SELLADO'}
                        >
                          <Mail size={18} style={{ opacity: doc.status !== 'SELLADO' ? 0.25 : 1 }} />
                        </button>
                        <button
                          onClick={() => alert('Simulando envío por WhatsApp...')}
                          style={{ background: 'transparent', border: 'none', color: '#25D366', cursor: 'pointer' }}
                          title={doc.status !== 'SELLADO' ? 'Solo disponible cuando el documento esté sellado' : 'Enviar por WhatsApp'}
                          disabled={doc.status !== 'SELLADO'}
                        >
                          <MessageCircle size={18} style={{ opacity: doc.status !== 'SELLADO' ? 0.25 : 1 }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Flujo visual del ciclo de vida */}
      <div style={{
        marginTop: '20px',
        padding: '16px 20px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '13px',
        flexWrap: 'wrap',
      }}>
        <span style={{ color: 'var(--text-muted)', marginRight: '4px' }}>Flujo DTE:</span>
        {[
          { label: 'Pendiente', color: '#fbbf24' },
          null,
          { label: 'Enviado a MH', color: '#60a5fa' },
          null,
          { label: 'Sellado ✓', color: '#4ade80' },
        ].map((item, i) =>
          item === null
            ? <ChevronRight key={i} size={14} color="var(--text-muted)" />
            : <span key={i} style={{ fontWeight: 600, color: item.color }}>{item.label}</span>
        )}
        <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>ó</span>
        <span style={{ fontWeight: 600, color: '#f87171' }}>Rechazado ✗</span>
        <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Send size={12} color="#60a5fa" />
          Al conectar el firmador, la columna &quot;Simular Firmador&quot; se reemplaza por el proceso automático.
        </span>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Documents;
