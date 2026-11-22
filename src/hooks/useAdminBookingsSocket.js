import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { getToken } from '../services/api';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Live push whenever a booking enters/leaves the "needs a driver" set — a new pending booking
// created, a pending one cancelled, or any booking getting a driver assigned (direct pick,
// broker-assign, or admin-assign all funnel through driverRequest.controller.js's
// finalizeDriverRequest, the one place that emits this). Every admin/staff socket auto-joins the
// shared 'admins' room (see realtime/socket.js), same pattern as useTripStatusSocket.js. The
// payload is a bare nudge, not a full booking — callers just refetch their own filtered view
// rather than trying to patch one row into a list it may or may not still belong in.
export function useAdminBookingsSocket(onChange) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const token = getToken();
    if (!token) return undefined;

    const socket = io(BASE, { auth: { token }, transports: ['websocket', 'polling'] });
    socket.on('admin-bookings-changed', (payload) => onChangeRef.current?.(payload));

    return () => socket.disconnect();
  }, []);
}
