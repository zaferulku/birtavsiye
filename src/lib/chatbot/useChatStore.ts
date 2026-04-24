/**
 * Chatbot Global State (Zustand) â v2
 *
 * Yeni Ã¶zellikler:
 *   - KonuÅma geÃ§miÅi backend'e gÃ¶nderilir (proaktif/sÃ¼rdÃ¼rÃ¼lebilir sohbet)
 *   - Inactivity timeout (15dk hareketsizlik â konuÅma sonlanÄ±r)
 *   - KÃ¼Ã§Ã¼ltme: konuÅma korunur
 *   - Kapatma (X): konuÅma silinir
 *   - Yeni sohbet butonu: manuel sÄ±fÄ±rlama
 *
 * YaÅam dÃ¶ngÃ¼sÃ¼:
 *   - addUserMessage Ã§aÄrÄ±ldÄ±ÄÄ±nda activity timer reset
 *   - 15dk yeni mesaj yoksa â conversationEnded = true
 *   - closePanel â tÃ¼m state silinir (clearMessages dahil)
 *   - minimizePanel â state korunur
 *   - openPanel â eÄer ended ise yeni sohbet baÅlatÄ±lÄ±r
 */

import { create } from "zustand";

// ============================================================================
// Config
// ============================================================================

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 dakika
const HISTORY_FOR_BACKEND = 8; // backend'e son 8 mesaj gÃ¶nder (4 tur)

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
  // Mesajlar
  messages: ChatMessage[];
  addUserMessage: (content: string, attachmentType?: ChatMessage["attachmentType"], attachmentPreview?: string | null) => string;
  addAssistantMessage: (content: string) => void;
  clearMessages: () => void;
  startNewConversation: () => void;

  // Backend iÃ§in history slice
  getHistoryForBackend: () => Array<{ role: string; content: string }>;

  // Panel durumu
  panelState: PanelState;
  openPanel: () => void;
  closePanel: () => void;        // konuÅmayÄ± SÄ°LER
  minimizePanel: () => void;     // konuÅmayÄ± korur

  // Ãnerilen Ã¼rÃ¼nler
  recommendedProducts: RecommendedProduct[];
  lastQuery: string | null;
  setRecommendations: (products: RecommendedProduct[], query: string) => void;
  clearRecommendations: () => void;

  // Status
  status: ChatStatus;
  errorMessage: string | null;
  setStatus: (status: ChatStatus, errorMessage?: string | null) => void;

  // Inactivity / lifecycle
  conversationEnded: boolean;
  lastActivityAt: number;
  checkInactivity: () => void;       // periyodik Ã§aÄrÄ±lÄ±r

  // Ses/gÃ¶rsel
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

// ============================================================================
// Store
// ============================================================================

export const useChatStore = create<ChatStore>((set, get) => ({
  // ----- Mesajlar -----
  messages: [],

  addUserMessage: (content, attachmentType = null, attachmentPreview = null) => {
    const state = get();

    // KonuÅma sona ermiÅse, yeni sohbet baÅlat (mesajlarÄ± temizle)
    let newMessages = state.messages;
    if (state.conversationEnded) {
      newMessages = [];
    }

    const id = generateId();
    const message: ChatMessage = {
      id,
      role: "user",
      content,
      timestamp: Date.now(),
      attachmentType,
      attachmentPreview,
    };

    set({
      messages: [...newMessages, message],
      panelState: state.panelState === "closed" ? "open" : state.panelState,
      status: "sending",
      errorMessage: null,
      conversationEnded: false,
      lastActivityAt: Date.now(),
    });

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
    });
  },

  startNewConversation: () => {
    get().clearMessages();
  },

  // ----- Backend history slice -----
  // Son N mesajÄ± backend'e gÃ¶nderir (proaktif sohbet iÃ§in)
  getHistoryForBackend: () => {
    const messages = get().messages;
    // Son N mesaj (en gÃ¼ncel mesaj henÃ¼z backend'e gÃ¶nderilmedi, onu hariÃ§ tut)
    // Bu fonksiyon ChatBar'da addUserMessage'dan SONRA Ã§aÄrÄ±lÄ±r,
    // o yÃ¼zden son mesaj zaten user'Ä±n yeni mesajÄ±dÄ±r â onu hariÃ§ tut
    const historicalOnly = messages.slice(0, -1);
    return historicalOnly
      .slice(-HISTORY_FOR_BACKEND)
      .map((m) => ({ role: m.role, content: m.content }));
  },

  // ----- Panel durumu -----
  panelState: "closed",

  openPanel: () => {
    // KonuÅma sona ermiÅse panel aÃ§Ä±ldÄ±ÄÄ±nda otomatik temizleme YOK
    // (kullanÄ±cÄ± eski geÃ§miÅe bakmak isteyebilir)
    // Sadece bir sonraki mesaj geldiÄinde temizlenir (addUserMessage iÃ§inde)
    set({ panelState: "open" });
  },

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
    });
  },

  minimizePanel: () => {
    // KÃÃÃLTME = KORUMA (mesajlar dokunulmaz)
    set({ panelState: "minimized" });
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
    set({ recommendedProducts: [], lastQuery: null });
  },

  // ----- Status -----
  status: "idle",
  errorMessage: null,
  setStatus: (status, errorMessage = null) => set({ status, errorMessage }),

  // ----- Inactivity / lifecycle -----
  conversationEnded: false,
  lastActivityAt: Date.now(),

  checkInactivity: () => {
    const state = get();
    if (state.conversationEnded) return;
    if (state.messages.length === 0) return;

    const elapsed = Date.now() - state.lastActivityAt;
    if (elapsed >= INACTIVITY_TIMEOUT_MS) {
      // KonuÅmayÄ± sonlandÄ±r, ama mesajlarÄ± silme (kullanÄ±cÄ± geri dÃ¶nÃ¼p bakabilsin)
      // Bot otomatik son mesaj ekler (UI bunu fark eder)
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

  // ----- Ses/gÃ¶rsel -----
  isRecording: false,
  setRecording: (recording) => set({ isRecording: recording }),
  pendingImage: null,
  setPendingImage: (image) => set({ pendingImage: image }),
}));

// ============================================================================
// Selectors (performance iÃ§in)
// ============================================================================

export const useChatMessages = () => useChatStore((s) => s.messages);
export const useChatPanel = () => useChatStore((s) => s.panelState);
export const useChatStatus = () => useChatStore((s) => s.status);
export const useRecommendations = () => useChatStore((s) => s.recommendedProducts);
export const useConversationEnded = () => useChatStore((s) => s.conversationEnded);

// ============================================================================
// Inactivity ticker (component-side useEffect ile baÅlatÄ±lÄ±r)
// ============================================================================

let inactivityInterval: ReturnType<typeof setInterval> | null = null;

export function startInactivityWatcher() {
  if (inactivityInterval) return;
  inactivityInterval = setInterval(() => {
    useChatStore.getState().checkInactivity();
  }, 60 * 1000); // Dakikada bir kontrol
}

export function stopInactivityWatcher() {
  if (inactivityInterval) {
    clearInterval(inactivityInterval);
    inactivityInterval = null;
  }
}
