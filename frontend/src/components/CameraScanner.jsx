import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';

const CameraScanner = ({ onScan, onClose }) => {
  const scannerRef = useRef(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // Configuración del escáner
    const config = { 
      fps: 10, 
      qrbox: { width: 250, height: 250 },
      supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
      rememberLastUsedCamera: true
    };

    // false = no verbose logging
    const scanner = new Html5QrcodeScanner("reader", config, false);

    const onScanSuccess = (decodedText, decodedResult) => {
      onScan(decodedText);
    };

    const onScanFailure = (error) => {
      // Ignoramos errores de "código no encontrado" (sucede en cada frame donde no hay código)
    };

    try {
      scanner.render(onScanSuccess, onScanFailure);
    } catch (err) {
      setErrorMsg('No se pudo inicializar la cámara. Verifica los permisos.');
    }

    return () => {
      scanner.clear().catch(error => {
        console.error("Failed to clear html5QrcodeScanner. ", error);
      });
    };
  }, [onScan]);

  return (
    <div className="glass-panel" style={{ 
      padding: '24px', 
      width: '100%', 
      maxWidth: '500px', 
      margin: '0 auto', 
      position: 'relative',
      background: 'var(--bg-dark)',
      border: '1px solid var(--border-color)',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
    }}>
      <button 
        onClick={onClose}
        className="glass-button"
        style={{ 
          position: 'absolute', 
          top: '12px', 
          right: '12px', 
          background: '#ef4444', 
          color: 'white', 
          border: 'none', 
          padding: '6px 12px', 
          cursor: 'pointer', 
          zIndex: 10,
          minWidth: 'auto',
          fontSize: '14px'
        }}
      >
        Cerrar
      </button>
      <h3 style={{ marginBottom: '16px', textAlign: 'center', paddingRight: '60px' }}>Escanear Código</h3>
      
      {errorMsg ? (
        <div style={{ color: '#ef4444', textAlign: 'center', padding: '20px' }}>{errorMsg}</div>
      ) : (
        <div id="reader" ref={scannerRef} style={{ width: '100%' }}></div>
      )}
      
      <style>{`
        #reader { border: none !important; }
        #reader video { border-radius: 8px; }
        #reader button {
          background-color: var(--primary);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          margin-top: 10px;
          font-family: inherit;
        }
        #reader button:hover { background-color: #2563eb; }
        #reader select {
          padding: 8px;
          border-radius: 6px;
          background: rgba(255,255,255,0.1);
          color: white;
          border: 1px solid var(--border-color);
          margin-bottom: 10px;
          width: 100%;
        }
        #reader a { display: none !important; }
        #reader span { display: none !important; }
      `}</style>
    </div>
  );
};

export default CameraScanner;
