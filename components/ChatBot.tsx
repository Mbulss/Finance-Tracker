"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const QUICK_ACTIONS = [
  "Ringkasan bulan ini",
  "Tips keuangan",
  "Kategori terbanyak",
  "Cara export CSV",
];

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const bold = part.match(/^\*\*(.+)\*\*$/);
    if (bold) return <strong key={i} className="font-semibold">{bold[1]}</strong>;
    return <span key={i}>{part}</span>;
  });
}

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: { type: "ul" | "ol"; items: string[] } | null = null;

  function flushList() {
    if (!listItems) return;
    const Tag = listItems.type === "ul" ? "ul" : "ol";
    const cls = listItems.type === "ul" ? "list-disc" : "list-decimal";
    elements.push(
      <Tag key={`list-${elements.length}`} className={`${cls} ml-4 my-1 space-y-0.5`}>
        {listItems.items.map((item, j) => (
          <li key={j}>{renderInline(item)}</li>
        ))}
      </Tag>
    );
    listItems = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const bulletMatch = line.match(/^[-•]\s+(.+)/);
    const numberMatch = line.match(/^\d+[.)]\s+(.+)/);

    if (bulletMatch) {
      if (listItems?.type !== "ul") { flushList(); listItems = { type: "ul", items: [] }; }
      listItems!.items.push(bulletMatch[1]);
    } else if (numberMatch) {
      if (listItems?.type !== "ol") { flushList(); listItems = { type: "ol", items: [] }; }
      listItems!.items.push(numberMatch[1]);
    } else {
      flushList();
      if (line.trim() === "") {
        elements.push(<span key={`br-${i}`} className="block h-2" />);
      } else {
        elements.push(<span key={`p-${i}`} className="block">{renderInline(line)}</span>);
      }
    }
  }
  flushList();

  return <>{elements}</>;
}

export function ChatBot({ onTransactionAdded }: { onTransactionAdded?: () => void }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "assistant", content: "Yo! Aku Cike, asisten keuanganmu 👋\nMau cek keuangan, tambahin transaksi, atau butuh tips? Gas langsung aja ketik!" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }, []);

  useEffect(() => {
    if (open) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  async function sendMessage(text: string) {
    const userMsg = text.trim();
    if (!userMsg || loading) return;

    const uid = Date.now().toString(36);
    setMessages((prev) => [...prev, { id: uid, role: "user", content: userMsg }]);
    setInput("");
    setLoading(true);

    const history = messages
      .filter((m) => m.id !== "welcome")
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, history }),
      });
      const data = await res.json().catch(() => ({}));
      const reply = data.reply || data.error || "Maaf, aku lagi error. Coba lagi ya.";
      setMessages((prev) => [...prev, { id: uid + "r", role: "assistant", content: reply }]);

      if (data.addedTransaction) {
        onTransactionAdded?.();
      }
    } catch {
      setMessages((prev) => [...prev, { id: uid + "e", role: "assistant", content: "Gagal menghubungi server. Coba lagi ya." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`
          fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full
          bg-primary text-white shadow-lg transition-all duration-200
          hover:scale-105 hover:shadow-xl active:scale-95
          sm:bottom-6 sm:right-6
          ${open ? "rotate-0 bg-slate-600 dark:bg-slate-500" : ""}
        `}
        aria-label={open ? "Tutup chatbot" : "Buka chatbot"}
      >
        {open ? (
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className={`
            fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-border
            bg-card dark:bg-slate-800 dark:border-slate-700 shadow-2xl
            transition-all duration-200 animate-chat-in
            /* Mobile: almost full screen */
            bottom-0 left-0 right-0 top-14
            /* Desktop: popup */
            sm:bottom-24 sm:right-6 sm:left-auto sm:top-auto sm:h-[520px] sm:w-[400px]
            sm:rounded-2xl
          `}
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border dark:border-slate-700 bg-primary/5 dark:bg-primary/10 px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-primary dark:text-sky-400">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Cike - Asisten Keuangan</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tanya apa aja soal keuanganmu</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300 sm:hidden"
              aria-label="Tutup"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                    msg.role === "user"
                      ? "bg-primary text-white rounded-br-md"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-md"
                  }`}
                >
                  {msg.role === "assistant" ? renderMarkdown(msg.content) : msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-slate-100 dark:bg-slate-700 px-4 py-3">
                  <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
          </div>

          {/* Quick actions (show only at start) */}
          {messages.length <= 1 && !loading && (
            <div className="flex flex-wrap gap-2 px-4 pb-2">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => sendMessage(action)}
                  className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary dark:text-sky-400 transition hover:bg-primary/10 dark:border-primary/40 dark:bg-primary/10 dark:hover:bg-primary/20"
                >
                  {action}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-border dark:border-slate-700 p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={loading ? "Menunggu jawaban..." : "Ketik pesan..."}
                disabled={loading}
                maxLength={500}
                className="flex-1 rounded-xl border border-border dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition hover:bg-primary/90 disabled:opacity-40"
                aria-label="Kirim"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
