import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '../supabase';
import { useTenantStore } from '../store/useTenantStore';
import { Map, Navigation } from 'lucide-react';
import PageHeader from '../components/PageHeader';

// Fix for default marker icons in Leaflet with Webpack/Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Icon for Repartidor
const repartidorIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom Icon for Preventa
const preventaIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const MapaLogistica = () => {
  const { tenantInfo } = useTenantStore();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, role, current_lat, current_lng, last_location_update')
        .eq('tenant_id', tenantInfo.id)
        .in('role', ['REPARTIDOR', 'PREVENTA', 'VENDEDOR'])
        .not('current_lat', 'is', null)
        .not('current_lng', 'is', null);

      if (error) throw error;
      setLocations(data || []);
    } catch (err) {
      console.error("Error fetching locations", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantInfo?.id) {
      fetchLocations();
      // Poll every 30 seconds
      const intervalId = setInterval(fetchLocations, 30000);
      return () => clearInterval(intervalId);
    }
  }, [tenantInfo]);

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Desconocido';
    const diff = Math.floor((new Date() - new Date(timestamp)) / 60000); // in minutes
    if (diff === 0) return 'Hace un momento';
    if (diff === 1) return 'Hace 1 minuto';
    return `Hace ${diff} minutos`;
  };

  if (loading) {
    return <div className="page-container"><p style={{ textAlign: 'center', padding: '40px' }}>Cargando mapa...</p></div>;
  }

  // Calculate center. Default to El Salvador if no active locations
  const center = locations.length > 0 
    ? [locations[0].current_lat, locations[0].current_lng] 
    : [13.6929, -89.2182]; // San Salvador

  return (
    <div className="page-container fade-in" style={{ height: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column' }}>
      
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Map size={32} color="var(--primary)" />
          <div>
            <PageHeader title="Mapa de Logística" icon={Map} />
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>Rastreo en vivo de Preventas y Repartidores</p>
          </div>
        </div>
        <button onClick={fetchLocations} className="glass-button" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Navigation size={16} /> Actualizar ahora
        </button>
      </div>

      <div className="glass-panel" style={{ flex: 1, borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
        {locations.length === 0 && (
          <div style={{ 
            position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', 
            zIndex: 1000, background: 'rgba(0,0,0,0.7)', color: 'white', padding: '8px 16px', 
            borderRadius: '20px', fontSize: '14px' 
          }}>
            Nadie está transmitiendo su ubicación en este momento.
          </div>
        )}
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          {locations.map((loc) => {
            const isRepartidor = loc.role === 'REPARTIDOR';
            const icon = isRepartidor ? repartidorIcon : preventaIcon;
            
            // Check if signal is lost (older than 15 minutes)
            const isStale = (new Date() - new Date(loc.last_location_update)) > 15 * 60000;
            const opacity = isStale ? 0.5 : 1;

            return (
              <Marker 
                key={loc.id} 
                position={[loc.current_lat, loc.current_lng]} 
                icon={icon}
                opacity={opacity}
              >
                <Popup>
                  <div style={{ textAlign: 'center' }}>
                    <strong style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>
                      {loc.first_name} {loc.last_name}
                    </strong>
                    <span style={{ 
                      display: 'inline-block', fontSize: '10px', padding: '2px 6px', 
                      background: isRepartidor ? '#10b981' : '#3b82f6', color: 'white', 
                      borderRadius: '10px', marginBottom: '8px' 
                    }}>
                      {loc.role}
                    </span>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      Actualizado: {getTimeAgo(loc.last_location_update)}
                    </div>
                    {isStale && (
                      <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>
                        Posible pérdida de señal
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png" alt="Verde" style={{ height: '20px' }} />
          Repartidor
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png" alt="Azul" style={{ height: '20px' }} />
          Preventa / Vendedor
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'gray', opacity: 0.5 }}></div>
          Señal perdida (&gt;15 min)
        </div>
      </div>

    </div>
  );
};

export default MapaLogistica;
