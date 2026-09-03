import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { MessageCircle, Bot, Send, Lock } from 'lucide-react';
import { api, getToken, getStoredAuth } from '../services/api';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Live view of a booking's chat. Admin can now send like any other participant — the
// server still enforces the actual rule (canSend / isLocked), this just mirrors it in the UI
// so the input never appears somewhere the POST would 403 anyway.
export default function ChatWindow({ bookingId }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [canSend, setCanSend] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
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
  }, [bookingId]);

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

  return (
    <div className="flex flex-col h-[480px]">
      <div className="flex-1 overflow-y-auto space-y-2.5 p-1 bg-neutral-50 rounded-xl">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : loadError ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <MessageCircle className="w-8 h-8 text-neutral-200 mb-2" />
            <p className="text-sm text-neutral-400">Couldn't load this chat.</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <MessageCircle className="w-8 h-8 text-neutral-200 mb-2" />
            <p className="text-sm text-neutral-400">No messages yet.</p>
          </div>
        ) : (
          messages.map((m) => {
            const isBot = m.senderRole === 'bot';
            const isOwn = m.senderRole === 'admin' && m.senderId === currentUserId;
            return (
              <div key={m.id} className={`px-3 flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                  <div className={`flex items-center gap-1.5 mb-0.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
                    {isBot && <Bot size={11} className="text-violet-500" />}
                    <span className="text-xs font-semibold text-neutral-700">{isBot ? 'SSK Assistant' : m.senderName}</span>
                    {!isBot && <span className="text-[10px] text-neutral-400 uppercase">{m.senderRole}</span>}
                    <span className="text-[10px] text-neutral-300">{new Date(m.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p
                    className={`text-sm rounded-lg px-3 py-2 shadow-sm ${
                      isOwn
                        ? 'bg-primary text-white'
                        : isBot
                        ? 'bg-violet-50 text-violet-900 border border-violet-100'
                        : 'bg-white text-neutral-700'
                    }`}
                  >
                    {m.message}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

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
  );
}
