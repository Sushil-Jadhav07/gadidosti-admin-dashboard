import { MessageCircle } from 'lucide-react';
import Avatar from './Avatar';
import Badge from './Badge';
import { threadRef, timeAgo } from '../utils/chat';

// The one thread-list card design, shared by the full /chats page and the floating launcher's
// panel body — `compact` trims padding/avatar/route text for the panel's narrower, shorter
// space. Data fetching stays with each caller (Chats.jsx polls on its own; the launcher reuses
// App.jsx's existing poll) so this component only ever renders what it's handed.
export default function ChatThreadList({
  threads, loading, error, onRetry, onSelect, compact = false,
  emptyTitle = 'No chats yet', emptySubtitle = "Trip conversations will show up here once bookings start.",
}) {
  if (loading) {
    return (
      <div className={compact ? 'flex justify-center py-10' : 'card p-10 flex justify-center'}>
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-danger flex items-center gap-2">
        <span>{error}</span>
        {onRetry && <button onClick={onRetry} className="underline flex-shrink-0">Retry</button>}
      </div>
    );
  }

  if (!threads.length) {
    return (
      <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-10 px-4' : 'card py-16'}`}>
        <div className={`bg-neutral-100 rounded-2xl flex items-center justify-center mb-3 ${compact ? 'w-11 h-11' : 'w-14 h-14'}`}>
          <MessageCircle size={compact ? 18 : 22} className="text-neutral-400" />
        </div>
        <p className="text-neutral-600 font-semibold text-sm">{emptyTitle}</p>
        <p className="text-neutral-400 text-xs mt-1">{emptySubtitle}</p>
      </div>
    );
  }

  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2.5'}>
      {threads.map((t) => (
        <button
          key={t.threadId}
          onClick={() => onSelect(t)}
          className={`w-full text-left transition-all duration-200 ${compact ? 'p-2.5 rounded-xl hover:bg-neutral-50' : 'card p-4 hover:shadow-lg hover:-translate-y-0.5'}`}
        >
          <div className="flex items-start gap-3">
            <Avatar name={t.clientName || t.bookingNumber || '?'} size={compact ? 32 : 38} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-semibold text-secondary truncate">{threadRef(t)}</span>
                  {!compact && <span className="text-xs text-neutral-400 truncate hidden sm:inline">{t.pickup} → {t.drop}</span>}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Badge status={t.isLocked ? 'Closed' : t.stage === 'bot' ? 'Bot' : 'Live'} />
                  {t.unreadCount > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-primary text-white text-[10px] font-bold rounded-full">
                      {t.unreadCount > 9 ? '9+' : t.unreadCount}
                    </span>
                  )}
                </div>
              </div>

              {!compact && <p className="text-xs text-neutral-500 mt-1 truncate sm:hidden">{t.pickup} → {t.drop}</p>}

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
  );
}
