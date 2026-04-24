"use client";

/**
 * ChatBar v2 â Sayfa altÄ±nda sabit pill-shape arama Ã§ubuÄu
 *
 * v1'den fark: history backend'e gÃ¶nderiliyor (proaktif sohbet iÃ§in)
 */

import { useState, useRef, useCallback, useEffect, type ChangeEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useChatStore } from "../../lib/chatbot/useChatStore";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

// Minimal tipler — Web Speech API resmi DOM types'ta değil, tarayıcı-scope
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

// ============================================================================
// ChatBar
// ============================================================================

export function ChatBar() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [imageError, setImageError] = useState<string | null>(null);

  const status = useChatStore((s) => s.status);
  const addUserMessage = useChatStore((s) => s.addUserMessage);
  const addAssistantMessage = useChatStore((s) => s.addAssistantMessage);
  const setRecommendations = useChatStore((s) => s.setRecommendations);
  const setStatus = useChatStore((s) => s.setStatus);
  const openPanel = useChatStore((s) => s.openPanel);
  const getHistoryForBackend = useChatStore((s) => s.getHistoryForBackend);
  const pendingImage = useChatStore((s) => s.pendingImage);
  const setPendingImage = useChatStore((s) => s.setPendingImage);
  const isRecording = useChatStore((s) => s.isRecording);
  const setRecording = useChatStore((s) => s.setRecording);

  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const transcriptBaseRef = useRef<string>("");

  const isLoading = status === "sending" || status === "streaming";

  const handleSend = useCallback(async () => {
    const message = text.trim();
    if ((!message && !pendingImage) || isLoading) return;

    const attachedImage = pendingImage;
    addUserMessage(message || "[Görsel]", attachedImage ? "image" : null, attachedImage);
    openPanel();
    setText("");
    setPendingImage(null);

    // History snapshot ALDIKTAN SONRA navigate
    // (yeni mesaj eklendi, getHistoryForBackend onu hariç tutar)
    const history = getHistoryForBackend();
    const chatSessionId = useChatStore.getState().chatSessionId;

    const queryForNav = message || "görsel";
    router.push(`/sonuclar?q=${encodeURIComponent(queryForNav)}`);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history, chatSessionId, image: attachedImage }),
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
    text, pendingImage, isLoading, addUserMessage, openPanel, router, setPendingImage,
    addAssistantMessage, setRecommendations, setStatus, getHistoryForBackend,
  ]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePlusClick = () => {
    setImageError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setImageError("Lütfen bir görsel dosyası seç.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError("Görsel en fazla 5 MB olabilir.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPendingImage(reader.result);
        setImageError(null);
      }
    };
    reader.onerror = () => setImageError("Görsel okunamadı, tekrar dene.");
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setPendingImage(null);
    setImageError(null);
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
        setVoiceError("Mikrofon erişimine izin ver. Tarayıcı ayarlarından kontrol edebilirsin.");
      } else if (code === "no-speech") {
        setVoiceError("Ses algılanmadı, tekrar dene.");
      } else if (code === "aborted") {
        // manuel durdurma — hata değil
      } else {
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

  useEffect(() => {
    return () => {
      const rec = recognitionRef.current;
      if (rec) {
        try { rec.abort(); } catch { /* noop */ }
      }
      recognitionRef.current = null;
    };
  }, []);

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4"
      role="search"
      aria-label="Birtavsiye AI asistanı"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />

      {pendingImage && (
        <div className="mb-2 flex items-center gap-3 bg-white rounded-2xl shadow-md border border-gray-200 p-2 pr-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pendingImage} alt="Eklenen görsel" className="h-14 w-14 rounded-xl object-cover" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-800">Görsel eklendi</div>
            <div className="text-xs text-gray-500">Mesajınla birlikte gönderilecek.</div>
          </div>
          <button
            type="button"
            onClick={handleRemoveImage}
            className="flex-shrink-0 w-8 h-8 rounded-full text-gray-500 hover:bg-gray-100"
            aria-label="Görseli kaldır"
            title="Görseli kaldır"
          >
            ×
          </button>
        </div>
      )}

      {imageError && (
        <div
          role="alert"
          className="mb-2 text-center text-xs text-red-600 bg-red-50 border border-red-200 rounded-full px-3 py-1.5"
        >
          {imageError}
        </div>
      )}

      {voiceError && (
        <div
          role="alert"
          className="mb-2 text-center text-xs text-red-600 bg-red-50 border border-red-200 rounded-full px-3 py-1.5"
        >
          {voiceError}
        </div>
      )}

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

        <button
          type="button"
          onClick={handleSend}
          disabled={(!text.trim() && !pendingImage) || isLoading}
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
