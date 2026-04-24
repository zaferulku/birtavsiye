"use client";

/**
 * ChatBar v2 â Sayfa altÄ±nda sabit pill-shape arama Ã§ubuÄu
 *
 * v1'den fark: history backend'e gÃ¶nderiliyor (proaktif sohbet iÃ§in)
 */

import { useState, useRef, useCallback, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useChatStore } from "../../lib/chatbot/useChatStore";

// ============================================================================
// Icons
// ============================================================================

function PlusIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function MicIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function SendIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="9" width="2.5" height="6" rx="1.25" />
      <rect x="10.75" y="6" width="2.5" height="12" rx="1.25" />
      <rect x="15.5" y="9" width="2.5" height="6" rx="1.25" />
    </svg>
  );
}

// ============================================================================
// ChatBar
// ============================================================================

export function ChatBar() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");

  const status = useChatStore((s) => s.status);
  const addUserMessage = useChatStore((s) => s.addUserMessage);
  const addAssistantMessage = useChatStore((s) => s.addAssistantMessage);
  const setRecommendations = useChatStore((s) => s.setRecommendations);
  const setStatus = useChatStore((s) => s.setStatus);
  const openPanel = useChatStore((s) => s.openPanel);
  const getHistoryForBackend = useChatStore((s) => s.getHistoryForBackend);

  const isLoading = status === "sending" || status === "streaming";

  const handleSend = useCallback(async () => {
    const message = text.trim();
    if (!message || isLoading) return;

    addUserMessage(message);
    openPanel();
    setText("");

    // History snapshot ALDIKTAN SONRA navigate
    // (yeni mesaj eklendi, getHistoryForBackend onu hariÃ§ tutar)
    const history = getHistoryForBackend();

    router.push(`/sonuclar?q=${encodeURIComponent(message)}`);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      addAssistantMessage(data.reply || "Yanıt alınamadı.");

      if (Array.isArray(data.products)) {
        setRecommendations(data.products, message);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Bilinmeyen hata";
      setStatus("error", errorMsg);
      addAssistantMessage("Üzgünüm, bir sorun oluştu. Lütfen tekrar dener misin?");
    }
  }, [
    text, isLoading, addUserMessage, openPanel, router,
    addAssistantMessage, setRecommendations, setStatus, getHistoryForBackend,
  ]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePlusClick = () => {
    console.log("[ChatBar] + clicked — image upload menu (TODO Parça 6)");
  };

  const handleMicClick = () => {
    console.log("[ChatBar] mic clicked — voice input (TODO Parça 7)");
  };

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4"
      role="search"
      aria-label="Birtavsiye AI asistanı"
    >
      <div className="flex items-center gap-2 bg-white rounded-full shadow-lg border border-gray-200 px-3 py-2 transition-all focus-within:shadow-xl focus-within:border-gray-300">
        <button
          type="button"
          onClick={handlePlusClick}
          disabled={isLoading}
          className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Görsel ekle"
          title="Görsel veya dosya ekle"
        >
          <PlusIcon className="w-5 h-5" />
        </button>

        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder="Herhangi bir şey sor"
          className="flex-1 bg-transparent outline-none text-gray-800 placeholder-gray-400 text-base disabled:opacity-50"
          aria-label="Mesajınız"
        />

        <button
          type="button"
          onClick={handleMicClick}
          disabled={isLoading}
          className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Sesli komut"
          title="Mikrofona bas, konuş"
        >
          <MicIcon className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim() || isLoading}
          className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-black text-white hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Gönder"
        >
          {isLoading ? (
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" aria-hidden="true" />
          ) : (
            <SendIcon className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
}
