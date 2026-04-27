/**
 * Chatbot Global State (Zustand) â v3 (persist + session_id)
 *
 * v3 eklentileri:
 *   - Zustand persist middleware (sessionStorage)
 *     â router.push sÄ±rasÄ±nda state kÄ±rÄ±lmasÄ±nÄ± Ã¶nler (ChatPanel aÃ§Ä±lmÄ±yor fix'i)
 *     â tab kapanÄ±nca state silinir (kullanÄ±cÄ± kararÄ±: kapatÄ±nca sil)
 *   - chatSessionId (race condition fix iÃ§in feedback)
 *
 * v2'den korunanlar:
 *   - KonuÅma geÃ§miÅi backend'e gÃ¶nderilir (proaktif sohbet)
 *   - Inactivity timeout (15dk)
 *   - KÃ¼Ã§Ã¼ltme: konuÅma korunur
 *   - Kapatma (X): konuÅma silinir
 *   - Yeni sohbet butonu
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Suggestion } from "./suggestionBuilder";

export type { Suggestion };

// ============================================================================
// Config
// ============================================================================

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 dakika
const HISTORY_FOR_BACKEND = 8;

// ============================================================================
// Types
// ============================================================================

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  attachmentType?: "image" | "voice" | null;
  attachmentPreview?: string | null;
  // Chip butonları (yalnızca assistant mesajlarında, son mesajda render edilir)
  suggestions?: Suggestion[] | null;
  // UI override: chip click ile gönderilen mesajlarda content backend'e
  // tam değer gider (örn "siyah telefon en popüler"), displayLabel UI'da
  // kısa görünür (örn "En popüler").
  displayLabel?: string | null;
  // Backend'den dönen meta (state, mergeAction, productLimit) — history rebuild için
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta?: any;
};

export type RecommendedProduct = {
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

export type PanelState = "closed" | "open" | "minimized";
export type ChatStatus = "idle" | "sending" | "streaming" | "error";

// ============================================================================
// Store interface
// ============================================================================

interface ChatStore {
  // ----- Mesajlar -----
  messages: ChatMessage[];
  addUserMessage: (
    content: string,
    attachmentType?: ChatMessage["attachmentType"],
    attachmentPreview?: string | null,
    displayLabel?: string | null
  ) => string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addAssistantMessage: (content: string, suggestions?: Suggestion[] | null, meta?: any) => void;
  clearMessages: () => void;
  startNewConversation: () => void;
  getHistoryForBackend: () => Array<{ role: string; content: string }>;

  // ----- Panel -----
  panelState: PanelState;
  openPanel: () => void;
  closePanel: () => void;
  minimizePanel: () => void;

  // ----- ÃrÃ¼nler -----
  recommendedProducts: RecommendedProduct[];
  lastQuery: string | null;
  setRecommendations: (products: RecommendedProduct[], query: string) => void;
  clearRecommendations: () => void;

  // ----- Status -----
  status: ChatStatus;
  errorMessage: string | null;
  setStatus: (status: ChatStatus, errorMessage?: string | null) => void;

  // ----- Lifecycle -----
  conversationEnded: boolean;
  lastActivityAt: number;
  checkInactivity: () => void;

  // ----- Session ID (race condition fix) -----
  chatSessionId: string;
  rotateSessionId: () => void;

  // ----- Last decision id (race-safe feedback binding) -----
  lastDecisionId: number | null;
  setLastDecisionId: (id: number | null) => void;

  // ----- Ses/gÃ¶rsel -----
  isRecording: boolean;
  setRecording: (recording: boolean) => void;
  pendingImage: string | null;
  setPendingImage: (image: string | null) => void;
}

// ============================================================================
// Helpers
// ============================================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

// ============================================================================
// Store
// ============================================================================

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      // ----- Mesajlar -----
      messages: [],

      addUserMessage: (content, attachmentType = null, attachmentPreview = null, displayLabel = null) => {
        const state = get();
        let newMessages = state.messages;
        let newSessionId = state.chatSessionId;
        let newLastDecisionId = state.lastDecisionId;

        // KonuÅma sona ermiÅse, yeni session
        if (state.conversationEnded) {
          newMessages = [];
          newSessionId = generateSessionId();
          newLastDecisionId = null;
        }

        const id = generateId();
        const message: ChatMessage = {
          id,
          role: "user",
          content,
          timestamp: Date.now(),
          attachmentType,
          attachmentPreview,
          displayLabel,
        };

        set({
          messages: [...newMessages, message],
          panelState: state.panelState === "closed" ? "open" : state.panelState,
          status: "sending",
          errorMessage: null,
          conversationEnded: false,
          lastActivityAt: Date.now(),
          chatSessionId: newSessionId,
          lastDecisionId: newLastDecisionId,
        });

        return id;
      },

      addAssistantMessage: (content, suggestions = null, meta = undefined) => {
        const message: ChatMessage = {
          id: generateId(),
          role: "assistant",
          content,
          timestamp: Date.now(),
          suggestions: suggestions ?? null,
          meta,
        };
        set((state) => ({
          messages: [...state.messages, message],
          status: "idle",
          lastActivityAt: Date.now(),
        }));
      },

      clearMessages: () => {
        set({
          messages: [],
          recommendedProducts: [],
          lastQuery: null,
          status: "idle",
          errorMessage: null,
          conversationEnded: false,
          chatSessionId: generateSessionId(),
          lastDecisionId: null,
        });
      },

      startNewConversation: () => {
        get().clearMessages();
      },

      getHistoryForBackend: () => {
        const messages = get().messages;
        const historicalOnly = messages.slice(0, -1);
        return historicalOnly
          .slice(-HISTORY_FOR_BACKEND)
          .map((m) => ({
            role: m.role,
            content: m.content,
            ...(m.role === "assistant" && m.meta?.state ? { meta: m.meta.state } : {}),
          }));
      },

      // ----- Panel -----
      panelState: "closed",

      openPanel: () => set({ panelState: "open" }),

      closePanel: () => {
        // KAPATMA = SÄ°LME
        set({
          panelState: "closed",
          messages: [],
          recommendedProducts: [],
          lastQuery: null,
          status: "idle",
          errorMessage: null,
          conversationEnded: false,
          lastActivityAt: Date.now(),
          chatSessionId: generateSessionId(),
          lastDecisionId: null,
        });
      },

      minimizePanel: () => set({ panelState: "minimized" }),

      // ----- ÃrÃ¼nler -----
      recommendedProducts: [],
      lastQuery: null,

      setRecommendations: (products, query) =>
        set({ recommendedProducts: products, lastQuery: query }),

      clearRecommendations: () => set({ recommendedProducts: [], lastQuery: null }),

      // ----- Status -----
      status: "idle",
      errorMessage: null,
      setStatus: (status, errorMessage = null) => set({ status, errorMessage }),

      // ----- Lifecycle -----
      conversationEnded: false,
      lastActivityAt: Date.now(),

      checkInactivity: () => {
        const state = get();
        if (state.conversationEnded) return;
        if (state.messages.length === 0) return;

        const elapsed = Date.now() - state.lastActivityAt;
        if (elapsed >= INACTIVITY_TIMEOUT_MS) {
          const closingMessage: ChatMessage = {
            id: generateId(),
            role: "assistant",
            content:
              "Bir süredir mesaj atmadın. Yeni bir şey aramak istersen yazmaya devam edebilirsin — ya da pencereyi kapatıp sıfırdan başlayabilirsin.",
            timestamp: Date.now(),
          };
          set({
            conversationEnded: true,
            messages: [...state.messages, closingMessage],
          });
        }
      },

      // ----- Session ID -----
      chatSessionId: generateSessionId(),
      rotateSessionId: () => set({ chatSessionId: generateSessionId() }),

      // ----- Last decision id -----
      lastDecisionId: null,
      setLastDecisionId: (id) => set({ lastDecisionId: id }),

      // ----- Ses/gÃ¶rsel -----
      isRecording: false,
      setRecording: (recording) => set({ isRecording: recording }),
      pendingImage: null,
      setPendingImage: (image) => set({ pendingImage: image }),
    }),
    {
      name: "birtavsiye-chat",
      storage: createJSONStorage(() => {
        // SSR-safe: window yoksa boÅ storage
        if (typeof window === "undefined") {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return sessionStorage;
      }),
      partialize: (state) => ({
        messages: state.messages,
        panelState: state.panelState,
        recommendedProducts: state.recommendedProducts,
        lastQuery: state.lastQuery,
        conversationEnded: state.conversationEnded,
        lastActivityAt: state.lastActivityAt,
        chatSessionId: state.chatSessionId,
        lastDecisionId: state.lastDecisionId,
      }),
    }
  )
);

// ============================================================================
// Selectors
// ============================================================================

export const useChatMessages = () => useChatStore((s) => s.messages);
export const useChatPanel = () => useChatStore((s) => s.panelState);
export const useChatStatus = () => useChatStore((s) => s.status);
export const useRecommendations = () => useChatStore((s) => s.recommendedProducts);
export const useConversationEnded = () => useChatStore((s) => s.conversationEnded);
export const useChatSessionId = () => useChatStore((s) => s.chatSessionId);

// ============================================================================
// Inactivity ticker
// ============================================================================

let inactivityInterval: ReturnType<typeof setInterval> | null = null;

export function startInactivityWatcher() {
  if (inactivityInterval) return;
  if (typeof window === "undefined") return;
  inactivityInterval = setInterval(() => {
    useChatStore.getState().checkInactivity();
  }, 60 * 1000);
}

export function stopInactivityWatcher() {
  if (inactivityInterval) {
    clearInterval(inactivityInterval);
    inactivityInterval = null;
  }
}
