/**
 * Chatbot Global State (Zustand)
 *
 * ChatBar (sayfa altÄ± sabit), ChatPanel (saÄdan aÃ§Ä±lan), ve /sonuclar sayfasÄ±
 * AYNI state'i okur ve gÃ¼nceller.
 *
 * AkÄ±Å:
 *   1. KullanÄ±cÄ± ChatBar'a yazÄ±p gÃ¶nderir
 *   2. addUserMessage Ã§aÄrÄ±lÄ±r
 *   3. ChatPanel otomatik aÃ§Ä±lÄ±r (eÄer kapalÄ±ysa)
 *   4. fetchChatResponse tetiklenir â /api/chat Ã§aÄrÄ±sÄ±
 *   5. YanÄ±t gelince addAssistantMessage Ã§aÄrÄ±lÄ±r
 *   6. recommendedProducts gÃ¼ncellenir
 *   7. router.push("/sonuclar?q=...") (component katmanÄ±nda, store'dan deÄil)
 *
 * Store sadece state tutar â routing, side-effect'ler component'lerde olur.
 */

import { create } from "zustand";

// ============================================================================
// Types
// ============================================================================

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  // Opsiyonel: gÃ¶rsel/ses ile gelen mesaj
  attachmentType?: "image" | "voice" | null;
  attachmentPreview?: string | null;  // base64 data url veya transcript
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
  addUserMessage: (content: string, attachmentType?: ChatMessage["attachmentType"], attachmentPreview?: string | null) => string; // returns message id
  addAssistantMessage: (content: string) => void;
  clearMessages: () => void;

  // ----- Panel durumu -----
  panelState: PanelState;
  openPanel: () => void;
  closePanel: () => void;
  minimizePanel: () => void;
  togglePanel: () => void;

  // ----- Ãnerilen Ã¼rÃ¼nler (sonuÃ§lar sayfasÄ± bunu okur) -----
  recommendedProducts: RecommendedProduct[];
  lastQuery: string | null;
  setRecommendations: (products: RecommendedProduct[], query: string) => void;
  clearRecommendations: () => void;

  // ----- Status & error -----
  status: ChatStatus;
  errorMessage: string | null;
  setStatus: (status: ChatStatus, errorMessage?: string | null) => void;

  // ----- Ses kaydÄ± durumu -----
  isRecording: boolean;
  setRecording: (recording: boolean) => void;

  // ----- GÃ¶rsel Ã¶nizleme (henÃ¼z gÃ¶nderilmemiÅ) -----
  pendingImage: string | null;  // base64 data url
  setPendingImage: (image: string | null) => void;
}

// ============================================================================
// Helpers
// ============================================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ============================================================================
// Store
// ============================================================================

export const useChatStore = create<ChatStore>((set, get) => ({
  // ----- Mesajlar -----
  messages: [],

  addUserMessage: (content, attachmentType = null, attachmentPreview = null) => {
    const id = generateId();
    const message: ChatMessage = {
      id,
      role: "user",
      content,
      timestamp: Date.now(),
      attachmentType,
      attachmentPreview,
    };
    set((state) => ({
      messages: [...state.messages, message],
      // Yeni mesaj geldiÄinde panel otomatik aÃ§Ä±lsÄ±n (kapalÄ±ysa)
      panelState: state.panelState === "closed" ? "open" : state.panelState,
      // Status: bekliyoruz
      status: "sending",
      errorMessage: null,
    }));
    return id;
  },

  addAssistantMessage: (content) => {
    const message: ChatMessage = {
      id: generateId(),
      role: "assistant",
      content,
      timestamp: Date.now(),
    };
    set((state) => ({
      messages: [...state.messages, message],
      status: "idle",
    }));
  },

  clearMessages: () => {
    set({
      messages: [],
      recommendedProducts: [],
      lastQuery: null,
      status: "idle",
      errorMessage: null,
    });
  },

  // ----- Panel durumu -----
  panelState: "closed",

  openPanel: () => set({ panelState: "open" }),
  closePanel: () => set({ panelState: "closed" }),
  minimizePanel: () => set({ panelState: "minimized" }),

  togglePanel: () => {
    const current = get().panelState;
    if (current === "open") {
      set({ panelState: "minimized" });
    } else {
      set({ panelState: "open" });
    }
  },

  // ----- Ãnerilen Ã¼rÃ¼nler -----
  recommendedProducts: [],
  lastQuery: null,

  setRecommendations: (products, query) => {
    set({
      recommendedProducts: products,
      lastQuery: query,
    });
  },

  clearRecommendations: () => {
    set({
      recommendedProducts: [],
      lastQuery: null,
    });
  },

  // ----- Status & error -----
  status: "idle",
  errorMessage: null,

  setStatus: (status, errorMessage = null) => {
    set({ status, errorMessage });
  },

  // ----- Ses kaydÄ± -----
  isRecording: false,
  setRecording: (recording) => set({ isRecording: recording }),

  // ----- GÃ¶rsel Ã¶nizleme -----
  pendingImage: null,
  setPendingImage: (image) => set({ pendingImage: image }),
}));

// ============================================================================
// Selectors (performance iÃ§in optional helpers)
// ============================================================================

export const useChatMessages = () => useChatStore((s) => s.messages);
export const useChatPanel = () => useChatStore((s) => s.panelState);
export const useChatStatus = () => useChatStore((s) => s.status);
export const useRecommendations = () => useChatStore((s) => s.recommendedProducts);
