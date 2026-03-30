"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const QUICK_ACTIONS = [
  "Ringkasan bulan ini 📊",
  "Tips keuangan 💡",
  "Kategori terbanyak 🛍️",
  "Cara export CSV 📥",
];

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const bold = part.match(/^\*\*(.+)\*\*$/);
    if (bold) return <strong key={i} className="font-extrabold text-primary dark:text-sky-400">{bold[1]}</strong>;
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
      <Tag key={`list-${elements.length}`} className={`${cls} ml-5 my-2 space-y-1.5`}>
        {listItems.items.map((item, j) => (
          <li key={j} className="pl-1 uppercase text-[11px] font-black tracking-wider text-slate-600 dark:text-slate-300">{renderInline(item)}</li>
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
        elements.push(<span key={`br-${i}`} className="block h-3" />);
      } else {
        elements.push(<span key={`p-${i}`} className="block leading-relaxed">{renderInline(line)}</span>);
      }
    }
  }
  flushList();

  return <>{elements}</>;
}

export function ChatBot({ onTransactionAdded }: { onTransactionAdded?: () => void }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "assistant", content: "Yo! Aku **Cike AI**, asisten keuanganmu 👋\nMau cek keuangan, tambahin transaksi, atau butuh tips? Gas langsung aja ketik!" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mobileViewport, setMobileViewport] = useState<{ height: number; top: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDrag, setIsDrag] = useState(false);
  const startPos = useRef({ x: 0, y: 0, startX: 0, startY: 0 });

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth"
        });
      }
    });
  }, []);

  useEffect(() => {
    if (open) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 400); // Wait for animation
    } else {
      setMobileViewport(null);
    }
  }, [open, scrollToBottom]);

  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!open || !vv) return;
    const isMobile = () => window.innerWidth < 640;
    const update = () => {
      if (!isMobile()) {
        setMobileViewport(null);
        return;
      }
      const viewport = window.visualViewport;
      if (viewport) setMobileViewport({ height: viewport.height, top: viewport.offsetTop });
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  useEffect(() => {
    const handleToggle = () => setOpen(true);
    window.addEventListener("toggle-cike-ai", handleToggle);
    return () => window.removeEventListener("toggle-cike-ai", handleToggle);
  }, []);

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

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    startPos.current = { 
      x: e.clientX, 
      y: e.clientY, 
      startX: pos.x, 
      startY: pos.y 
    };
    setIsDrag(false);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.buttons === 0) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      setIsDrag(true);
      
      const newX = startPos.current.startX + dx;
      const newY = startPos.current.startY + dy;

      // Boundary constraints
      const W = window.innerWidth;
      const H = window.innerHeight;
      const R = 32; // Default right offset
      const B = 32; // Default bottom offset
      const S = 64; // Bubble size

      // Max move left: -(W - S - R)
      // Max move right: R
      // Max move up: -(H - S - B)
      // Max move down: B

      const boundedX = Math.max(-(W - S - R), Math.min(R, newX));
      const boundedY = Math.max(-(H - S - B), Math.min(B, newY));

      setPos({ x: boundedX, y: boundedY });
    }
  };

  const handlePointerUp = () => {
    // Release capture happens automatically
  };

  return (
    <>
      {/* Floating button - only show when closed */}
      {!open && (
        <button
          type="button"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClick={() => {
            if (!isDrag) setOpen(true);
          }}
          className={`
            fixed z-[100] flex items-center justify-center rounded-[2rem]
            bg-gradient-to-tr from-primary to-sky-400 text-white shadow-2xl shadow-primary/40 
            transition-all duration-300 hover:scale-110 active:scale-95
            touch-none
            ${!isDrag ? "transition-[transform,border-radius,background-color,top,right,bottom,left,width,height]" : ""}
            h-16 w-16
          `}
          style={{
            right: "min(32px, 5vw)",
            bottom: "min(32px, 5vh)",
            transform: `translate(${pos.x}px, ${pos.y}px)`,
            cursor: isDrag ? "grabbing" : "grab"
          }}
          aria-label="Buka Cike AI"
        >
          <div className="relative h-7 w-7">
            <svg 
              className="absolute inset-0 h-7 w-7"
              fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className={`
            fixed z-[90] flex flex-col overflow-hidden border border-slate-200/60 dark:border-slate-800/60
            bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]
            transition-all duration-500 animate-in fade-in slide-in-from-bottom-8 zoom-in-95
            left-0 right-0 bottom-0 top-14
            sm:bottom-28 sm:right-8 sm:left-auto sm:top-auto sm:h-[600px] sm:w-[420px] 
            rounded-t-[2.5rem] sm:rounded-[2.5rem]
          `}
          style={{
            ...(mobileViewport
              ? { top: mobileViewport.top, height: mobileViewport.height, bottom: "auto" }
              : {}),
            transform: typeof window !== "undefined" && window.innerWidth < 640 
              ? "none" 
              : `translate(${pos.x}px, ${pos.y}px)`,
          }}
        >
          {/* Header */}
          <div className="relative flex items-center gap-4 border-b border-slate-100 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 px-6 py-5">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-sky-400 to-primary" />
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white dark:bg-slate-800 ring-2 ring-slate-100 dark:ring-slate-800 shadow-md transform group-hover:rotate-6 transition-transform">
              <img src="/cike-ai.png" alt="" className="h-full w-full object-contain p-1" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight leading-tight">Cike AI</h3>
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-500/20" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mt-0.5">Asisten Pintar Kamu</p>
            </div>
            
            {/* Close button inside header */}
            <button
              onClick={() => setOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-rose-500 transition-all active:scale-90"
              aria-label="Tutup"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex items-end gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div
                  className={`relative max-w-[85%] px-5 py-4 text-[13px] leading-relaxed shadow-sm transition-all hover:shadow-md ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-primary to-primary/80 text-white rounded-[1.5rem] rounded-br-[0.25rem] font-medium"
                      : "bg-white dark:bg-slate-800/80 backdrop-blur-md border border-slate-100 dark:border-slate-700/50 text-slate-800 dark:text-slate-200 rounded-[1.5rem] rounded-bl-[0.25rem] font-medium"
                  }`}
                >
                  {msg.role === "assistant" ? renderMarkdown(msg.content) : msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-[1.5rem] rounded-bl-[0.25rem] bg-white dark:bg-slate-800/80 backdrop-blur-md border border-slate-100 dark:border-slate-700/50 px-6 py-4">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick actions (show only at start) */}
          {messages.length <= 1 && !loading && (
            <div className="flex overflow-x-auto no-scrollbar gap-3 px-6 pb-6 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300 snap-x snap-mandatory">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => sendMessage(action)}
                  className="shrink-0 snap-start rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/40 px-5 py-3 text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary active:scale-95 shadow-sm whitespace-nowrap"
                >
                  {action}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-slate-100 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 p-4 sm:p-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="relative flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={loading ? "Menunggumu..." : "Bisikin keuanganmu di sini..."}
                disabled={loading}
                maxLength={500}
                className="flex-1 rounded-[1.5rem] border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/50 pl-6 pr-14 py-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-primary focus:ring-8 focus:ring-primary/5 outline-none transition-all disabled:opacity-60 font-medium"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="absolute right-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-white transition-all transform hover:scale-105 active:scale-90 disabled:opacity-30 shadow-lg shadow-primary/20"
                aria-label="Kirim"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
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
