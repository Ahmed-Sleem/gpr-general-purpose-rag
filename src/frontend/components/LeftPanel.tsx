"use client";

import React, { useState } from "react";
import { useApp } from "../context/AppContext";

export const LeftPanel: React.FC = () => {
  const { conversations, activeConversationId, setActiveConversationId, createConversation, language, t } = useApp();
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = conversations.filter(c =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="glass-panel" style={{ height: "100%", padding: "14px" }}>
      {/* New Chat Button */}
      <button
        onClick={createConversation}
        className="btn-cyrkil btn-accent"
        style={{ width: "100%", justifyContent: "center", marginBottom: "14px", padding: "10px" }}
      >
        {t("new_chat")}
      </button>

      {/* Search Conversations Box */}
      <div style={{ marginBottom: "14px" }}>
        <input
          type="text"
          placeholder={t("search_conversations")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: "100%", padding: "8px 12px", borderRadius: "6px",
            background: "var(--bg-canvas)", border: "1px solid var(--border)",
            color: "var(--text-primary)", fontSize: "13px", outline: "none"
          }}
        />
      </div>

      {/* Conversations Stack */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
        {filtered.map(conv => {
          const isSelected = conv.id === activeConversationId;
          return (
            <div
              key={conv.id}
              onClick={() => setActiveConversationId(conv.id)}
              className={`cyrkil-card ${isSelected ? "selected" : ""}`}
              style={{
                padding: "10px 12px",
                borderLeft: isSelected && language === "en" ? "3px solid var(--accent-green)" : undefined,
                borderRight: isSelected && language === "ar" ? "3px solid var(--accent-green)" : undefined
              }}
            >
              <div style={{ fontSize: "13px", fontWeight: isSelected ? 600 : 400, color: "var(--text-primary)", marginBottom: "4px" }}>
                💬 {conv.title}
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
                <span>{conv.turns.length} {language === "ar" ? "رسائل" : "turns"}</span>
                <span>{new Date(conv.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Prompt Suggestions Footer */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px", marginTop: "10px" }}>
        <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "8px", fontWeight: 600 }}>
          ⚡ {language === "ar" ? "أسئلة سريعة شائعة:" : "Quick Suggestions:"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {[
            language === "ar" ? "من المسؤول عن متابعة حوادث السلامة وكيف تُحسب؟" : "How is the QHSE Safety Incident Rate (TRIR) calculated?",
            language === "ar" ? "لمن يرفع مدير مكتب إدارة المشاريع (PMO) تقاريره؟" : "Who does the PMO Manager report to and what are their duties?",
            language === "ar" ? "ما هي مصفوفة التصعيد الإداري في حال الخلاف؟" : "What is the administrative escalation matrix across 4 levels?"
          ].map((promptText, i) => (
            <div
              key={i}
              onClick={() => {
                const input = document.getElementById("cyrkil-chat-input") as HTMLInputElement;
                if (input) {
                  input.value = promptText;
                  input.focus();
                }
              }}
              style={{
                fontSize: "11px", color: "var(--text-secondary)", background: "var(--bg-canvas)",
                padding: "6px 8px", borderRadius: "4px", border: "1px solid var(--border)",
                cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
              }}
              title={promptText}
            >
              👉 {promptText}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
