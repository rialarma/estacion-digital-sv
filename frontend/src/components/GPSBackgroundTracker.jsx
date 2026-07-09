import React, { useEffect } from 'react';
import { supabase } from '../supabase';

const GPSBackgroundTracker = () => {
  useEffect(() => {
    let watchId = null;
    let pollInterval = null;

    const stopTracking = () => {
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
    };

    const startTracking = async () => {
      if (watchId !== null) return; // Ya está corriendo

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profile && ['REPARTIDOR', 'PREVENTA', 'VENDEDOR'].includes(profile.role)) {
          if (!navigator.geolocation) return;
          
          let lastUpdateTime = 0;

          watchId = navigator.geolocation.watchPosition(
            async (position) => {
              const now = Date.now();
              // Throttling: Solo actualiza la BD cada 15 segundos máximo para no saturar
              if (now - lastUpdateTime < 15000) return;
              lastUpdateTime = now;

              const { latitude, longitude } = position.coords;
              try {
                await supabase.from('user_profiles').update({
                  current_lat: latitude,
                  current_lng: longitude,
                  last_location_update: new Date().toISOString()
                }).eq('id', session.user.id);
              } catch (e) {
                // silent fail
              }
            },
            (err) => console.error("GPS Background Error", err),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
          );
        }
      } catch (err) {
        console.error("Error initializing GPS tracker:", err);
      }
    };

    const checkAttendanceAndTrack = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return stopTracking();

        // Check if there is an active shift
        const { data: shiftData } = await supabase
          .from('employee_attendance')
          .select('id')
          .eq('user_id', session.user.id)
          .is('clock_out', null)
          .order('clock_in', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (shiftData) {
          startTracking();
        } else {
          stopTracking();
        }
      } catch (e) {
        stopTracking();
      }
    };

    // Check immediately, then every 30 seconds
    checkAttendanceAndTrack();
    pollInterval = setInterval(checkAttendanceAndTrack, 30000);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      stopTracking();
    };
  }, []);

  return null; // Componente invisible
};

export default GPSBackgroundTracker;
