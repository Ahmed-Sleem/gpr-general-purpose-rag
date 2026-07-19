"use client";

import React, { useState, useRef, useEffect } from "react";
import { useApp, ConversationTurn } from "../context/AppContext";
import { CitationDrawer } from "./CitationDrawer";

export const ChatPanel: React.FC = () => {
  const {
    conversations, activeConversationId, addTurnToConversation,
    apiKey, language, selectedDocIds, setActiveGraphNodeIds, t
  } = useApp();

  const [inputMessage, setInputMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [activeSearchStatus, setActiveSearchStatus] = useState<string | null>(null);
  const [activeCitationCode, setActiveCitationCode] = useState<string | null>(null);
  const [activeCitationTitle, setActiveCitationTitle] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find(c => c.id === activeConversationId);
  const turns = activeConv ? activeConv.turns : [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [turns, streamingContent, activeSearchStatus]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || isStreaming) return;

    const userText = inputMessage.trim();
    setInputMessage("");
    
    const userTurn: ConversationTurn = {
      id: `turn_u_${Date.now()}`,
      role: "user",
      content: userText,
      timestamp: new Date().toISOString()
    };
    addTurnToConversation(userTurn);

    setIsStreaming(true);
    setStreamingContent("");
    setActiveSearchStatus(language === "ar" ? "🔍 جاري استرجاع وفحص المقاطع في الخريطة..." : "🔍 Inspecting chunks on graph view...");

    try {
      const response = await fetch("/api/v1/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-LLM-API-Key": apiKey,
          "X-App-Language": language
        },
        body: JSON.stringify({
          message: userText,
          document_id: selectedDocIds.length > 0 ? selectedDocIds[0] : null,
          language: language,
          history: turns.map(t => ({ role: t.role, content: t.content }))
        })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let partialText = "";

      if (reader) {
        let currentEvent = "token";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunkStr = decoder.decode(value, { stream: true });
          const lines = chunkStr.split("\n");

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            const colonIdx = trimmedLine.indexOf(":");
            if (colonIdx !== -1) {
              const prefix = trimmedLine.slice(0, colonIdx).trim();
              const valStr = trimmedLine.slice(colonIdx + 1).trim();

              if (prefix === "event") {
                currentEvent = valStr;
              } else if (prefix === "data") {
                if (currentEvent === "agent_search") {
                  try {
                    const searchData = JSON.parse(valStr);
                    if (searchData.active_node_ids && searchData.active_node_ids.length > 0) {
                      setActiveGraphNodeIds(searchData.active_node_ids);
                    }
                    if (searchData.query) {
                      setActiveSearchStatus(language === "ar" ? `🔍 استرجاع في الخريطة: "${searchData.query}"` : `🔍 Graph querying: "${searchData.query}"`);
                    }
                  } catch (err) {}
                } else if (currentEvent === "token") {
                  partialText += valStr;
                  setStreamingContent(partialText);
                }
              }
            }
          }
        }
      }

      const assistantTurn: ConversationTurn = {
        id: `turn_a_${Date.now()}`,
        role: "assistant",
        content: partialText || (language === "ar" ? "تم استكمال الاسترجاع من الدليل." : "Retrieval completed from workspace manual."),
        timestamp: new Date().toISOString()
      };
      addTurnToConversation(assistantTurn);
    } catch (e: any) {
      const errTurn: ConversationTurn = {
        id: `turn_err_${Date.now()}`,
        role: "assistant",
        content: language === "ar" ? `عذراً، حدث خطأ في الاتصال بخادم الاسترجاع: ${e.message}` : `Sorry, error connecting to retrieval backend: ${e.message}`,
        timestamp: new Date().toISOString()
      };
      addTurnToConversation(errTurn);
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
      setActiveSearchStatus(null);
    }
  };

  const renderContentWithCitations = (content: string) => {
    const citationRegex = /\[(المصدر|Source):\s*(القسم|Section|جدول|Table)?\s*([0-9\.\w\-]+)\s*[\-\:]?\s*([^\]]+)?\]/g;
    const parts = [];
    let lastIdx = 0;
    let match;

    while ((match = citationRegex.exec(content)) !== null) {
      if (match.index > lastIdx) {
        parts.push(<span key={`text_${lastIdx}`}>{content.slice(lastIdx, match.index)}</span>);
      }
      const code = match[3] || "1.0";
      const title = match[4] || match[0];
      parts.push(
        <button
          key={`cite_${match.index}`}
          onClick={() => {
            setActiveCitationCode(code);
            setActiveCitationTitle(title);
          }}
          style={{
            background: "var(--accent-green-bg)", color: "var(--accent-green)",
            border: "1px solid rgba(155, 227, 107, 0.4)", borderRadius: "12px",
            padding: "2px 8px", fontSize: "11px", fontWeight: 600, cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: "4px", margin: "0 4px"
          }}
          title="Click to open source excerpt"
        >
          📄 {code}
        </button>
      );
      lastIdx = match.index + match[0].length;
    }

    if (lastIdx < content.length) {
      parts.push(<span key={`text_${lastIdx}`}>{content.slice(lastIdx)}</span>);
    }
    return parts.length > 0 ? parts : content;
  };

  return (
    <div className="glass-panel" style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
      {/* Chat Messages Feed */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {turns.length === 0 && !isStreaming ? (
          <div style={{ textAlign: "center", margin: "auto 0", color: "var(--text-secondary)", maxWidth: "380px" }}>
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>🤖</div>
            <h3 style={{ fontSize: "16px", color: "var(--text-primary)", marginBottom: "8px" }}>
              {language === "ar" ? "مرحباً بك في المساعد الداخلي المعتمد" : "Welcome to Cyrkil Grounded Assistant"}
            </h3>
            <p style={{ fontSize: "13px", lineHeight: 1.6 }}>
              {language === "ar"
                ? "يسترجع المساعد المعلومات حصرياً من دليل الهيكل التنظيمي المعتمد والمستندات المرفوعة. اسأل عن صلاحيات الأقسام، مؤشرات الأداء (KPIs)، أو مسارات التصعيد."
                : "The assistant grounds answers strictly in your approved organizational manuals. Ask about department duties, KPI targets, or escalation paths."}
            </p>
          </div>
        ) : null}

        {turns.map(turn => (
          <div
            key={turn.id}
            style={{
              alignSelf: turn.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "82%",
              background: turn.role === "user" ? "rgba(45, 45, 45, 0.85)" : "var(--bg-card)",
              border: turn.role === "user" ? "1px solid rgba(255,255,255,0.12)" : "1px solid var(--border)",
              borderLeft: turn.role === "assistant" && language === "en" ? "3px solid var(--accent-green)" : undefined,
              borderRight: turn.role === "assistant" && language === "ar" ? "3px solid var(--accent-green)" : undefined,
              borderRadius: "10px", padding: "14px 16px", fontSize: "14px", lineHeight: 1.6,
              color: "var(--text-primary)", boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
            }}
          >
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px", fontWeight: 600 }}>
              {turn.role === "user" ? (language === "ar" ? "👤 الموظف" : "👤 Staff Query") : (language === "ar" ? "🤖 المساعد الذكي (Grounded RAG)" : "🤖 Grounded Assistant")}
            </div>
            <div style={{ whiteSpace: "pre-wrap" }}>
              {turn.role === "assistant" ? renderContentWithCitations(turn.content) : turn.content}
            </div>
          </div>
        ))}

        {isStreaming ? (
          <div style={{
            alignSelf: "flex-start", maxWidth: "82%", background: "var(--bg-card)",
            border: "1px solid var(--border-focus)", borderRadius: "10px", padding: "14px 16px",
            fontSize: "14px", lineHeight: 1.6, color: "var(--text-primary)"
          }}>
            <div style={{ fontSize: "11px", color: "var(--accent-green)", marginBottom: "6px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
              <span>⚡ {language === "ar" ? "جاري الاسترجاع والتحليل..." : "Streaming grounded answer..."}</span>
            </div>
            {activeSearchStatus && (
              <div style={{
                fontSize: "12px", background: "rgba(155, 227, 107, 0.08)", border: "1px dashed var(--border-focus)",
                padding: "6px 10px", borderRadius: "6px", color: "var(--accent-green)", marginBottom: "10px",
                display: "flex", alignItems: "center", gap: "6px"
              }}>
                <span>{activeSearchStatus}</span>
              </div>
            )}
            <div style={{ whiteSpace: "pre-wrap" }}>
              {streamingContent || (language === "ar" ? "..." : "...")}
            </div>
          </div>
        ) : null}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Area */}
      <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)", background: "var(--bg-surface)" }}>
        <form onSubmit={handleSend} style={{ display: "flex", gap: "10px" }}>
          <input
            id="cyrkil-chat-input"
            type="text"
            placeholder={selectedDocIds.length > 0 ? (language === "ar" ? `اسأل في نطاق المستند المحدد...` : `Ask within scoped document...`) : t("ask_placeholder")}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isStreaming}
            style={{
              flex: 1, padding: "12px 16px", borderRadius: "8px",
              background: "var(--bg-canvas)", border: "1px solid var(--border)",
              color: "var(--text-primary)", fontSize: "14px", outline: "none",
              transition: "border-color 0.2s"
            }}
          />
          <button
            type="submit"
            disabled={isStreaming || !inputMessage.trim()}
            className="btn-cyrkil btn-accent"
            style={{ padding: "0 22px", fontWeight: 600, opacity: isStreaming || !inputMessage.trim() ? 0.5 : 1 }}
          >
            {isStreaming ? (language === "ar" ? "..." : "...") : (language === "ar" ? "إرسال 🚀" : "Send 🚀")}
          </button>
        </form>
      </div>

      <CitationDrawer
        isOpen={!!activeCitationCode}
        citationCode={activeCitationCode}
        citationTitle={activeCitationTitle}
        onClose={() => setActiveCitationCode(null)}
      />
    </div>
  );
};
