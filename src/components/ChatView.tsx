import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, Send, MoreVertical, ImageIcon, Trash2 } from "lucide-react";
import { useApi } from "../lib/api";
import type { Match, Message } from "../types";

interface Props {
  currentUserId: string;
}

export default function ChatView({ currentUserId }: Props) {
  const api = useApi();
  const [matches, setMatches] = useState<Match[]>([]);
  const [active, setActive] = useState<Match | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [menu, setMenu] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  // Load match list
  useEffect(() => {
    api.matches()
      .then(({ matches }) => setMatches(matches))
      .finally(() => setLoadingMatches(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load messages when active match changes
  const loadMessages = useCallback(async (matchId: string) => {
    setLoadingMsgs(true);
    try {
      const { messages } = await api.messages(matchId);
      setMessages(messages);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } finally {
      setLoadingMsgs(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!active) { clearInterval(pollRef.current); return; }
    loadMessages(active.match_id);
    pollRef.current = setInterval(() => loadMessages(active.match_id), 5000);
    return () => clearInterval(pollRef.current);
  }, [active, loadMessages]);

  async function send() {
    if (!active || (!text.trim() && !fileRef.current?.files?.[0])) return;
    setSending(true);
    try {
      let imageUrl: string | undefined;
      if (fileRef.current?.files?.[0]) {
        const file = fileRef.current.files[0];
        imageUrl = await new Promise<string>((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result as string);
          r.onerror = rej;
          r.readAsDataURL(file);
        });
        fileRef.current.value = "";
      }

      const msg = await api.sendMessage(active.match_id, {
        text: text.trim(),
        imageUrl,
      });

      setMessages((prev) => [...prev, msg]);
      setText("");
      setMatches((prev) =>
        prev.map((m) =>
          m.match_id === active.match_id ? { ...m, last_message: msg.text || "📷 Image" } : m
        )
      );
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } finally {
      setSending(false);
    }
  }

  async function unmatch(matchId: string) {
    await api.unmatch(matchId);
    setMatches((prev) => prev.filter((m) => m.match_id !== matchId));
    setActive(null);
    setMenu(false);
  }

  // ─── Match list ────────────────────────────────────────────────────────────
  if (!active) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-5 py-4 shrink-0 border-b border-zinc-100">
          <h2 className="font-semibold text-lg text-zinc-900">Connections</h2>
          {!loadingMatches && (
            <p className="text-xs text-zinc-400 mt-0.5">
              {matches.length === 0 ? "No connections yet" : `${matches.length} connection${matches.length !== 1 ? "s" : ""}`}
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingMatches ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : matches.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center text-2xl">💬</div>
              <h3 className="font-semibold text-zinc-900">No connections yet</h3>
              <p className="text-sm text-zinc-500 max-w-xs">
                When you and someone both like each other, you'll be able to chat here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {matches.map((match) => (
                <button
                  key={match.match_id}
                  onClick={() => setActive(match)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-zinc-50 transition-colors text-left"
                >
                  {match.photos?.[0] ? (
                    <img
                      src={match.photos[0]}
                      className="w-13 h-13 w-[52px] h-[52px] rounded-2xl object-cover shrink-0"
                      alt={match.name}
                    />
                  ) : (
                    <div className="w-[52px] h-[52px] rounded-2xl bg-zinc-100 flex items-center justify-center text-xl shrink-0">
                      👤
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-semibold text-zinc-900 text-sm truncate">{match.name}</p>
                      {match.last_message_at && (
                        <span className="text-xs text-zinc-400 shrink-0">
                          {timeAgo(match.last_message_at)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 truncate mt-0.5">
                      {match.last_message || "Say hello 👋"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Chat window ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100 shrink-0">
        <button onClick={() => { setActive(null); setMessages([]); }} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors">
          <ArrowLeft className="w-4 h-4 text-zinc-600" />
        </button>
        {active.photos?.[0] ? (
          <img src={active.photos[0]} className="w-9 h-9 rounded-xl object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center">👤</div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-zinc-900">{active.name}</p>
          <p className="text-xs text-zinc-400">Age {active.age} · {active.department}</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setMenu((m) => !m)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-zinc-500" />
          </button>
          {menu && (
            <div className="absolute right-0 top-9 bg-white border border-zinc-200 rounded-xl shadow-lg z-10 overflow-hidden min-w-[140px]">
              <button
                onClick={() => unmatch(active.match_id)}
                className="flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 w-full text-left"
              >
                <Trash2 className="w-4 h-4" /> Unmatch
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2" onClick={() => setMenu(false)}>
        {loadingMsgs ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-2">
            <p className="text-3xl">👋</p>
            <p className="text-sm text-zinc-500">Say hello to {active.name}!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const mine = msg.sender_id === currentUserId;
            return (
              <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] ${mine ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                  {msg.image_url && (
                    <img
                      src={msg.image_url}
                      className={`max-w-full rounded-2xl ${mine ? "rounded-br-sm" : "rounded-bl-sm"}`}
                      style={{ maxHeight: 240 }}
                    />
                  )}
                  {msg.text && (
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      mine
                        ? "bg-purple-600 text-white rounded-br-sm"
                        : "bg-zinc-100 text-zinc-900 rounded-bl-sm"
                    }`}>
                      {msg.text}
                    </div>
                  )}
                  <span className="text-[10px] text-zinc-400 px-1">
                    {new Date(msg.created_at).toLocaleTimeString("en-IN", {
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-zinc-100 px-4 py-3 flex items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={() => send()}
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 transition-colors shrink-0"
        >
          <ImageIcon className="w-4 h-4 text-zinc-500" />
        </button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
          }}
          placeholder={`Message ${active.name}…`}
          rows={1}
          maxLength={500}
          className="flex-1 px-4 py-2.5 bg-zinc-100 rounded-2xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white transition-colors max-h-24"
          style={{ overflow: "auto" }}
        />
        <button
          onClick={send}
          disabled={sending || !text.trim()}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-purple-600 text-white hover:bg-purple-700 disabled:bg-zinc-200 transition-colors shrink-0"
        >
          {sending ? (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}
