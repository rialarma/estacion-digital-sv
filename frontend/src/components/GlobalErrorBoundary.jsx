import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Actualiza el estado para que el siguiente renderizado muestre la UI de repuesto.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Aquí puedes registrar el error en un servicio de reporte de errores (Sentry, etc.)
    console.error("Error capturado por ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // Puedes renderizar cualquier UI de repuesto personalizada
      return (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh', 
          backgroundColor: 'var(--background)',
          color: 'var(--text-color)',
          padding: '20px',
          textAlign: 'center'
        }}>
          <AlertTriangle size={64} color="var(--danger)" style={{ marginBottom: '20px' }} />
          <h1 style={{ marginBottom: '10px' }}>¡Ups! Algo salió mal.</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '30px', maxWidth: '500px' }}>
            Ha ocurrido un error inesperado en la aplicación. Hemos registrado el problema para solucionarlo pronto.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCcw size={18} /> Recargar Página
          </button>
          
          {process.env.NODE_ENV === 'development' && (
            <details style={{ marginTop: '40px', textAlign: 'left', backgroundColor: 'var(--bg-lighter)', padding: '15px', borderRadius: '8px', maxWidth: '800px', overflowX: 'auto' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Ver detalles técnicos</summary>
              <pre style={{ marginTop: '10px', fontSize: '12px', color: 'var(--danger)' }}>
                {this.state.error && this.state.error.toString()}
                <br />
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children; 
  }
}

export default GlobalErrorBoundary;
