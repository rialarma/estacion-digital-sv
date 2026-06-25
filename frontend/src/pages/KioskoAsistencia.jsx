import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { useTenantStore } from '../store/useTenantStore';
import { Clock, CheckCircle, XCircle, User, MapPin, Camera } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

const KioskoAsistencia = () => {
  const { tenantId: paramTenantId } = useParams();
  const navigate = useNavigate();
  
  const [tenantInfo, setTenantInfo] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success'|'error', text: '' }
  const [location, setLocation] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);

  // Pedir GPS al cargar y obtener Tenant
  useEffect(() => {
    if (paramTenantId) {
      loadTenantInfo();
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.log('Error de GPS:', err)
      );
    }
  }, [paramTenantId]);

  const loadTenantInfo = async () => {
    const { data, error } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', paramTenantId)
      .single();
    if (data) {
      setTenantInfo(data);
      setTenantId(data.id);
    }
  };

  // Iniciar cámara web
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.log('Error al acceder a la cámara:', err);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
  };

  const capturePhoto = () => {
    if (!cameraActive || !videoRef.current || !canvasRef.current) return null;
    const context = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
    // Para no saturar la base de datos, lo comprimimos mucho (JPEG 0.5)
    return canvasRef.current.toDataURL('image/jpeg', 0.5);
  };

  const handleKeyPress = (num) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
      setMessage(null);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setMessage(null);
  };

  const handleSubmit = async () => {
    if (pin.length !== 4) {
      setMessage({ type: 'error', text: 'El PIN debe ser de 4 dígitos' });
      return;
    }

    setLoading(true);
    try {
      // 1. Buscar al empleado por PIN dentro de la sucursal/empresa actual
      const { data: userProfile, error: userError } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, shift_start, shift_end')
        .eq('tenant_id', tenantId)
        .eq('pin', pin)
        .single();

      if (userError || !userProfile) {
        setMessage({ type: 'error', text: 'PIN Incorrecto o Empleado no encontrado' });
        setPin('');
        setLoading(false);
        return;
      }

      // 2. Tomar foto si la cámara está activa
      const currentPhoto = capturePhoto();

      // 3. Revisar si tiene un turno abierto (sin clock_out)
      const { data: openShift } = await supabase
        .from('employee_attendance')
        .select('id')
        .eq('user_id', userProfile.id)
        .is('clock_out', null)
        .order('clock_in', { ascending: false })
        .limit(1)
        .single();

      const now = new Date();
      let isLate = false;
      
      if (openShift) {
        // MARCAR SALIDA
        const { error: updateError } = await supabase
          .from('employee_attendance')
          .update({ 
            clock_out: now.toISOString(),
            photo_url: currentPhoto // Reemplaza o ignora dependiendo del diseño
          })
          .eq('id', openShift.id);

        if (updateError) throw updateError;
        
        setMessage({ type: 'success', text: `¡Salida registrada! Hasta pronto, ${userProfile.first_name}.` });
      } else {
        // MARCAR ENTRADA
        // Calcular si es llegada tardía
        if (userProfile.shift_start) {
          const shiftTime = new Date();
          const [hours, mins] = userProfile.shift_start.split(':');
          shiftTime.setHours(parseInt(hours), parseInt(mins), 0);
          
          // Damos 5 minutos de gracia
          if (now.getTime() > shiftTime.getTime() + (5 * 60000)) {
            isLate = true;
          }
        }

        const { error: insertError } = await supabase
          .from('employee_attendance')
          .insert([{
            tenant_id: tenantId,
            user_id: userProfile.id,
            location_lat: location?.lat || null,
            location_lng: location?.lng || null,
            photo_url: currentPhoto,
            is_late: isLate
          }]);

        if (insertError) throw insertError;

        setMessage({ 
          type: 'success', 
          text: `¡Entrada registrada! Bienvenido, ${userProfile.first_name}. ${isLate ? '(Llegada Tardía)' : ''}` 
        });
      }

    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Ocurrió un error al procesar tu marcación' });
    }
    
    setPin('');
    setLoading(false);
    
    // Limpiar mensaje después de 4 segundos
    setTimeout(() => setMessage(null), 4000);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#0f172a', color: 'white' }}>
      {/* Lado Izquierdo: Branding y Cámara */}
      <div style={{ flex: 1, padding: '40px', borderRight: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Clock size={32} color="var(--primary)" /> Reloj Control
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '40px' }}>{tenantInfo?.name}</p>

        {/* CÁMARA */}
        <div style={{ width: '300px', height: '225px', background: '#1e293b', borderRadius: '12px', overflow: 'hidden', position: 'relative', border: '2px solid rgba(255,255,255,0.1)' }}>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          {!cameraActive && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <Camera size={32} style={{ marginBottom: '8px' }} />
              <p style={{ fontSize: '12px' }}>Cámara desactivada</p>
            </div>
          )}
        </div>

        {/* GPS Indicator */}
        <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '8px', color: location ? '#10b981' : 'var(--text-muted)' }}>
          <MapPin size={18} />
          <span style={{ fontSize: '14px' }}>{location ? 'GPS Activo' : 'GPS Desactivado'}</span>
        </div>
      </div>

      {/* Lado Derecho: Teclado Numérico */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        
        {!tenantId ? (
          <h2 style={{ color: '#ef4444' }}>Empresa no encontrada</h2>
        ) : (
          <>
            <h2 style={{ fontSize: '20px', marginBottom: '24px', color: 'var(--text-muted)' }}>Ingresa tu PIN de 4 dígitos</h2>
        
        {/* Display de PIN Oculto */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '40px' }}>
          {[...Array(4)].map((_, i) => (
            <div 
              key={i} 
              style={{ 
                width: '24px', height: '24px', borderRadius: '50%', 
                background: i < pin.length ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                transition: 'background 0.2s'
              }}
            />
          ))}
        </div>

        {/* Mensaje de Éxito o Error */}
        {message && (
          <div style={{ 
            padding: '16px 24px', borderRadius: '8px', marginBottom: '24px', width: '100%', maxWidth: '320px', textAlign: 'center',
            background: message.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            color: message.type === 'success' ? '#10b981' : '#ef4444',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
          }}>
            {message.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
            <span style={{ fontWeight: '500' }}>{message.text}</span>
          </div>
        )}

        {/* Teclado */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', width: '100%', maxWidth: '320px' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button 
              key={num}
              onClick={() => handleKeyPress(num.toString())}
              className="glass-button"
              style={{ height: '70px', fontSize: '24px', fontWeight: 'bold' }}
              disabled={loading}
            >
              {num}
            </button>
          ))}
          <button 
            className="glass-button"
            style={{ height: '70px', fontSize: '18px', color: 'var(--text-muted)' }}
            onClick={() => navigate('/')}
            disabled={loading}
          >
            Salir
          </button>
          <button 
            onClick={() => handleKeyPress('0')}
            className="glass-button"
            style={{ height: '70px', fontSize: '24px', fontWeight: 'bold' }}
            disabled={loading}
          >
            0
          </button>
          <button 
            onClick={handleDelete}
            className="glass-button"
            style={{ height: '70px', fontSize: '18px', color: '#ef4444' }}
            disabled={loading}
          >
            Borrar
          </button>
        </div>

        <button 
          onClick={handleSubmit}
          style={{ 
            marginTop: '32px', width: '100%', maxWidth: '320px', height: '60px', 
            background: 'var(--primary)', color: 'white', borderRadius: '8px', 
            fontSize: '18px', fontWeight: 'bold', border: 'none', cursor: 'pointer',
            opacity: pin.length === 4 && !loading ? 1 : 0.5
          }}
          disabled={pin.length !== 4 || loading}
        >
          {loading ? 'Procesando...' : 'MARCAR ASISTENCIA'}
        </button>
        </>
        )}

      </div>
    </div>
  );
};

export default KioskoAsistencia;
