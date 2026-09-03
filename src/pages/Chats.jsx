import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Search, Bot, Lock } from 'lucide-react';
import Avatar from '../components/Avatar';
import { api, getToken } from '../services/api';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

function shortId(id) {
  return id ? `#${id.slice(0, 8)}` : '—';
}

function threadRef(thread) {
  return thread?.bookingNumber || shortId(thread?.bookingId);
}

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

  const filtered = useMemo(() => threads.filter((t) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return [t.bookingNumber, t.clientName, t.brokerName, t.driverName, t.pickup, t.drop]
      .some((v) => String(v || '').toLowerCase().includes(s));
  }), [threads, searchTerm]);

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

      {loading ? (
        <div className="card p-10 flex justify-center">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 bg-neutral-100 rounded-2xl flex items-center justify-center mb-3">
            <MessageCircle size={22} className="text-neutral-400" />
          </div>
          <p className="text-neutral-600 font-semibold">No chats yet</p>
          <p className="text-neutral-400 text-sm mt-1">Trip conversations will show up here once bookings start.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((t) => (
            <button
              key={t.threadId}
              onClick={() => openThread(t)}
              className="w-full text-left card p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="flex items-start gap-3">
                <Avatar name={t.clientName || t.bookingNumber || '?'} size={38} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-semibold text-secondary truncate">{threadRef(t)}</span>
                      <span className="text-xs text-neutral-400 truncate hidden sm:inline">{t.pickup} → {t.drop}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {t.isLocked ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 text-neutral-500">
                          <Lock size={9} /> Closed
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${t.stage === 'bot' ? 'bg-violet-50 text-violet-600' : 'bg-green-50 text-green-600'}`}>
                          {t.stage === 'bot' && <Bot size={9} />} {t.stage === 'bot' ? 'Bot' : 'Live'}
                        </span>
                      )}
                      {t.unreadCount > 0 && (
                        <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-primary text-white text-[10px] font-bold rounded-full">
                          {t.unreadCount > 9 ? '9+' : t.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-neutral-500 mt-1 truncate sm:hidden">{t.pickup} → {t.drop}</p>

                  <p className="text-xs text-neutral-500 mt-1 truncate">
                    {[t.clientName && `Client: ${t.clientName}`, t.brokerName && `Broker: ${t.brokerName}`, t.driverName && `Driver: ${t.driverName}`]
                      .filter(Boolean)
                      .join(' · ') || 'No participants assigned yet'}
                  </p>

                  <div className="flex items-center justify-between gap-2 mt-1.5">
                    <p className="text-sm text-neutral-600 truncate">{t.lastMessage || 'No messages yet.'}</p>
                    <span className="text-[11px] text-neutral-300 flex-shrink-0">{timeAgo(t.lastMessageAt)}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
