"use client";

import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { ApiKeyModal } from "./ApiKeyModal";

export const Header: React.FC = () => {
  const { language, setLanguage, theme, setTheme, apiKey, t } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <header style={{
        height: "var(--header-height)",
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        zIndex: 50
      }}>
        {/* Brand & Status Pill */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{
            width: "28px", height: "28px", borderRadius: "6px",
            background: "linear-gradient(135deg, var(--accent-green) 0%, #3a7d1c 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: "bold", color: "#0A0A0A", fontSize: "16px"
          }}>
            C
          </div>
          <h1 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>
            {t("app_title")}
          </h1>
          <span style={{
            fontSize: "11px", padding: "3px 8px", borderRadius: "12px",
            background: "var(--accent-green-bg)", color: "var(--accent-green)",
            border: "1px solid rgba(155, 227, 107, 0.3)", display: "flex", alignItems: "center", gap: "5px"
          }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent-green)" }} />
            {language === "ar" ? "مُتصل بدليل الموارد البشرية v1.0" : "Workspace v1.0 Connected"}
          </span>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* API Key Modal Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-cyrkil"
            style={{
              borderColor: apiKey ? "var(--border-focus)" : "var(--border)",
              background: apiKey ? "var(--accent-green-bg)" : "transparent"
            }}
            title="Add or configure your DeepSeek / OpenAI API Key"
          >
            🔑 {apiKey ? (language === "ar" ? "مفتاح API مفعل" : "API Key Active") : t("add_api_key")}
          </button>

          {/* Direct AR/EN Toggle Button */}
          <button
            onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
            className="btn-cyrkil"
            style={{ fontWeight: 600, minWidth: "70px", justifyContent: "center" }}
            title="Toggle between Arabic and English directly"
          >
            {language === "ar" ? "🌐 English" : "🌐 عربي"}
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="btn-cyrkil"
            style={{ width: "36px", justifyContent: "center", padding: "6px 0" }}
            title="Toggle Dark / Light Cyrkil Glass Theme"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>
      </header>

      <ApiKeyModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
