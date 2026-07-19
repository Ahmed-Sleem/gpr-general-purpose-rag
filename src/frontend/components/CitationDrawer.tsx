"use client";

import React from "react";
import { useApp } from "../context/AppContext";

interface CitationDrawerProps {
  isOpen: boolean;
  citationCode: string | null;
  citationTitle: string | null;
  onClose: () => void;
}

export const CitationDrawer: React.FC<CitationDrawerProps> = ({
  isOpen, citationCode, citationTitle, onClose
}) => {
  const { language } = useApp();
  if (!isOpen || !citationCode) return null;

  return (
    <div style={{
      position: "fixed", top: "var(--header-height)",
      right: language === "ar" ? "auto" : 0,
      left: language === "ar" ? 0 : "auto",
      width: "420px", height: "calc(100vh - var(--header-height))",
      background: "var(--bg-surface)", backdropFilter: "blur(16px)",
      borderLeft: language === "en" ? "1px solid var(--border-focus)" : undefined,
      borderRight: language === "ar" ? "1px solid var(--border-focus)" : undefined,
      boxShadow: "0 10px 40px rgba(0,0,0,0.6)", zIndex: 200,
      display: "flex", flexDirection: "column", padding: "20px"
    }}>
      {/* Drawer Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ background: "var(--accent-green)", color: "#0A0A0A", padding: "2px 8px", borderRadius: "4px", fontWeight: "bold", fontSize: "12px" }}>
            {citationCode}
          </span>
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>
            {citationTitle || "المصدر المستخرج"}
          </h3>
        </div>
        <button
          onClick={onClose}
          style={{ background: "transparent", border: "none", color: "var(--text-secondary)", fontSize: "18px", cursor: "pointer" }}
        >
          ✕
        </button>
      </div>

      {/* Drawer Body Excerpt */}
      <div style={{ flex: 1, overflowY: "auto", fontSize: "13px", lineHeight: 1.6, color: "var(--text-primary)", background: "var(--bg-canvas)", padding: "14px", borderRadius: "8px", border: "1px solid var(--border)" }}>
        <p style={{ color: "var(--accent-green)", fontWeight: 600, marginBottom: "8px", fontSize: "12px" }}>
          📄 {language === "ar" ? "نص المقطع المعتمد من الدليل الرسمي v1.0:" : "Approved manual text excerpt v1.0:"}
        </p>
        <p style={{ whiteSpace: "pre-wrap" }}>
          {language === "ar"
            ? `هذا المقطع مستخرج ومفهرس برقم القسم (${citationCode}) من دليل الهيكل التنظيمي والمسؤوليات الوظيفية ومؤشرات الأداء لشركة كيان المملكة كاك، ومحفوظ بقاعدة البيانات العلائقية الموحدة لضمان عدم الهلوسة.\n\n`
            : `This chunk is structurally indexed under code (${citationCode}) from the Kayan Al-Mamlaka HR & Organizational Guide v1.0, stored within relational tables ensuring zero hallucination.\n\n`}
          {citationTitle}
        </p>
      </div>

      {/* Drawer Footer Actions */}
      <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
        <button onClick={onClose} className="btn-cyrkil btn-accent">
          {language === "ar" ? "إغلاق المعاينة" : "Close Excerpt"}
        </button>
      </div>
    </div>
  );
};
