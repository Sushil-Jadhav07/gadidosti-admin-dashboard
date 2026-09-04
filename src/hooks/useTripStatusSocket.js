import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { getToken } from '../services/api';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Live push the instant a trip's status changes (picked up, in transit, delivered, etc.) — the
// backend emits 'trip-status-updated' to the client's, broker's, and driver's own socket rooms
// on every PATCH /api/trips/:id/status call, AND to every connected admin (a shared 'admins'
// room every admin socket auto-joins — see socket.js) — so this fires for every trip
// system-wide, not just ones this admin happens to be viewing; callers filter on bookingId.
// Same connect/auth/cleanup shape as gadidosti-client's and gadidosti-broker-driver's own
// useTripStatusSocket.js.
export function useTripStatusSocket(onUpdate) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const token = getToken();
    if (!token) return undefined;

    const socket = io(BASE, { auth: { token }, transports: ['websocket', 'polling'] });
    socket.on('trip-status-updated', (trip) => onUpdateRef.current?.(trip));

    return () => socket.disconnect();
  }, []);
}
