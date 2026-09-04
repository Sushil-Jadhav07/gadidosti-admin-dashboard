import { useState } from 'react';
import { MessageCircle, X, Search } from 'lucide-react';
import ChatThreadList from './ChatThreadList';
import ChatWindow from './ChatWindow';
import { filterThreads } from '../utils/chat';

// A persistent circular FAB mounted once in App.jsx so it floats above every admin page.
// The unread badge and the default list body both read `threads` from App.jsx's existing
// GET /api/chat/threads poll (the same one that drives the toast) instead of running a second
// interval just for this widget — `onRefresh` only forces that shared poll to run a tick early
// when the panel opens, it doesn't start a poller of its own.
export default function ChatLauncher({ threads, onRefresh }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');

  const unreadTotal = threads.reduce((sum, t) => sum + (t.unreadCount || 0), 0);

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) { setSelected(null); onRefresh?.(); }
      return next;
    });
  };

  const close = () => { setOpen(false); setSelected(null); };

  return (
    <>
      {open && (
        <div className="fixed z-40 bg-white rounded-2xl shadow-2xl border border-neutral-100 flex flex-col overflow-hidden animate-fade-in inset-x-4 top-16 bottom-24 sm:inset-auto sm:right-6 sm:bottom-24 sm:w-[380px] sm:h-[560px]">
          {selected ? (
            <ChatWindow
              bookingId={selected.bookingId}
              clientName={selected.clientName}
              fill
              onBack={() => setSelected(null)}
              onClose={close}
            />
          ) : (
            <>
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-neutral-100 bg-primary/5 flex-shrink-0">
                <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  <MessageCircle size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-poppins font-semibold text-secondary">Chats</h3>
                  <p className="text-[11px] text-neutral-400 truncate">
                    {unreadTotal > 0 ? `${unreadTotal} unread conversation${unreadTotal === 1 ? '' : 's'}` : "Every trip's conversation"}
                  </p>
                </div>
                <button onClick={close} className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:bg-white hover:text-neutral-600 transition-colors flex-shrink-0">
                  <X size={16} />
                </button>
              </div>

              <div className="px-3 pt-3 flex-shrink-0">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search chats..."
                    className="form-input pl-8 !py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                <ChatThreadList threads={filterThreads(threads, search)} loading={false} onSelect={setSelected} compact />
              </div>
            </>
          )}
        </div>
      )}

      <button
        onClick={toggle}
        aria-label={open ? 'Close chats' : 'Open chats'}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-primary text-white shadow-xl shadow-primary/30 flex items-center justify-center hover:bg-primary-dark hover:scale-105 active:scale-95 transition-all duration-200"
      >
        {!open && unreadTotal > 0 && (
          <span className="absolute inset-0 rounded-full bg-primary/50 animate-ping" />
        )}
        <span className="relative">{open ? <X size={22} /> : <MessageCircle size={22} />}</span>
        {!open && unreadTotal > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 flex items-center justify-center bg-danger text-white text-[10px] font-bold rounded-full border-2 border-white z-10">
            {unreadTotal > 9 ? '9+' : unreadTotal}
          </span>
        )}
      </button>
    </>
  );
}
