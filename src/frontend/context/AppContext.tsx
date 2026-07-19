"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

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

interface AppContextType {
  language: "ar" | "en";
  setLanguage: (lang: "ar" | "en") => void;
  theme: "dark" | "light";
  setTheme: (theme: "dark" | "light") => void;
  apiKey: string;
  setApiKey: (key: string) => void;
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
  t: (key: string) => string;
}

const translations: Record<string, Record<"ar" | "en", string>> = {
  app_title: { ar: "المساعد الداخلي الذكي للموظفين", en: "Cyrkil Knowledge Workspace" },
  new_chat: { ar: "+ محادثة جديدة", en: "+ New Chat" },
  search_conversations: { ar: "البحث في المحادثات...", en: "Search conversations..." },
  add_api_key: { ar: "إضافة مفتاح API", en: "Add API Key" },
  files_tab: { ar: "📁 المستندات والمعرفة", en: "📁 Documents" },
  graph_tab: { ar: "🕸️ عرض الرسم البياني (Obsidian)", en: "🕸️ Obsidian Graph" },
  upload_dropzone: { ar: "اسحب ملف هنا أو انقر للرفع (PDF, DOCX, MD, TXT)", en: "Drag & drop file or click to upload (PDF, DOCX, MD, TXT)" },
  ask_placeholder: { ar: "اسأل عن صلاحيات الموظفين، مؤشرات الأداء، أو التصعيد...", en: "Ask about staff duties, KPI calculations, or escalation paths..." },
  save: { ar: "حفظ الإعدادات", en: "Save Settings" },
  cancel: { ar: "إلغاء", en: "Cancel" },
  api_key_placeholder: { ar: "أدخل مفتاح DeepSeek أو OpenAI (sk-...)", en: "Enter DeepSeek or OpenAI API Key (sk-...)" },
  api_key_desc: { ar: "يتم حفظ المفتاح بأمان في متصفحك ويرسل مع كل طلب لتشغيل المساعد.", en: "Key is securely stored in your browser and sent with every chat query." },
  select_doc_hint: { ar: "انقر لتحديد النطاق:", en: "Click to scope chat:" },
  no_docs: { ar: "لا توجد مستندات مرفوعة بعد. ارفع دليلاً للبدء.", en: "No documents uploaded yet. Upload a manual to begin." },
  ready: { ar: "جاهز ومفهرس", en: "Ready & Indexed" },
  processing: { ar: "جاري الفهرسة...", en: "Processing..." },
  inspecting_chunks: { ar: "🔍 جاري استرجاع وفحص المقاطع في الخريطة...", en: "🔍 Inspecting chunks on graph view..." }
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<"ar" | "en">("ar");
  const [theme, setThemeState] = useState<"dark" | "light">("dark");
  const [apiKey, setApiKeyState] = useState<string>("");
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [activeGraphNodeIds, setActiveGraphNodeIds] = useState<string[]>([]);
  const [documents, setDocuments] = useState<DocumentDTO[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: "default_conv",
      title: "محادثة عامة في دليل الهيكل",
      created_at: new Date().toISOString(),
      turns: []
    }
  ]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>("default_conv");

  useEffect(() => {
    const savedLang = (localStorage.getItem("cyrkil_language") as "ar" | "en") || "ar";
    const savedTheme = (localStorage.getItem("cyrkil_theme") as "dark" | "light") || "dark";
    const savedKey = localStorage.getItem("cyrkil_llm_api_key") || "";
    setLanguageState(savedLang);
    setThemeState(savedTheme);
    setApiKeyState(savedKey);
    document.documentElement.dir = savedLang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = savedLang;
    if (savedTheme === "light") document.body.classList.add("light-mode");
    else document.body.classList.remove("light-mode");
    fetchDocuments();
  }, []);

  const setLanguage = (lang: "ar" | "en") => {
    setLanguageState(lang);
    localStorage.setItem("cyrkil_language", lang);
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  };

  const setTheme = (thm: "dark" | "light") => {
    setThemeState(thm);
    localStorage.setItem("cyrkil_theme", thm);
    if (thm === "light") document.body.classList.add("light-mode");
    else document.body.classList.remove("light-mode");
  };

  const setApiKey = (key: string) => {
    setApiKeyState(key);
    localStorage.setItem("cyrkil_llm_api_key", key);
  };

  const fetchDocuments = async () => {
    try {
      const res = await fetch("/api/v1/documents");
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
      title: language === "ar" ? "محادثة استفسار جديدة" : "New Grounded Query",
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

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        theme,
        setTheme,
        apiKey,
        setApiKey,
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
        t
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within an AppProvider");
  return context;
};
