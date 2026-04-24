"use client";

/**
 * ChatBar â Sayfa altÄ±nda sabit duran AI sohbet Ã§ubuÄu
 *
 * GÃ¶rsel tasarÄ±m: pill-shape, beyaz arka plan, sol kenarda + butonu,
 * ortada metin input'u, saÄda mikrofon ve gÃ¶nder butonu.
 *
 * DavranÄ±Å:
 *   - TÃ¼m sayfalarda fixed bottom (layout.tsx'te global mount)
 *   - KullanÄ±cÄ± yazÄ±p Enter'a basar veya gÃ¶nder butonuna tÄ±klar
 *   - + butonu: image upload menÃ¼sÃ¼ (TODO ParÃ§a 6)
 *   - Mikrofon: ses tanÄ±ma (TODO ParÃ§a 7)
 *   - GÃ¶nder: useChatStore.addUserMessage + /api/chat Ã§aÄrÄ±sÄ± + /sonuclar yÃ¶nlendirmesi
 */

import { useState, useRef, useCallback, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useChatStore } from "../../lib/chatbot/useChatStore";

// ============================================================================
// Icons (inline SVG â extra dependency yok)
// ============================================================================

function PlusIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function MicIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function SendIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      {/* GÃ¶rseldeki ses dalga ikonu - 3 dikey Ã§izgi, ortadaki uzun */}
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

  const isLoading = status === "sending" || status === "streaming";

  // ----- GÃ¶nderme akÄ±ÅÄ± -----
  const handleSend = useCallback(async () => {
    const message = text.trim();
    if (!message || isLoading) return;

    // 1. MesajÄ± store'a ekle, panel otomatik aÃ§Ä±lsÄ±n
    addUserMessage(message);
    openPanel();
    setText("");

    // 2. /sonuclar sayfasÄ±na yÃ¶nlendir (eÄer zaten orada deÄilsek)
    //    URL'i gÃ¼ncellemek arama deneyimi iÃ§in kritik (bookmark, geri buton)
    const queryParam = encodeURIComponent(message);
    router.push(`/sonuclar?q=${queryParam}`);

    // 3. /api/chat'e istek at
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // 4. YanÄ±tÄ± store'a ekle
      addAssistantMessage(data.reply || "Yanıt alınamadı.");

      // 5. Ãnerilen Ã¼rÃ¼nleri gÃ¼ncelle (sonuÃ§lar sayfasÄ± bunu okuyacak)
      if (Array.isArray(data.products)) {
        setRecommendations(data.products, message);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Bilinmeyen hata";
      setStatus("error", errorMsg);
      addAssistantMessage(
        "Üzgünüm, bir sorun oluştu. Lütfen tekrar dener misin?"
      );
    }
  }, [
    text,
    isLoading,
    addUserMessage,
    openPanel,
    router,
    addAssistantMessage,
    setRecommendations,
    setStatus,
  ]);

  // ----- Enter tuÅu -----
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ----- + butonu (TODO: image upload menÃ¼) -----
  const handlePlusClick = () => {
    // TODO ParÃ§a 6: image upload menÃ¼sÃ¼
    console.log("[ChatBar] + clicked â image upload menu (TODO)");
  };

  // ----- Mikrofon butonu (TODO: ses tanÄ±ma) -----
  const handleMicClick = () => {
    // TODO ParÃ§a 7: Web Speech API
    console.log("[ChatBar] mic clicked â voice input (TODO)");
  };

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4"
      role="search"
      aria-label="Birtavsiye AI asistanı"
    >
      <div
        className="
          flex items-center gap-2
          bg-white
          rounded-full
          shadow-lg
          border border-gray-200
          px-3 py-2
          transition-all
          focus-within:shadow-xl
          focus-within:border-gray-300
        "
      >
        {/* + (image upload menÃ¼sÃ¼ tetikleyici) */}
        <button
          type="button"
          onClick={handlePlusClick}
          disabled={isLoading}
          className="
            flex-shrink-0
            w-10 h-10
            flex items-center justify-center
            rounded-full
            text-gray-600
            hover:bg-gray-100
            transition-colors
            disabled:opacity-50
            disabled:cursor-not-allowed
          "
          aria-label="Görsel ekle"
          title="Görsel veya dosya ekle"
        >
          <PlusIcon className="w-5 h-5" />
        </button>

        {/* Metin input */}
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder="Herhangi bir şey sor"
          className="
            flex-1
            bg-transparent
            outline-none
            text-gray-800
            placeholder-gray-400
            text-base
            disabled:opacity-50
          "
          aria-label="Mesajınız"
        />

        {/* Mikrofon */}
        <button
          type="button"
          onClick={handleMicClick}
          disabled={isLoading}
          className="
            flex-shrink-0
            w-10 h-10
            flex items-center justify-center
            rounded-full
            text-gray-600
            hover:bg-gray-100
            transition-colors
            disabled:opacity-50
            disabled:cursor-not-allowed
          "
          aria-label="Sesli komut"
          title="Mikrofona bas, konuş"
        >
          <MicIcon className="w-5 h-5" />
        </button>

        {/* GÃ¶nder (gÃ¶rseldeki siyah daire iÃ§inde ses dalga ikonu) */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim() || isLoading}
          className="
            flex-shrink-0
            w-10 h-10
            flex items-center justify-center
            rounded-full
            bg-black
            text-white
            hover:bg-gray-800
            transition-colors
            disabled:opacity-30
            disabled:cursor-not-allowed
          "
          aria-label="Gönder"
        >
          {isLoading ? (
            <span
              className="w-2 h-2 rounded-full bg-white animate-pulse"
              aria-hidden="true"
            />
          ) : (
            <SendIcon className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
}
