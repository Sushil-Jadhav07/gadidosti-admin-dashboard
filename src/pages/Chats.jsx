import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import ChatThreadList from '../components/ChatThreadList';
import { filterThreads } from '../utils/chat';
import { api, getToken } from '../services/api';

// A plain re-fetch on an interval, not a socket subscription — admin isn't a participant on
// any one thread's `user:{id}` room, so there's no single socket event to listen for here.
// See the equivalent effect in App.jsx for the app-wide "new activity" toast built the same way.
const REFRESH_INTERVAL_MS = 45000;

export default function Chats() {
  const navigate = useNavigate();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchThreads = useCallback(async (silent = false) => {
    if (!silent) { setLoading(true); setError(''); }
    try {
      const res = await api.get('/api/chat/threads', getToken());
      if (res.success) {
        setThreads(res.data?.threads || []);
      } else if (!silent) {
        setError(res.message || 'Failed to load chats');
      }
    } catch {
      if (!silent) setError('Network error — could not load chats');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchThreads();
    const interval = setInterval(() => fetchThreads(true), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchThreads]);

  const filtered = useMemo(() => filterThreads(threads, searchTerm), [threads, searchTerm]);

  const openThread = (thread) => {
    navigate(`/bookings/${thread.bookingId}`, { state: { openChat: true } });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-poppins font-bold text-secondary">Chats</h1>
        <p className="text-sm text-neutral-500 mt-1">Every trip's client/broker/driver conversation, platform-wide</p>
      </div>

      {error && (
        <div className="card p-4 text-sm text-danger flex items-center gap-2">
          <span>{error}</span>
          <button onClick={() => fetchThreads()} className="underline">Retry</button>
        </div>
      )}

      <div className="card p-4">
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by booking, client, broker, driver..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="form-input pl-9 !py-2"
          />
        </div>
      </div>

      <ChatThreadList threads={filtered} loading={loading} onSelect={openThread} />
    </div>
  );
}
