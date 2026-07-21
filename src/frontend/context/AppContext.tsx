"use client";

/**
 * WHY: Master Global Workspace State (`AppContext.tsx`).
 * Manages device identification without login (`deviceId`), multi-key API profiles (`savedApiKeys`),
 * persistent per-device conversation history, UI language (`AR/EN`), theme (`Dark/Light`), and active scope.
 */
import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { GlobalModals } from "../components/GlobalModals";

export interface DocumentDTO {
  id: string;
  title: string;
  filename: string;
  file_type: string;
  file_size: number;
  status: string;
  toc_tree: any[];
  created_at: string;
  chunk_count: number;
}

export interface ConversationTurn {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  citations?: { code: string; title: string }[];
}

export interface Conversation {
  id: string;
  title: string;
  turns: ConversationTurn[];
  created_at: string;
}

export interface SavedApiKey {
  id: string;
  label: string;
  provider: "deepseek" | "groq" | "openai" | "gemini";
  model: string;
  key: string;
  createdAt: string;
}

interface AppContextType {
  deviceId: string;
  language: "ar" | "en";
  setLanguage: (lang: "ar" | "en") => void;
  theme: "dark" | "light";
  setTheme: (theme: "dark" | "light") => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  apiProvider: "deepseek" | "groq" | "openai" | "gemini";
  setApiProvider: (provider: "deepseek" | "groq" | "openai" | "gemini") => void;
  apiModel: string;
  setApiModel: (model: string) => void;
  workflowCycles: number;
  setWorkflowCycles: (cycles: number) => void;
  savedApiKeys: SavedApiKey[];
  activeApiKeyId: string | null;
  addSavedApiKey: (keyObj: Omit<SavedApiKey, "id" | "createdAt">) => void;
  deleteSavedApiKey: (id: string) => void;
  selectSavedApiKey: (id: string) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  inspectingNodeId: string | null;
  setInspectingNodeId: (id: string | null) => void;
  inspectingNode: any | null;
  setInspectingNode: (node: any | null) => void;
  selectedDocIds: string[];
  setSelectedDocIds: React.Dispatch<React.SetStateAction<string[]>>;
  activeGraphNodeIds: string[];
  setActiveGraphNodeIds: React.Dispatch<React.SetStateAction<string[]>>;
  documents: DocumentDTO[];
  fetchDocuments: () => Promise<void>;
  conversations: Conversation[];
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  createConversation: () => void;
  addTurnToConversation: (turn: ConversationTurn) => void;
  deleteConversation: (id: string) => void;
  deleteAllConversations: () => void;
  isReady: boolean;
  t: (key: string) => string;
}

const translations: Record<string, Record<"ar" | "en", string>> = {
  app_title: { ar: "GPR — المساعد الداخلي الذكي للموظفين", en: "GPR — General Purpose RAG Workspace" },
  new_chat: { ar: "محادثة جديدة", en: "New Chat" },
  search_conversations: { ar: "البحث في المحادثات...", en: "Search conversations..." },
  add_api_key: { ar: "إدارة مفاتيح API ونماذج الذكاء", en: "Multi-API Key & Model Manager" },
  files_tab: { ar: "📁 المستندات والمعرفة", en: "📁 Documents" },
  graph_tab: { ar: "🕸️ الخريطة (Map)", en: "🕸️ Map" },
  ask_placeholder: { ar: "اسأل عن صلاحيات الموظفين، مؤشرات الأداء، أو التصعيد...", en: "Ask about staff duties, KPI calculations, or escalation paths..." },
  save: { ar: "حفظ وتفعيل", en: "Save & Activate" },
  cancel: { ar: "إلغاء", en: "Cancel" },
  api_key_placeholder: { ar: "أدخل مفتاح DeepSeek أو Groq أو OpenAI أو Google Gemini (sk-... / gsk_... / AIza...)", en: "Enter DeepSeek, Groq, OpenAI, or Google Gemini API Key (sk-... / gsk_... / AIza...)" },
  api_key_desc: { ar: "يتم حفظ المفاتيح والملفات الشخصية بأمان في جهازك وترتبط بهويتك الدلالية لاستدعاء النماذج وتوليد الخريطة.", en: "Key profiles are stored safely on this device and bound to your device identity to power grounded retrieval." },
  select_doc_hint: { ar: "انقر لتحديد النطاق:", en: "Click to scope chat:" },
  no_docs: { ar: "لا توجد مستندات مؤسسية مفهرسة حتى الآن.", en: "No official workspace documents indexed yet." },
  ready: { ar: "جاهز ومفهرس", en: "Ready & Indexed" },
  processing: { ar: "جاري الفهرسة...", en: "Processing..." },
  inspecting_chunks: { ar: "🔍 جاري استرجاع وفحص المقاطع في الخريطة...", en: "🔍 Inspecting chunks on graph view..." }
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [deviceId, setDeviceId] = useState<string>("dev_default");
  const [isReady, setIsReady] = useState<boolean>(false);
  const [language, setLanguageState] = useState<"ar" | "en">("ar");
  const [theme, setThemeState] = useState<"dark" | "light">("dark");
  const [apiKey, setApiKeyState] = useState<string>("");
  const [apiProvider, setApiProviderState] = useState<"deepseek" | "groq" | "openai" | "gemini">("deepseek");
  const [apiModel, setApiModelState] = useState<string>("deepseek-chat");
  const [workflowCycles, setWorkflowCyclesState] = useState<number>(3);
  const [savedApiKeys, setSavedApiKeys] = useState<SavedApiKey[]>([]);
  const [activeApiKeyId, setActiveApiKeyId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [inspectingNodeId, setInspectingNodeId] = useState<string | null>(null);
  const [inspectingNode, setInspectingNode] = useState<any | null>(null);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [activeGraphNodeIds, setActiveGraphNodeIds] = useState<string[]>([]);
  const [documents, setDocuments] = useState<DocumentDTO[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: "default_conv",
      title: "محادثة استفسار في الدليل المؤسسي",
      created_at: new Date().toISOString(),
      turns: []
    }
  ]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>("default_conv");

  const hasLoadedFromStorage = useRef<boolean>(false);

  // Load device ID, language, theme, saved API keys, and device conversations on boot
  useEffect(() => {
    let devId = localStorage.getItem("gpr_device_id");
    if (!devId) {
      devId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      localStorage.setItem("gpr_device_id", devId);
    }
    setDeviceId(devId);

    const savedLang = (localStorage.getItem("gpr_language") as "ar" | "en") || "en";
    const savedTheme = (localStorage.getItem("gpr_theme") as "dark" | "light") || "dark";
    const savedCycles = parseInt(localStorage.getItem(`gpr_workflow_cycles_${devId}`) || "3", 10);
    setLanguageState(savedLang);
    setThemeState(savedTheme);
    if (savedCycles >= 1 && savedCycles <= 6) setWorkflowCyclesState(savedCycles);
    document.documentElement.dir = savedLang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = savedLang;
    if (savedTheme === "dark") document.body.classList.add("dark-mode");
    else document.body.classList.remove("dark-mode");

    // Load saved API keys for this device
    const keysJson = localStorage.getItem(`gpr_saved_keys_${devId}`) || localStorage.getItem("gpr_saved_keys");
    let loadedKeys: SavedApiKey[] = [];
    if (keysJson) {
      try { loadedKeys = JSON.parse(keysJson); } catch (e) {}
    }

    // Check if there's a legacy single key that needs migrating into a saved profile
    const legacyKey = localStorage.getItem("gpr_llm_api_key") || "";
    const legacyProvider = (localStorage.getItem("gpr_llm_provider") as any) || "deepseek";
    const legacyModel = localStorage.getItem("gpr_llm_model") || "deepseek-chat";

    if (loadedKeys.length === 0 && legacyKey) {
      const migratedProfile: SavedApiKey = {
        id: "key_migrated_01",
        label: `${legacyProvider.toUpperCase()} Profile (${legacyModel})`,
        provider: legacyProvider,
        model: legacyModel,
        key: legacyKey,
        createdAt: new Date().toISOString()
      };
      loadedKeys = [migratedProfile];
      localStorage.setItem(`gpr_saved_keys_${devId}`, JSON.stringify(loadedKeys));
    }

    setSavedApiKeys(loadedKeys);
    const activeKeyId = localStorage.getItem(`gpr_active_key_id_${devId}`) || (loadedKeys.length > 0 ? loadedKeys[0].id : null);
    setActiveApiKeyId(activeKeyId);

    if (activeKeyId) {
      const activeObj = loadedKeys.find(k => k.id === activeKeyId);
      if (activeObj) {
        setApiKeyState(activeObj.key);
        setApiProviderState(activeObj.provider);
        setApiModelState(activeObj.model);
      }
    } else if (legacyKey) {
      setApiKeyState(legacyKey);
      setApiProviderState(legacyProvider);
      setApiModelState(legacyModel);
    }

    // Load device conversations durably across browser sessions
    const convsJson = localStorage.getItem(`gpr_conversations_${devId}`) || localStorage.getItem("gpr_conversations");
    const activeConvId = localStorage.getItem(`gpr_active_conv_id_${devId}`) || localStorage.getItem("gpr_active_conv_id");
    let initialConvs: Conversation[] = [
      {
        id: "default_conv",
        title: savedLang === "ar" ? "محادثة استفسار في الدليل المؤسسي" : "New Grounded Query",
        created_at: new Date().toISOString(),
        turns: []
      }
    ];

    if (convsJson) {
      try {
        const parsedConvs = JSON.parse(convsJson);
        if (Array.isArray(parsedConvs) && parsedConvs.length > 0) {
          initialConvs = parsedConvs;
        }
      } catch (e) {}
    }

    setConversations(initialConvs);
    setActiveConversationId(activeConvId || (initialConvs.length > 0 ? initialConvs[0].id : "default_conv"));

    hasLoadedFromStorage.current = true;
    setIsReady(true);
    fetchDocuments(devId);
  }, []);

  // Synchronize conversations and active conversation ID to localStorage whenever updated
  useEffect(() => {
    if (!hasLoadedFromStorage.current || !isReady || !deviceId) return;
    localStorage.setItem(`gpr_conversations_${deviceId}`, JSON.stringify(conversations));
    localStorage.setItem("gpr_conversations", JSON.stringify(conversations));
    if (activeConversationId) {
      localStorage.setItem(`gpr_active_conv_id_${deviceId}`, activeConversationId);
      localStorage.setItem("gpr_active_conv_id", activeConversationId);
    }
  }, [conversations, activeConversationId, isReady, deviceId]);

  const setLanguage = (lang: "ar" | "en") => {
    setLanguageState(lang);
    localStorage.setItem("gpr_language", lang);
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  };

  const setTheme = (thm: "dark" | "light") => {
    setThemeState(thm);
    localStorage.setItem("gpr_theme", thm);
    if (thm === "dark") document.body.classList.add("dark-mode");
    else document.body.classList.remove("dark-mode");
  };

  const setApiKey = (key: string) => {
    setApiKeyState(key);
    localStorage.setItem("gpr_llm_api_key", key);
  };

  const setApiProvider = (prov: "deepseek" | "groq" | "openai" | "gemini") => {
    setApiProviderState(prov);
    localStorage.setItem("gpr_llm_provider", prov);
  };

  const setApiModel = (model: string) => {
    setApiModelState(model);
    localStorage.setItem("gpr_llm_model", model);
  };

  const setWorkflowCycles = (cycles: number) => {
    const valid = Math.min(Math.max(cycles, 1), 6);
    setWorkflowCyclesState(valid);
    localStorage.setItem(`gpr_workflow_cycles_${deviceId}`, String(valid));
  };

  const addSavedApiKey = (keyObj: Omit<SavedApiKey, "id" | "createdAt">) => {
    const newId = `key_${Date.now()}`;
    const newSaved: SavedApiKey = {
      ...keyObj,
      id: newId,
      createdAt: new Date().toISOString()
    };
    const updated = [newSaved, ...savedApiKeys];
    setSavedApiKeys(updated);
    localStorage.setItem(`gpr_saved_keys_${deviceId}`, JSON.stringify(updated));
    selectSavedApiKey(newId, updated);
  };

  const deleteSavedApiKey = (id: string) => {
    const updated = savedApiKeys.filter(k => k.id !== id);
    setSavedApiKeys(updated);
    localStorage.setItem(`gpr_saved_keys_${deviceId}`, JSON.stringify(updated));
    if (activeApiKeyId === id) {
      if (updated.length > 0) {
        selectSavedApiKey(updated[0].id, updated);
      } else {
        setActiveApiKeyId(null);
        setApiKey("");
        localStorage.removeItem(`gpr_active_key_id_${deviceId}`);
      }
    }
  };

  const selectSavedApiKey = (id: string, keysList = savedApiKeys) => {
    const found = keysList.find(k => k.id === id);
    if (found) {
      setActiveApiKeyId(id);
      setApiKey(found.key);
      setApiProvider(found.provider);
      setApiModel(found.model);
      localStorage.setItem(`gpr_active_key_id_${deviceId}`, id);
    }
  };

  const fetchDocuments = async (devId = deviceId) => {
    try {
      const res = await fetch("/api/v1/documents", {
        headers: { "X-Device-ID": devId }
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (e) {
      console.error("Failed to fetch persistent documents:", e);
    }
  };

  const createConversation = () => {
    const newId = `conv_${Date.now()}`;
    const newConv: Conversation = {
      id: newId,
      title: language === "ar" ? "محادثة استفسار في الدليل المؤسسي" : "New Grounded Query",
      created_at: new Date().toISOString(),
      turns: []
    };
    setConversations(prev => [newConv, ...prev]);
    setActiveConversationId(newId);
  };

  const addTurnToConversation = (turn: ConversationTurn) => {
    if (!activeConversationId) return;
    setConversations(prev =>
      prev.map(c => {
        if (c.id === activeConversationId) {
          const updatedTurns = [...c.turns, turn];
          let updatedTitle = c.title;
          if (c.turns.length === 0 && turn.role === "user") {
            updatedTitle = turn.content.slice(0, 35) + "...";
          }
          return { ...c, turns: updatedTurns, title: updatedTitle };
        }
        return c;
      })
    );
  };

  const deleteConversation = (id: string) => {
    setConversations(prev => {
      const updated = prev.filter(c => c.id !== id);
      if (updated.length === 0) {
        const defaultConv: Conversation = {
          id: `conv_${Date.now()}`,
          title: language === "ar" ? "محادثة استفسار في الدليل المؤسسي" : "New Grounded Query",
          created_at: new Date().toISOString(),
          turns: []
        };
        setActiveConversationId(defaultConv.id);
        return [defaultConv];
      } else if (activeConversationId === id) {
        setActiveConversationId(updated[0].id);
      }
      return updated;
    });
  };

  const deleteAllConversations = () => {
    const defaultConv: Conversation = {
      id: `conv_${Date.now()}`,
      title: language === "ar" ? "محادثة استفسار في الدليل المؤسسي" : "New Grounded Query",
      created_at: new Date().toISOString(),
      turns: []
    };
    setConversations([defaultConv]);
    setActiveConversationId(defaultConv.id);
    localStorage.setItem(`gpr_conversations_${deviceId}`, JSON.stringify([defaultConv]));
  };

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  return (
    <AppContext.Provider
      value={{
        deviceId,
        isReady,
        language,
        setLanguage,
        theme,
        setTheme,
        apiKey,
        setApiKey,
        apiProvider,
        setApiProvider,
        apiModel,
        setApiModel,
        workflowCycles,
        setWorkflowCycles,
        savedApiKeys,
        activeApiKeyId,
        addSavedApiKey,
        deleteSavedApiKey,
        selectSavedApiKey,
        isSettingsOpen,
        setIsSettingsOpen,
        inspectingNodeId,
        setInspectingNodeId,
        inspectingNode,
        setInspectingNode,
        selectedDocIds,
        setSelectedDocIds,
        activeGraphNodeIds,
        setActiveGraphNodeIds,
        documents,
        fetchDocuments,
        conversations,
        activeConversationId,
        setActiveConversationId,
        createConversation,
        addTurnToConversation,
        deleteConversation,
        deleteAllConversations,
        t
      }}
    >
      {children}
      <GlobalModals />
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within an AppProvider");
  return context;
};
