import { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { MessageCircle, Bot, Send, Lock, ArrowLeft, X, CheckCheck, Check } from 'lucide-react';
import Avatar from './Avatar';
import Badge from './Badge';
import { api, getToken, getStoredAuth } from '../services/api';
import { shortId } from '../utils/chat';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Consecutive messages from the same sender within this window are grouped visually (tighter
// spacing, header shown once) instead of repeating the name/role line for every bubble.
const GROUP_WINDOW_MS = 3 * 60 * 1000;

const ROLE_TAG = { client: 'CLIENT', broker: 'BROKER', driver: 'DRIVER', admin: 'ADMIN' };

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// Live view of a booking's chat. Admin can send like any other participant — the server still
// enforces the actual rule (canSend / isLocked), this just mirrors it in the UI so the input
// never appears somewhere the POST would 403 anyway.
//
// Doubles as the floating launcher panel's own body: `fill` swaps the fixed embed height for
// one that stretches to fill its flex parent, and `onBack`/`onClose` (panel-only) put a back
// arrow and a close button into this same header instead of the panel needing a second one.
export default function ChatWindow({ bookingId, clientName, fill = false, onBack, onClose }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [canSend, setCanSend] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [stage, setStage] = useState(null);
  const [bookingNumber, setBookingNumber] = useState(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const socketRef = useRef(null);
  const threadIdRef = useRef(null);
  const bottomRef = useRef(null);
  const currentUserId = getStoredAuth()?.user?.id;

  useEffect(() => {
    if (!bookingId) return;
    let cancelled = false;
    const token = getToken();

    const init = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const threadRes = await api.get(`/api/chat/bookings/${bookingId}/thread`, token);
        if (!threadRes?.success) throw new Error(threadRes?.message);
        const thread = threadRes.data.thread;
        if (cancelled) return;
        threadIdRef.current = thread.id;
        setCanSend(!!threadRes.data.canSend);
        setIsLocked(!!thread.isLocked);
        setStage(thread.stage);
        setBookingNumber(thread.bookingNumber);

        const messagesRes = await api.get(`/api/chat/threads/${thread.id}/messages?limit=50`, token);
        if (!cancelled) setMessages(messagesRes.data?.messages || []);

        // Best-effort — admin opening the thread is as good a "read" signal as any other
        // participant's, and keeps the unread badge on the chat list honest.
        api.patch(`/api/chat/threads/${thread.id}/read`, {}, token).catch(() => {});

        const socket = io(BASE, { auth: { token }, transports: ['websocket', 'polling'] });
        socketRef.current = socket;
        socket.emit('join-thread', { threadId: thread.id });
        socket.on('new-message', (msg) => {
          if (msg.threadId !== thread.id) return;
          setMessages((current) => (current.some((m) => m.id === msg.id) ? current : [...current, msg]));
        });
        // The other side opening the thread flips read_at on everything admin sent them —
        // reflect that as ticks turning solid without waiting on a full message re-fetch.
        socket.on('read-receipt', ({ threadId, userId }) => {
          if (threadId !== thread.id || userId === currentUserId) return;
          setMessages((current) => current.map((m) => (
            m.senderId !== userId && !m.readAt ? { ...m, readAt: new Date().toISOString() } : m
          )));
        });
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [bookingId, currentUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (event) => {
    event.preventDefault();
    const text = input.trim();
    const threadId = threadIdRef.current;
    if (!text || !threadId || sending) return;
    setSending(true);
    try {
      const res = await api.post(`/api/chat/threads/${threadId}/messages`, { message: text }, getToken());
      if (res?.success && res.data?.message) {
        const sent = res.data.message;
        setMessages((current) => (current.some((m) => m.id === sent.id) ? current : [...current, sent]));
        setInput('');
      } else if (res?.message) {
        // e.g. the trip got marked delivered while this window was open
        setIsLocked(true);
        setCanSend(false);
      }
    } catch {
      // Transient network failure — leave the draft in the input so the admin can retry.
    } finally {
      setSending(false);
    }
  };

  // Attaches a `grouped` flag per message (same sender, close in time to the previous one) so
  // the render pass can collapse repeated name/role headers into tighter WhatsApp-style runs.
  const renderList = useMemo(() => messages.map((m, i) => {
    const prev = messages[i - 1];
    const grouped = !!prev && prev.senderId === m.senderId && prev.senderRole === m.senderRole
      && (new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime()) < GROUP_WINDOW_MS;
    return { ...m, grouped };
  }), [messages]);

  const displayName = clientName || 'Client';
  const bookingLabel = bookingNumber || shortId(bookingId);

  return (
    <div className={`flex flex-col ${fill ? 'h-full' : 'h-[520px]'} bg-white ${fill ? '' : 'rounded-2xl border border-neutral-100'} overflow-hidden`}>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-100 flex-shrink-0">
        {onBack && (
          <button onClick={onBack} className="w-8 h-8 -ml-1 rounded-lg flex items-center justify-center text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors flex-shrink-0">
            <ArrowLeft size={16} />
          </button>
        )}
        <Avatar name={displayName} size={36} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-poppins font-semibold text-secondary truncate">{displayName}</p>
          <p className="text-[11px] text-neutral-400 truncate">Booking {bookingLabel}</p>
        </div>
        {stage !== null && (
          <Badge status={isLocked ? 'Closed' : stage === 'bot' ? 'Bot' : 'Live'} />
        )}
        {onClose && (
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors flex-shrink-0">
            <X size={16} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 bg-neutral-50">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : loadError ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <MessageCircle className="w-8 h-8 text-neutral-200 mb-2" />
            <p className="text-sm text-neutral-400">Couldn't load this chat.</p>
          </div>
        ) : renderList.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <MessageCircle className="w-8 h-8 text-neutral-200 mb-2" />
            <p className="text-sm text-neutral-400">No messages yet.</p>
          </div>
        ) : (
          renderList.map((m) => {
            const isBot = m.senderRole === 'bot';
            const isClient = m.senderRole === 'client';
            const isOwn = m.senderRole === 'admin' && m.senderId === currentUserId;
            const onLeft = isClient || isBot;

            const bubbleCls = isBot
              ? 'bg-primary/10 text-primary-dark border border-primary/15 rounded-tl-sm'
              : isClient
              ? 'bg-white text-neutral-700 border border-neutral-100 rounded-tl-sm'
              : isOwn
              ? 'bg-primary text-white rounded-tr-sm'
              : 'bg-neutral-200 text-neutral-700 rounded-tr-sm';

            return (
              <div key={m.id} className={`flex ${onLeft ? 'justify-start' : 'justify-end'} ${m.grouped ? 'mt-1' : 'mt-3'}`}>
                <div className={`max-w-[78%] flex flex-col ${onLeft ? 'items-start' : 'items-end'}`}>
                  {!m.grouped && (
                    <div className={`flex items-center gap-1.5 mb-1 px-0.5 ${onLeft ? '' : 'flex-row-reverse'}`}>
                      {isBot && <Bot size={11} className="text-primary" />}
                      <span className="text-xs font-semibold text-neutral-700">{isBot ? 'Gadidosti Assistant' : m.senderName}</span>
                      {!isBot && !isOwn && <span className="text-[10px] text-neutral-400 uppercase">{ROLE_TAG[m.senderRole] || m.senderRole}</span>}
                    </div>
                  )}
                  <p className={`text-sm rounded-2xl px-3.5 py-2 shadow-sm ${bubbleCls}`}>
                    {m.message}
                  </p>
                  <div className={`flex items-center gap-1 mt-0.5 px-0.5 ${onLeft ? '' : 'flex-row-reverse'}`}>
                    <span className="text-[10px] text-neutral-300">{formatTime(m.createdAt)}</span>
                    {isOwn && (m.readAt
                      ? <CheckCheck size={12} className="text-primary" />
                      : <Check size={12} className="text-neutral-300" />)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex-shrink-0 px-3 pb-3">
        {isLocked ? (
          <div className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-xs text-neutral-400 bg-neutral-50 rounded-xl py-3 px-4">
            <Lock size={12} /> This trip is complete — the chat has closed.
          </div>
        ) : canSend ? (
          <form onSubmit={handleSend} className="mt-2.5 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Type a message..."
              disabled={sending}
              className="form-input !py-2 flex-1"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="btn-primary !px-3.5 !py-2.5 flex-shrink-0 disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
