import React from 'react';

export default function PageHeader({ title, icon: Icon, children }) {
  return (
    <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        {Icon && <Icon size={32} color="var(--primary)" />}
        <h1 className="page-title" style={{ margin: 0 }}>{title}</h1>
      </div>
      {children && (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {children}
        </div>
      )}
    </div>
  );
}
