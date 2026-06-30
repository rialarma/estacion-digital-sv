import React from 'react';
import { renderToString } from 'react-dom/server';

const TicketTemplate = ({ sale, items, tenant }) => {
  const date = new Date(sale.created_at).toLocaleString('es-SV');
  
  return (
    <div style={{ fontFamily: 'monospace', fontSize: '12px', width: '74mm', margin: '0 auto', color: '#000', background: '#fff', padding: '2mm' }}>
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        {tenant?.logo_url && <img src={tenant.logo_url} alt="Logo" style={{ maxWidth: '120px', marginBottom: '10px' }} />}
        <h2 style={{ fontSize: '16px', margin: '0 0 5px 0' }}>{tenant?.name || 'EMPRESA'}</h2>
        <p style={{ margin: '0 0 2px 0' }}>NIT: {tenant?.nit}</p>
        <p style={{ margin: '0 0 2px 0' }}>NRC: {tenant?.nrc}</p>
        {tenant?.ticket_header && (
          <div style={{ whiteSpace: 'pre-wrap', marginTop: '5px', fontSize: '10px' }}>
            {tenant.ticket_header}
          </div>
        )}
      </div>

      <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }} />

      <div style={{ marginBottom: '10px' }}>
        <p style={{ margin: '0 0 2px 0' }}><strong>DTE:</strong> {sale.dte_code || 'N/A'}</p>
        <p style={{ margin: '0 0 2px 0' }}><strong>Fecha:</strong> {date}</p>
        <p style={{ margin: '0 0 2px 0' }}><strong>Cliente:</strong> {sale.clients?.name || 'Consumidor Final'}</p>
        <p style={{ margin: '0 0 2px 0' }}><strong>Cajero:</strong> {sale.sellers?.name || 'Caja'}</p>
      </div>

      <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }} />

      <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #000' }}>
            <th style={{ textAlign: 'left', paddingBottom: '4px' }}>CANT</th>
            <th style={{ textAlign: 'left', paddingBottom: '4px' }}>DESCRIPCIÓN</th>
            <th style={{ textAlign: 'right', paddingBottom: '4px' }}>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td style={{ verticalAlign: 'top', paddingTop: '4px' }}>{item.quantity}</td>
              <td style={{ verticalAlign: 'top', paddingTop: '4px', paddingRight: '5px' }}>
                {item.products?.name || 'Producto'}
                <br />
                <small>${Number(item.unit_price).toFixed(2)} c/u</small>
              </td>
              <td style={{ verticalAlign: 'top', paddingTop: '4px', textAlign: 'right' }}>
                ${Number(item.subtotal).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }} />

      <div style={{ textAlign: 'right', fontSize: '14px', fontWeight: 'bold' }}>
        <p style={{ margin: '2px 0' }}>SUBTOTAL: ${Number(sale.subtotal).toFixed(2)}</p>
        <p style={{ margin: '2px 0' }}>IVA: ${Number(sale.tax_amount).toFixed(2)}</p>
        <p style={{ margin: '4px 0', fontSize: '16px' }}>TOTAL: ${Number(sale.total).toFixed(2)}</p>
      </div>

      <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }} />

      <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '10px' }}>
        {tenant?.receipt_message && <p style={{ whiteSpace: 'pre-wrap' }}>{tenant.receipt_message}</p>}
        <p style={{ marginTop: '10px' }}>Generado por Estación Digital SV</p>
      </div>
    </div>
  );
};

const PDFLetterTemplate = ({ sale, items, tenant }) => {
  const date = new Date(sale.created_at).toLocaleString('es-SV');

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', width: '210mm', minHeight: '297mm', padding: '20mm', margin: '0 auto', background: '#fff', color: '#000', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000', paddingBottom: '20px', marginBottom: '20px' }}>
        <div style={{ width: '50%' }}>
          {tenant?.logo_url && <img src={tenant.logo_url} alt="Logo" style={{ maxHeight: '80px', marginBottom: '10px' }} />}
          <h1 style={{ fontSize: '24px', margin: '0 0 10px 0' }}>{tenant?.name || 'EMPRESA'}</h1>
          <p style={{ margin: '0 0 4px 0', fontSize: '12px' }}><strong>NIT:</strong> {tenant?.nit}</p>
          <p style={{ margin: '0 0 4px 0', fontSize: '12px' }}><strong>NRC:</strong> {tenant?.nrc}</p>
          <p style={{ margin: '0 0 4px 0', fontSize: '12px' }}><strong>Giro:</strong> {tenant?.activity_desc}</p>
          {tenant?.ticket_header && <p style={{ whiteSpace: 'pre-wrap', fontSize: '10px', marginTop: '10px', color: '#555' }}>{tenant.ticket_header}</p>}
        </div>
        
        <div style={{ width: '40%', border: '1px solid #000', borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '18px', margin: '0 0 10px 0', color: '#cc0000' }}>COMPROBANTE</h2>
          <p style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 10px 0' }}>{sale.dte_code || 'N/A'}</p>
          <p style={{ fontSize: '12px', margin: '0' }}><strong>Fecha:</strong> {date}</p>
        </div>
      </div>

      {/* Client Info */}
      <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '15px', marginBottom: '20px', fontSize: '12px', display: 'flex', flexWrap: 'wrap' }}>
        <div style={{ width: '50%', marginBottom: '10px' }}>
          <strong>Cliente:</strong> {sale.clients?.name || 'Consumidor Final'}
        </div>
        <div style={{ width: '50%', marginBottom: '10px' }}>
          <strong>NIT/DUI:</strong> {sale.clients?.document_number || 'N/A'}
        </div>
        <div style={{ width: '50%', marginBottom: '10px' }}>
          <strong>Dirección:</strong> {sale.clients?.address || 'N/A'}
        </div>
        <div style={{ width: '50%', marginBottom: '10px' }}>
          <strong>Vendedor:</strong> {sale.sellers?.name || 'N/A'}
        </div>
      </div>

      {/* Items Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '12px' }}>
        <thead>
          <tr style={{ background: '#f5f5f5' }}>
            <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center', width: '10%' }}>CANT</th>
            <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left', width: '50%' }}>DESCRIPCIÓN</th>
            <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right', width: '20%' }}>PRECIO UNIT.</th>
            <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right', width: '20%' }}>SUBTOTAL</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>{item.quantity}</td>
              <td style={{ border: '1px solid #ccc', padding: '8px' }}>{item.products?.name || 'Producto'}</td>
              <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>${Number(item.unit_price).toFixed(2)}</td>
              <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>${Number(item.subtotal).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: '40%', border: '1px solid #ccc', borderRadius: '8px', padding: '15px', fontSize: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span>Sumas:</span>
            <span>${Number(sale.subtotal).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span>IVA:</span>
            <span>${Number(sale.tax_amount).toFixed(2)}</span>
          </div>
          <div style={{ borderBottom: '1px solid #000', margin: '8px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '16px' }}>
            <span>TOTAL:</span>
            <span>${Number(sale.total).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '40px', textAlign: 'center', fontSize: '12px', color: '#555' }}>
        {tenant?.receipt_message && <p style={{ whiteSpace: 'pre-wrap' }}>{tenant.receipt_message}</p>}
        <p>Generado por Estación Digital SV</p>
      </div>
    </div>
  );
};

export const printDocument = (sale, items, tenant, format = 'TICKET') => {
  let htmlContent = '';
  
  if (format === 'TICKET') {
    htmlContent = renderToString(<TicketTemplate sale={sale} items={items} tenant={tenant} />);
  } else {
    htmlContent = renderToString(<PDFLetterTemplate sale={sale} items={items} tenant={tenant} />);
  }

  // Crear un iframe oculto para imprimir
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.width = '0px';
  iframe.style.height = '0px';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <html>
      <head>
        <title>Imprimir Comprobante</title>
        <style>
          @page {
            margin: 0;
            size: ${format === 'TICKET' ? '80mm auto' : 'letter'};
          }
          body {
            margin: 0;
            padding: 0;
            background: #fff;
          }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>
  `);
  doc.close();

  // Esperar a que las imágenes carguen antes de imprimir
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 500); // Dar un poco de tiempo para renderizar
  };
};
