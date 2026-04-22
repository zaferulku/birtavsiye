/**
 * ChatWidget - AI product advisor chatbot
 * Floating bubble → expandable panel. Connects to /api/chat.
 * Renders product cards with add-to-compare queue (max 4).
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ProductCard = {
  id: string;
  slug: string;
  title: string;
  brand: string | null;
  image_url: string | null;
  category_slug: string | null;
  min_price: number | null;
  listing_count: number;
  similarity?: number;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  products?: ProductCard[];
  timestamp: number;
};

const WELCOME_MESSAGE = "Merhaba! Ürün arıyorsan sana yardım edebilirim. Ne arıyorsun?";
const MAX_COMPARE = 4;

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: WELCOME_MESSAGE,
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [compareQueue, setCompareQueue] = useState<ProductCard[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isSending) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: data.response ?? data.message ?? "Bir sorun oluştu, tekrar dener misin?",
        products: Array.isArray(data.products) ? data.products : undefined,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          content: "Bağlantıda sorun oldu. Lütfen biraz sonra tekrar deneyin.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, messages]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  const toggleCompare = useCallback((product: ProductCard) => {
    setCompareQueue((prev) => {
      const exists = prev.find((p) => p.id === product.id);
      if (exists) return prev.filter((p) => p.id !== product.id);
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, product];
    });
  }, []);

  const goToComparison = useCallback(() => {
    if (compareQueue.length < 2) return;
    const ids = compareQueue.map((p) => p.id).join(",");
    window.location.href = `/karsilastir?ids=${ids}`;
  }, [compareQueue]);

  const clearCompare = useCallback(() => {
    setCompareQueue([]);
  }, []);

  return (
    <>
      {!isOpen && (
        <button
          className="chat-trigger"
          onClick={() => setIsOpen(true)}
          aria-label="Yardım chatbot'u aç"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 4h16v12H5.17L4 17.17V4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="currentColor" fillOpacity="0.1" />
            <circle cx="9" cy="10" r="1" fill="currentColor" />
            <circle cx="12" cy="10" r="1" fill="currentColor" />
            <circle cx="15" cy="10" r="1" fill="currentColor" />
          </svg>
          <span>Yardım</span>
        </button>
      )}

      {isOpen && (
        <div className="chat-panel" role="dialog" aria-label="Ürün danışman chatbot">
          <header className="chat-header">
            <div className="chat-header-text">
              <h3>Ürün Danışmanı</h3>
              <span className="chat-status">Sorduğun ürünleri buluyorum</span>
            </div>
            <button className="chat-close" onClick={() => setIsOpen(false)} aria-label="Kapat">×</button>
          </header>

          <div className="chat-messages">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                compareQueue={compareQueue}
                onToggleCompare={toggleCompare}
              />
            ))}
            {isSending && (
              <div className="chat-typing" aria-label="Yazıyor">
                <span className="dot" /> <span className="dot" /> <span className="dot" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {compareQueue.length > 0 && (
            <div className="chat-compare-bar">
              <span className="chat-compare-count">
                {compareQueue.length} ürün karşılaştırma listesinde
              </span>
              <div className="chat-compare-actions">
                {compareQueue.length >= 2 && (
                  <button onClick={goToComparison} className="chat-compare-go">
                    Karşılaştır →
                  </button>
                )}
                <button onClick={clearCompare} className="chat-compare-clear">Temizle</button>
              </div>
            </div>
          )}

          <form
            className="chat-input-form"
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
          >
            <textarea
              ref={inputRef}
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ne arıyorsun? (ör: 128GB siyah iPhone)"
              rows={1}
              disabled={isSending}
            />
            <button
              type="submit"
              className="chat-send"
              disabled={isSending || !input.trim()}
              aria-label="Gönder"
            >
              Gönder
            </button>
          </form>
        </div>
      )}

      <style>{CHAT_STYLES}</style>
    </>
  );
}

type MessageBubbleProps = {
  message: ChatMessage;
  compareQueue: ProductCard[];
  onToggleCompare: (p: ProductCard) => void;
};

function MessageBubble({ message, compareQueue, onToggleCompare }: MessageBubbleProps) {
  const isUser = message.role === "user";
  return (
    <div className={`chat-msg ${isUser ? "chat-msg--user" : "chat-msg--assistant"}`}>
      <div className="chat-msg-content">{message.content}</div>
      {message.products && message.products.length > 0 && (
        <div className="chat-products">
          {message.products.map((p) => {
            const inCompare = compareQueue.some((c) => c.id === p.id);
            return (
              <div key={p.id} className="chat-product-card">
                <a href={`/urun/${p.slug}`} className="chat-product-link">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt={p.title} className="chat-product-img" />
                  ) : (
                    <div className="chat-product-img-placeholder" />
                  )}
                  <div className="chat-product-info">
                    <strong className="chat-product-title">{p.title}</strong>
                    {p.brand && <span className="chat-product-brand">{p.brand}</span>}
                    {p.min_price !== null && (
                      <div className="chat-product-price">
                        {formatTL(p.min_price)} <span>({p.listing_count} mağaza)</span>
                      </div>
                    )}
                  </div>
                </a>
                <button
                  className={`chat-product-compare ${inCompare ? "chat-product-compare--active" : ""}`}
                  onClick={() => onToggleCompare(p)}
                  aria-pressed={inCompare}
                >
                  {inCompare ? "✓ Ekledin" : "+ Karşılaştır"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatTL(n: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(n);
}

const CHAT_STYLES = `
  .chat-trigger { position: fixed; bottom: 20px; right: 20px; z-index: 1000; display: flex; align-items: center; gap: 8px; padding: 12px 20px; background: var(--accent, #dc2626); color: #fff; border: none; border-radius: 999px; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15); cursor: pointer; font-size: 0.9375rem; font-weight: 500; transition: transform 0.15s, box-shadow 0.15s; }
  .chat-trigger:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18); }
  .chat-panel { position: fixed; bottom: 20px; right: 20px; width: 400px; max-width: calc(100vw - 40px); height: 600px; max-height: calc(100vh - 40px); background: #fff; border: 1px solid var(--border, #e5e7eb); border-radius: 16px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15); z-index: 1000; display: flex; flex-direction: column; overflow: hidden; }
  .chat-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border, #e5e7eb); background: var(--accent, #dc2626); color: #fff; }
  .chat-header-text h3 { margin: 0; font-size: 1rem; font-weight: 600; }
  .chat-status { font-size: 0.75rem; opacity: 0.85; }
  .chat-close { background: transparent; border: none; color: #fff; font-size: 1.5rem; line-height: 1; cursor: pointer; padding: 4px 8px; border-radius: 4px; }
  .chat-close:hover { background: rgba(255, 255, 255, 0.2); }
  .chat-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
  .chat-msg { max-width: 90%; display: flex; flex-direction: column; gap: 8px; }
  .chat-msg--user { align-self: flex-end; }
  .chat-msg--assistant { align-self: flex-start; }
  .chat-msg-content { padding: 10px 14px; border-radius: 12px; font-size: 0.9375rem; line-height: 1.5; white-space: pre-wrap; }
  .chat-msg--user .chat-msg-content { background: var(--accent, #dc2626); color: #fff; border-bottom-right-radius: 4px; }
  .chat-msg--assistant .chat-msg-content { background: var(--surface-subtle, #f3f4f6); color: var(--text, #111); border-bottom-left-radius: 4px; }
  .chat-products { display: flex; flex-direction: column; gap: 8px; }
  .chat-product-card { display: flex; flex-direction: column; gap: 0; border: 1px solid var(--border, #e5e7eb); border-radius: 10px; overflow: hidden; background: #fff; }
  .chat-product-link { display: flex; gap: 12px; padding: 10px; text-decoration: none; color: inherit; }
  .chat-product-link:hover { background: var(--surface-subtle, #f9fafb); }
  .chat-product-img, .chat-product-img-placeholder { width: 56px; height: 56px; object-fit: contain; border-radius: 6px; flex-shrink: 0; background: #fff; }
  .chat-product-img-placeholder { background: linear-gradient(135deg, #f3f4f6, #e5e7eb); }
  .chat-product-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .chat-product-title { font-size: 0.875rem; font-weight: 500; color: var(--text, #111); overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .chat-product-brand { font-size: 0.75rem; color: var(--text-muted, #6b7280); }
  .chat-product-price { font-size: 0.875rem; font-weight: 600; color: var(--accent, #dc2626); margin-top: 2px; }
  .chat-product-price span { font-weight: 400; color: var(--text-muted, #6b7280); font-size: 0.75rem; }
  .chat-product-compare { padding: 8px; background: var(--surface-subtle, #f9fafb); border: none; border-top: 1px solid var(--border, #e5e7eb); cursor: pointer; font-size: 0.8125rem; font-weight: 500; color: var(--text, #111); }
  .chat-product-compare:hover { background: var(--surface-hover, #f3f4f6); }
  .chat-product-compare--active { background: var(--success-soft, #ecfdf5); color: var(--success, #059669); }
  .chat-typing { display: flex; gap: 4px; padding: 12px 16px; background: var(--surface-subtle, #f3f4f6); border-radius: 12px; align-self: flex-start; width: fit-content; }
  .chat-typing .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--text-muted, #9ca3af); animation: chat-bounce 1.4s infinite; }
  .chat-typing .dot:nth-child(2) { animation-delay: 0.2s; }
  .chat-typing .dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes chat-bounce { 0%, 60%, 100% { transform: translateY(0); opacity: 0.5; } 30% { transform: translateY(-6px); opacity: 1; } }
  .chat-compare-bar { display: flex; flex-direction: column; gap: 8px; padding: 12px 16px; background: var(--accent-soft, #fef2f2); border-top: 1px solid var(--border, #e5e7eb); }
  .chat-compare-count { font-size: 0.8125rem; font-weight: 500; color: var(--accent, #dc2626); }
  .chat-compare-actions { display: flex; gap: 8px; }
  .chat-compare-go { flex: 1; padding: 8px 12px; background: var(--accent, #dc2626); color: #fff; border: none; border-radius: 6px; font-size: 0.8125rem; font-weight: 500; cursor: pointer; }
  .chat-compare-clear { padding: 8px 12px; background: transparent; color: var(--text-muted, #6b7280); border: 1px solid var(--border, #e5e7eb); border-radius: 6px; font-size: 0.8125rem; cursor: pointer; }
  .chat-input-form { display: flex; gap: 8px; padding: 12px; border-top: 1px solid var(--border, #e5e7eb); background: #fff; }
  .chat-input { flex: 1; padding: 10px 12px; border: 1px solid var(--border, #e5e7eb); border-radius: 8px; font-size: 0.9375rem; font-family: inherit; resize: none; min-height: 40px; max-height: 120px; }
  .chat-input:focus { outline: none; border-color: var(--accent, #dc2626); box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1); }
  .chat-send { padding: 10px 16px; background: var(--accent, #dc2626); color: #fff; border: none; border-radius: 8px; font-size: 0.875rem; font-weight: 500; cursor: pointer; align-self: flex-end; }
  .chat-send:disabled { opacity: 0.5; cursor: not-allowed; }
  @media (max-width: 480px) {
    .chat-panel { right: 10px; bottom: 10px; width: calc(100vw - 20px); height: calc(100vh - 80px); }
  }
`;
