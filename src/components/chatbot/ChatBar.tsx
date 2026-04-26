"use client";

/**
 * ChatBar v3 — Sayfa altı pill-shape input bar
 *
 * v2'den fark:
 *   - Düzen: [🎤] [input...] [+] [▶] (mikrofon sola, + sağa)
 *   - + butonu menü açar: "Fotoğraf yükle"
 *   - Menü dışına tıklayınca kapanır
 *
 * v2 özellikleri korunur:
 *   - Pill-shape, alt sabit
 *   - History backend'e gönderilir
 *   - chatSessionId
 *
 * NOT: Bu v3 sürüm Parça 6 (gerçek image upload) ve Parça 7 (Web Speech)
 * implementasyonlarını placeholder TODO'ya geri çekmiştir. Önceki
 * commit'lerde (a56dcd9, 25b5223) çalışan implementasyonlar vardı;
 * sonraki iterasyonda bu UI üzerine yeniden bağlanacak.
 */

import { useState, useRef, useCallback, useEffect, KeyboardEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useChatStore } from "../../lib/chatbot/useChatStore";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

// Web Speech API tipleri (resmi DOM types'ta yok)
type SpeechRecognitionAlternative = { transcript: string; confidence: number };
type SpeechRecognitionResult = {
  readonly length: number;
  readonly isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
};
type SpeechRecognitionResultList = {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
};
type SpeechRecognitionEvent = { results: SpeechRecognitionResultList; resultIndex: number };
type SpeechRecognitionErrorEvent = { error: string; message?: string };
interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;
function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

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

function CameraIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

// ============================================================================
// + Menu Component
// ============================================================================

function PlusMenu({
  isOpen,
  onClose,
  onPhotoUpload,
}: {
  isOpen: boolean;
  onClose: () => void;
  onPhotoUpload: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEsc = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEsc);
    }, 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="
        absolute bottom-full mb-2 right-0
        bg-white rounded-xl shadow-xl border border-gray-200
        py-1 min-w-[180px] z-50
        animate-fade-in
      "
      role="menu"
    >
      <button
        type="button"
        onClick={() => {
          onPhotoUpload();
          onClose();
        }}
        className="
          w-full flex items-center gap-3 px-4 py-2.5
          text-sm text-gray-800 hover:bg-gray-50
          transition-colors
        "
        role="menuitem"
      >
        <CameraIcon className="w-4 h-4 text-gray-600" />
        <span>Fotoğraf yükle</span>
      </button>
    </div>
  );
}

// ============================================================================
// ChatBar
// ============================================================================

export function ChatBar() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const transcriptBaseRef = useRef<string>("");

  const status = useChatStore((s) => s.status);
  const addUserMessage = useChatStore((s) => s.addUserMessage);
  const addAssistantMessage = useChatStore((s) => s.addAssistantMessage);
  const setRecommendations = useChatStore((s) => s.setRecommendations);
  const setStatus = useChatStore((s) => s.setStatus);
  const openPanel = useChatStore((s) => s.openPanel);
  const getHistoryForBackend = useChatStore((s) => s.getHistoryForBackend);
  const isRecording = useChatStore((s) => s.isRecording);
  const setRecording = useChatStore((s) => s.setRecording);

  const isLoading = status === "sending" || status === "streaming";

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => {
      const rec = recognitionRef.current;
      if (rec) {
        try { rec.abort(); } catch { /* noop */ }
      }
      recognitionRef.current = null;
    };
  }, []);

  const handleSend = useCallback(async () => {
    const message = text.trim();
    if (!message || isLoading) return;

    addUserMessage(message);
    openPanel();
    setText("");

    const history = getHistoryForBackend();
    const chatSessionId = useChatStore.getState().chatSessionId;
    const decisionId = useChatStore.getState().lastDecisionId;

    router.push(`/sonuclar?q=${encodeURIComponent(message)}`);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history, chatSessionId, decisionId }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      addAssistantMessage(data.reply || "Yanıt alınamadı.", data.suggestions ?? null);

      if (typeof data?.meta?.decisionId === "number") {
        useChatStore.getState().setLastDecisionId(data.meta.decisionId);
      }

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

  const handlePhotoUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      addAssistantMessage("Lütfen bir resim dosyası seç (jpg, png, webp).");
      openPanel();
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      addAssistantMessage("Görsel 5 MB'tan büyük olamaz.");
      openPanel();
      return;
    }

    let base64: string;
    try {
      base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Dosya okunamadı"));
        reader.readAsDataURL(file);
      });
    } catch {
      addAssistantMessage("Görsel okunamadı, tekrar dene.");
      openPanel();
      return;
    }

    const message = text.trim() || "Bu görseli analiz et, ne ürün?";
    addUserMessage(message, "image", base64);
    openPanel();
    setText("");

    const history = getHistoryForBackend();
    const chatSessionId = useChatStore.getState().chatSessionId;
    const decisionId = useChatStore.getState().lastDecisionId;
    router.push(`/sonuclar?q=${encodeURIComponent(message)}`);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history, chatSessionId, decisionId, image: base64 }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      addAssistantMessage(data.reply || "Yanıt alınamadı.", data.suggestions ?? null);
      if (typeof data?.meta?.decisionId === "number") {
        useChatStore.getState().setLastDecisionId(data.meta.decisionId);
      }
      if (Array.isArray(data.products)) {
        setRecommendations(data.products, message);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Bilinmeyen hata";
      setStatus("error", errorMsg);
      addAssistantMessage("Görsel yüklenirken bir sorun oluştu, tekrar dener misin?");
    }
  };

  const stopRecognition = useCallback(() => {
    const rec = recognitionRef.current;
    if (rec) {
      try { rec.stop(); } catch { /* noop */ }
    }
    recognitionRef.current = null;
    setRecording(false);
  }, [setRecording]);

  const handleMicClick = useCallback(() => {
    setVoiceError(null);

    if (isRecording) {
      stopRecognition();
      return;
    }

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setVoiceError("Tarayıcın sesli girişi desteklemiyor. Chrome veya Edge dene.");
      return;
    }

    let recognition: SpeechRecognitionInstance;
    try {
      recognition = new Ctor();
    } catch {
      setVoiceError("Mikrofon başlatılamadı.");
      return;
    }

    recognition.lang = "tr-TR";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    transcriptBaseRef.current = text;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const piece = result[0]?.transcript ?? "";
        if (result.isFinal) finalText += piece;
        else interim += piece;
      }
      const base = transcriptBaseRef.current;
      const joined = (base + " " + (finalText || interim)).trim();
      setText(joined);
      if (finalText) transcriptBaseRef.current = joined;
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const code = event.error;
      if (code === "not-allowed" || code === "service-not-allowed") {
        setVoiceError("Mikrofon erişimine izin ver.");
      } else if (code === "no-speech") {
        setVoiceError("Ses algılanmadı, tekrar dene.");
      } else if (code !== "aborted") {
        setVoiceError(`Ses tanımada sorun: ${code}`);
      }
      stopRecognition();
    };

    recognition.onend = () => {
      setRecording(false);
      recognitionRef.current = null;
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setRecording(true);
    } catch {
      setVoiceError("Mikrofon başlatılamadı, tekrar dene.");
      stopRecognition();
    }
  }, [isRecording, text, setRecording, stopRecognition]);

  const handlePlusClick = () => {
    setMenuOpen(prev => !prev);
  };

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4"
      role="search"
      aria-label="Birtavsiye AI asistanı"
    >
      <div className="relative">
        {voiceError && (
          <div
            role="alert"
            className="mb-2 text-center text-xs text-red-600 bg-red-50 border border-red-200 rounded-full px-3 py-1.5 mx-auto max-w-md"
          >
            {voiceError}
          </div>
        )}
        <div className="flex items-center gap-2 bg-white rounded-full shadow-lg border border-gray-200 px-3 py-2 transition-all focus-within:shadow-xl focus-within:border-gray-300">
          {/* MİKROFON — SOLDA */}
          <button
            type="button"
            onClick={handleMicClick}
            disabled={isLoading}
            className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isRecording
                ? "bg-red-500 text-white hover:bg-red-600 animate-pulse"
                : "text-gray-600 hover:bg-gray-100"
            }`}
            aria-label={isRecording ? "Kaydı durdur" : "Sesli komut"}
            aria-pressed={isRecording}
            title={isRecording ? "Kaydı durdurmak için tıkla" : "Mikrofona bas, konuş"}
          >
            <MicIcon className="w-5 h-5" />
          </button>

          {/* INPUT */}
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

          {/* + BUTON — SAĞDA */}
          <button
            type="button"
            onClick={handlePlusClick}
            disabled={isLoading}
            className={`
              flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full
              transition-colors disabled:opacity-50 disabled:cursor-not-allowed
              ${menuOpen ? "bg-gray-200 text-gray-900" : "text-gray-600 hover:bg-gray-100"}
            `}
            aria-label="Daha fazla"
            aria-expanded={menuOpen}
            title="Daha fazla seçenek"
          >
            <PlusIcon className="w-5 h-5" />
          </button>

          {/* GÖNDER */}
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

          {/* + Menü (popover) */}
          <PlusMenu
            isOpen={menuOpen}
            onClose={() => setMenuOpen(false)}
            onPhotoUpload={handlePhotoUpload}
          />
        </div>

        {/* Gizli file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelected}
          className="hidden"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
