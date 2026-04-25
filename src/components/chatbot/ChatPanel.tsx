"use client";

/**
 * ChatPanel v3 — Sağ alt köşede 320×600px pop-up pencere
 *
 * v2'den fark:
 *   - Tam yükseklik (h-full) → 600px sabit yükseklik
 *   - Sağ kenardan değil, sağ alt köşeden açılır
 *   - ChatBar'ın üstünde durur (alt margin var)
 *   - Köşeli kart görünümü (rounded-2xl, shadow-2xl)
 *   - Mobilde tam ekran
 *
 * v2 özellikleri korunur:
 *   - 320px genişlik
 *   - Header'da: yeni sohbet (+), küçült (—), kapat (×) butonları
 *   - Panel içi input bar
 *   - Küçültme = mesajlar korunur
 *   - Kapatma (×) = mesajlar silinir
 *   - 15dk inactivity timeout
 *   - Suggestion chip butonları (bot daraltıcı sohbet)
 */

import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import {
  useChatStore,
  type ChatMessage,
  type Suggestion,
  startInactivityWatcher,
  stopInactivityWatcher,
} from "../../lib/chatbot/useChatStore";

// ============================================================================
// Icons
// ============================================================================

function MinimizeIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function CloseIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

function ChevronUpIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

function ChatIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function PlusIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function SendIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
    </svg>
  );
}

// ============================================================================
// Mesaj balonları
// ============================================================================

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const display = message.displayLabel || message.content;
  const hasImage = message.attachmentType === "image" && message.attachmentPreview;
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-2.5`}>
      <div className="max-w-[85%] flex flex-col gap-2 items-end">
        {hasImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={message.attachmentPreview as string}
            alt="Yüklenen görsel"
            className="rounded-xl max-w-full max-h-48 object-cover border border-gray-200"
          />
        )}
        <div
          className={`
            px-3.5 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
            ${isUser
              ? "bg-black text-white rounded-br-md"
              : "bg-gray-100 text-gray-900 rounded-bl-md"}
          `}
        >
          {display}
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-2.5">
      <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

function ChipRow({
  suggestions,
  onClick,
  disabled,
}: {
  suggestions: Suggestion[];
  onClick: (s: Suggestion) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5 mb-2 px-1" role="group" aria-label="Hızlı seçenekler">
      {suggestions.map((s, i) => (
        <button
          key={`${s.value}-${i}`}
          type="button"
          onClick={() => !disabled && onClick(s)}
          disabled={disabled}
          className="
            inline-flex items-center gap-1
            px-3 py-1.5 rounded-full
            bg-gray-100 hover:bg-gray-200
            text-xs text-gray-800
            border border-gray-200 hover:border-gray-300
            transition-colors disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {s.icon && <span aria-hidden="true">{s.icon}</span>}
          <span>{s.label}</span>
        </button>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4 text-gray-500">
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
        <ChatIcon className="w-7 h-7 text-gray-400" />
      </div>
      <h3 className="text-sm font-medium text-gray-700 mb-1">
        Birtavsiye AI
      </h3>
      <p className="text-xs leading-relaxed max-w-[240px]">
        Aradığın ürünü tarif et, sana en uygun seçenekleri bulalım.
      </p>
    </div>
  );
}

// ============================================================================
// Minimized bar (sağ alt küçük buton)
// ============================================================================

function MinimizedBar() {
  const openPanel = useChatStore((s) => s.openPanel);
  const messages = useChatStore((s) => s.messages);
  const status = useChatStore((s) => s.status);
  const lastMessage = messages[messages.length - 1];
  const hasUnread = lastMessage?.role === "assistant" && status === "idle";

  return (
    <button
      type="button"
      onClick={openPanel}
      className="
        fixed bottom-24 right-4 z-40
        bg-white border border-gray-200 rounded-full shadow-lg
        px-4 py-2.5 flex items-center gap-2
        hover:shadow-xl hover:border-gray-300 transition-all
        text-sm font-medium text-gray-700 max-w-[200px]
      "
      aria-label="Sohbeti aç"
    >
      <ChatIcon className="w-4 h-4 text-gray-600 flex-shrink-0" />
      <span className="truncate">Birtavsiye AI</span>
      {hasUnread && (
        <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" aria-label="Yeni mesaj" />
      )}
      <ChevronUpIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
    </button>
  );
}

// ============================================================================
// Panel içi input bar
// ============================================================================

function PanelInputBar() {
  const router = useRouter();
  const [text, setText] = useState("");
  const status = useChatStore((s) => s.status);
  const conversationEnded = useChatStore((s) => s.conversationEnded);
  const addUserMessage = useChatStore((s) => s.addUserMessage);
  const addAssistantMessage = useChatStore((s) => s.addAssistantMessage);
  const setRecommendations = useChatStore((s) => s.setRecommendations);
  const setStatus = useChatStore((s) => s.setStatus);
  const getHistoryForBackend = useChatStore((s) => s.getHistoryForBackend);

  const isLoading = status === "sending" || status === "streaming";

  const handleSend = async () => {
    const message = text.trim();
    if (!message || isLoading) return;

    addUserMessage(message);
    setText("");

    const history = getHistoryForBackend();
    const chatSessionId = useChatStore.getState().chatSessionId;

    router.push(`/sonuclar?q=${encodeURIComponent(message)}`);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history, chatSessionId }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      addAssistantMessage(data.reply || "Yanıt alınamadı.", data.suggestions ?? null);

      if (Array.isArray(data.products)) {
        setRecommendations(data.products, message);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Bilinmeyen hata";
      setStatus("error", errorMsg);
      addAssistantMessage("Üzgünüm, bir sorun oluştu. Tekrar dener misin?");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-shrink-0 border-t border-gray-200 bg-white px-3 py-2.5">
      <div className="flex items-center gap-2 bg-gray-50 rounded-full px-3 py-1.5 border border-gray-200 focus-within:border-gray-400 focus-within:bg-white transition-colors">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder={conversationEnded ? "Yeni bir şey aramak ister misin?" : "Bir şey yaz..."}
          className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400 disabled:opacity-50"
          aria-label="Mesaj yaz"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim() || isLoading}
          className="
            flex-shrink-0 w-8 h-8
            flex items-center justify-center
            rounded-full bg-black text-white
            hover:bg-gray-800 transition-colors
            disabled:opacity-30 disabled:cursor-not-allowed
          "
          aria-label="Gönder"
        >
          {isLoading ? (
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          ) : (
            <SendIcon className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// ChatPanel (asıl panel)
// ============================================================================

export function ChatPanel() {
  const router = useRouter();
  const panelState = useChatStore((s) => s.panelState);
  const messages = useChatStore((s) => s.messages);
  const status = useChatStore((s) => s.status);
  const conversationEnded = useChatStore((s) => s.conversationEnded);
  const minimizePanel = useChatStore((s) => s.minimizePanel);
  const closePanel = useChatStore((s) => s.closePanel);
  const startNewConversation = useChatStore((s) => s.startNewConversation);
  const addUserMessage = useChatStore((s) => s.addUserMessage);
  const addAssistantMessage = useChatStore((s) => s.addAssistantMessage);
  const setRecommendations = useChatStore((s) => s.setRecommendations);
  const setStatus = useChatStore((s) => s.setStatus);
  const getHistoryForBackend = useChatStore((s) => s.getHistoryForBackend);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ----- Auto scroll -----
  useEffect(() => {
    if (panelState === "open") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, status, panelState]);

  // ----- Inactivity watcher -----
  useEffect(() => {
    startInactivityWatcher();
    return () => stopInactivityWatcher();
  }, []);

  // ----- Yeni sohbet butonu -----
  const handleNewConversation = () => {
    if (messages.length === 0) return;
    startNewConversation();
  };

  // ----- Chip click handler -----
  const handleChipClick = async (s: Suggestion) => {
    if (status === "sending" || status === "streaming") return;

    addUserMessage(s.value, null, null, s.label);

    const history = getHistoryForBackend();
    const chatSessionId = useChatStore.getState().chatSessionId;

    router.push(`/sonuclar?q=${encodeURIComponent(s.value)}`);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: s.value, history, chatSessionId }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      addAssistantMessage(data.reply || "Yanıt alınamadı.", data.suggestions ?? null);

      if (Array.isArray(data.products)) {
        setRecommendations(data.products, s.value);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Bilinmeyen hata";
      setStatus("error", errorMsg);
      addAssistantMessage("Üzgünüm, bir sorun oluştu. Tekrar dener misin?");
    }
  };

  // ----- Render -----

  if (panelState === "closed") return null;
  if (panelState === "minimized") return <MinimizedBar />;

  return (
    <>
      {/* Mobil arka plan overlay */}
      <div
        className="md:hidden fixed inset-0 bg-black/30 z-40"
        onClick={minimizePanel}
        aria-hidden="true"
      />

      {/* Panel — DESKTOP: sağ alt köşe pop-up, MOBILE: tam ekran */}
      <aside
        className="
          fixed z-40 bg-white shadow-2xl border border-gray-200
          flex flex-col overflow-hidden
          inset-0 rounded-none
          md:inset-auto md:bottom-24 md:right-4
          md:w-[320px] md:h-[600px] md:rounded-2xl
          animate-slide-in-right
        "
        role="complementary"
        aria-label="Birtavsiye AI sohbet penceresi"
      >
        {/* Header */}
        <header className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200 flex-shrink-0 bg-white">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center flex-shrink-0">
              <ChatIcon className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-gray-900 truncate">
                Birtavsiye AI
              </h2>
              <p className="text-xs text-gray-500 truncate">
                {conversationEnded
                  ? "Sohbet sonlandı"
                  : status === "sending" || status === "streaming"
                  ? "Yazıyor..."
                  : "Çevrimiçi"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-0.5 flex-shrink-0">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleNewConversation}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors"
                aria-label="Yeni sohbet"
                title="Yeni sohbet"
              >
                <PlusIcon className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={minimizePanel}
              className="w-8 h-8 flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors"
              aria-label="Küçült"
              title="Küçült"
            >
              <MinimizeIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={closePanel}
              className="w-8 h-8 flex items-center justify-center rounded-full text-gray-600 hover:bg-red-50 hover:text-red-600 active:bg-red-100 transition-colors"
              aria-label="Kapat (sohbeti sil)"
              title="Kapat — sohbet silinir"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Mesaj listesi */}
        <div
          className="flex-1 overflow-y-auto px-3 py-3 bg-white"
          role="log"
          aria-live="polite"
          aria-label="Sohbet mesajları"
        >
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {messages.map((msg, idx) => {
                const isLastAssistant =
                  idx === messages.length - 1 &&
                  msg.role === "assistant" &&
                  Array.isArray(msg.suggestions) &&
                  msg.suggestions.length > 0;
                return (
                  <div key={msg.id}>
                    <MessageBubble message={msg} />
                    {isLastAssistant && msg.suggestions && (
                      <ChipRow
                        suggestions={msg.suggestions}
                        onClick={handleChipClick}
                        disabled={status === "sending" || status === "streaming"}
                      />
                    )}
                  </div>
                );
              })}
              {(status === "sending" || status === "streaming") && <TypingIndicator />}
              <div ref={messagesEndRef} aria-hidden="true" />
            </>
          )}
        </div>

        {/* Input bar */}
        <PanelInputBar />
      </aside>
    </>
  );
}
