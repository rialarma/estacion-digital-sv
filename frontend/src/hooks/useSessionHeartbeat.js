import { useEffect } from 'react';
import { supabase } from '../supabase';

export const useSessionHeartbeat = (intervalMinutes = 2) => {
  useEffect(() => {
    const pingSession = async () => {
      const sessionId = localStorage.getItem('current_session_id');
      if (!sessionId) return;
      
      try {
        await supabase.rpc('update_session_ping', { p_session_id: sessionId });
      } catch (err) {
        console.error('Error in session heartbeat:', err);
      }
    };

    // Hacer el ping inmediatamente al montar el hook (o recargar la página)
    pingSession();

    // Establecer el intervalo
    const intervalMs = intervalMinutes * 60 * 1000;
    const intervalId = setInterval(pingSession, intervalMs);

    return () => clearInterval(intervalId);
  }, [intervalMinutes]);
};
