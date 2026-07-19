"use client";

import React, { useState } from "react";
import { useApp } from "../context/AppContext";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose }) => {
  const { apiKey, setApiKey, t } = useApp();
  const [inputKey, setInputKey] = useState(apiKey);
  const [provider, setProvider] = useState<"deepseek" | "openai">("deepseek");

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setApiKey(inputKey.trim());
    onClose();
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0, 0, 0, 0.65)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
    }}>
      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border-focus)",
        borderRadius: "12px", padding: "24px", width: "420px", maxWidth: "90vw",
        boxShadow: "0 20px 40px rgba(0,0,0,0.5)"
      }}>
        <h3 style={{ fontSize: "18px", marginBottom: "8px", color: "var(--text-primary)" }}>
          🔑 {t("add_api_key")}
        </h3>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px" }}>
          {t("api_key_desc")}
        </p>

        <form onSubmit={handleSave}>
          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "12px", marginBottom: "6px", color: "var(--text-secondary)" }}>
              Provider Type:
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as any)}
              style={{
                width: "100%", padding: "8px 12px", borderRadius: "6px",
                background: "var(--bg-canvas)", border: "1px solid var(--border)",
                color: "var(--text-primary)", outline: "none", fontSize: "14px"
              }}
            >
              <option value="deepseek">DeepSeek (deepseek-chat)</option>
              <option value="openai">OpenAI Compatible (GPT-4o / v4-flash)</option>
            </select>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "12px", marginBottom: "6px", color: "var(--text-secondary)" }}>
              API Key (`sk-...`):
            </label>
            <input
              type="password"
              placeholder={t("api_key_placeholder")}
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: "6px",
                background: "var(--bg-canvas)", border: "1px solid var(--border-focus)",
                color: "var(--text-primary)", outline: "none", fontSize: "14px",
                fontFamily: "monospace"
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-cyrkil"
              style={{ padding: "8px 16px" }}
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              className="btn-cyrkil btn-accent"
              style={{ padding: "8px 18px" }}
            >
              {t("save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
