"use client";

/**
 * WHY: Multi-API Key Profile Manager Modal (`ApiKeyModal.tsx`).
 * Allows staff to view their saved API key profiles (`DeepSeek / Groq / OpenAI`),
 * select which profile to actively work with (`[ Use This Key ]`), delete old profiles,
 * and test/save new keys directly into their device memory (`deviceId`) without login.
 */
import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose }) => {
  const {
    savedApiKeys, activeApiKeyId, addSavedApiKey, deleteSavedApiKey, selectSavedApiKey,
    deviceId, language, t
  } = useApp();

  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [label, setLabel] = useState("");
  const [provider, setProvider] = useState<"deepseek" | "groq" | "openai" | "gemini">("deepseek");
  const [model, setModel] = useState("deepseek-chat");
  const [keyInput, setKeyInput] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ status: "valid" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (isOpen && savedApiKeys.length === 0) {
      setShowAddForm(true);
    }
  }, [isOpen, savedApiKeys.length]);

  if (!isOpen) return null;

  const modelsForProvider = (prov: "deepseek" | "groq" | "openai" | "gemini") => {
    if (prov === "groq") {
      return ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it"];
    } else if (prov === "deepseek") {
      return ["deepseek-chat", "deepseek-reasoner"];
    } else if (prov === "gemini") {
      return ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash"];
    } else {
      return ["gpt-4o", "gpt-4o-mini"];
    }
  };

  const handleProviderChange = (newProv: "deepseek" | "groq" | "openai" | "gemini") => {
    setProvider(newProv);
    const available = modelsForProvider(newProv);
    if (available.length > 0) setModel(available[0]);
  };

  const handleTestConnection = async () => {
    if (!keyInput.trim()) {
      setTestResult({
        status: "error",
        message: language === "ar" ? "الرجاء إدخال مفتاح الـ API أولاً قبل الفحص." : "Please enter an API key string before testing."
      });
      return;
    }
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/v1/auth/check-api", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-ID": deviceId
        },
        body: JSON.stringify({
          provider: provider,
          api_key: keyInput.trim(),
          model: model.trim()
        })
      });
      const data = await res.json();
      setTestResult({ status: data.status || "valid", message: data.message || "Connected successfully!" });
    } catch (e: any) {
      setTestResult({ status: "error", message: `Connection failure: ${e.message}` });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveAndActivate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) return;

    const displayLabel = label.trim() || `${provider.toUpperCase()} Profile (${model})`;
    addSavedApiKey({
      label: displayLabel,
      provider: provider,
      model: model.trim(),
      key: keyInput.trim()
    });

    setLabel("");
    setKeyInput("");
    setTestResult(null);
    setShowAddForm(false);
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0, 0, 0, 0.8)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
    }}>
      <div style={{
        background: "var(--color-paper)", border: "1px solid var(--border-med)",
        borderRadius: "var(--radius-xl)", padding: "26px", width: "520px", maxWidth: "94vw",
        boxShadow: "var(--shadow-elevated)", display: "flex", flexDirection: "column", gap: "18px",
        maxHeight: "88vh", overflowY: "auto"
      }}>
        {/* Header Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-soft)", paddingBottom: "14px" }}>
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>
              🔑 {t("add_api_key")}
            </h3>
            <span style={{ fontSize: "11px", color: "var(--text-meta)" }}>
              {language === "ar" ? `جهاز معرف: ${deviceId.slice(0, 14)}...` : `Device ID: ${deviceId.slice(0, 14)}...`}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", fontSize: "18px", color: "var(--text-meta)", cursor: "pointer", padding: "4px" }}
          >
            ✕
          </button>
        </div>

        {/* Section 1: Saved API Key Profiles */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-meta)" }}>
              {language === "ar" ? "المفاتيح المحفوظة على هذا الجهاز" : "Saved API Key Profiles"}
            </span>
            {savedApiKeys.length > 0 && !showAddForm && (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="tool-btn"
                style={{ width: "auto", padding: "4px 10px", fontSize: "11px", height: "28px" }}
              >
                + {language === "ar" ? "إضافة مفتاح جديد" : "Add New Key"}
              </button>
            )}
          </div>

          {savedApiKeys.length === 0 ? (
            <div style={{
              background: "var(--color-stone)", border: "1px dashed var(--border-med)",
              borderRadius: "var(--radius-md)", padding: "18px", textAlign: "center",
              color: "var(--text-meta)", fontSize: "12px"
            }}>
              {language === "ar" ? "لا توجد مفاتيح محفوظة بعد. أضف مفتاح DeepSeek أو Groq أو OpenAI بالأسفل للبدء." : "No API key profiles saved yet. Add a DeepSeek, Groq, or OpenAI key below to begin."}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "240px", overflowY: "auto" }}>
              {savedApiKeys.map(k => {
                const isActive = activeApiKeyId === k.id;
                const maskedKey = k.key.length > 8
                  ? `${k.key.slice(0, 4)}••••••••${k.key.slice(-4)}`
                  : "••••••••";

                return (
                  <div
                    key={k.id}
                    style={{
                      background: isActive ? "var(--color-slate-raised)" : "var(--color-stone)",
                      border: isActive ? "2px solid var(--color-accent)" : "1px solid var(--border-soft)",
                      borderRadius: "var(--radius-btn)", padding: "12px 14px",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      transition: "all 0.2s"
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>
                          {k.label}
                        </span>
                        {isActive && (
                          <span style={{
                            fontSize: "10px", fontWeight: 700, background: "rgba(34, 197, 94, 0.15)",
                            color: "#22c55e", padding: "2px 6px", borderRadius: "10px",
                            border: "1px solid rgba(34, 197, 94, 0.3)"
                          }}>
                            🟢 {language === "ar" ? "مفعل حالياً" : "Active Working Key"}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-meta)", display: "flex", gap: "10px" }}>
                        <span>{k.provider.toUpperCase()} • {k.model}</span>
                        <span style={{ fontFamily: "monospace" }}>{maskedKey}</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                      {!isActive && (
                        <button
                          type="button"
                          onClick={() => selectSavedApiKey(k.id)}
                          className="tool-btn"
                          style={{ width: "auto", padding: "4px 10px", fontSize: "11px", height: "28px" }}
                        >
                          {language === "ar" ? "تفعيل المفتاح" : "Use This Key"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteSavedApiKey(k.id)}
                        style={{
                          background: "transparent", border: "none", color: "var(--text-meta)",
                          cursor: "pointer", fontSize: "14px", padding: "4px"
                        }}
                        title={language === "ar" ? "حذف المفتاح من المحفوظات" : "Delete key profile"}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 2: Add New API Key Form (Accordion / Toggle) */}
        {showAddForm && (
          <div style={{
            borderTop: "1px solid var(--border-soft)", paddingTop: "14px",
            display: "flex", flexDirection: "column", gap: "12px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-primary)" }}>
                + {language === "ar" ? "إضافة ملف مفتاح جديد" : "Add New Key Profile"}
              </span>
              {savedApiKeys.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  style={{ background: "transparent", border: "none", fontSize: "11px", color: "var(--text-meta)", cursor: "pointer" }}
                >
                  {language === "ar" ? "إلغاء الإضافة" : "Cancel"}
                </button>
              )}
            </div>

            <form onSubmit={handleSaveAndActivate} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", marginBottom: "4px", color: "var(--text-meta)", fontWeight: 600 }}>
                  {language === "ar" ? "اسم الملف الشخصي (اختياري):" : "Profile Name (Optional):"}
                </label>
                <input
                  type="text"
                  placeholder={language === "ar" ? "مثال: مفتاح DeepSeek الشخصي" : "e.g., My Groq High-Speed Profile"}
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  style={{
                    width: "100%", padding: "8px 12px", borderRadius: "var(--radius-sm)",
                    background: "var(--color-stone)", border: "1px solid var(--border-soft)",
                    color: "var(--text-primary)", outline: "none", fontSize: "13px"
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", marginBottom: "4px", color: "var(--text-meta)", fontWeight: 600 }}>
                    {language === "ar" ? "المزود (Provider):" : "Provider:"}
                  </label>
                  <select
                    value={provider}
                    onChange={(e) => handleProviderChange(e.target.value as any)}
                    style={{
                      width: "100%", padding: "8px 12px", borderRadius: "var(--radius-sm)",
                      background: "var(--color-stone)", border: "1px solid var(--border-soft)",
                      color: "var(--text-primary)", outline: "none", fontSize: "13px"
                    }}
                  >
                    <option value="deepseek">DeepSeek</option>
                    <option value="groq">Groq</option>
                    <option value="openai">OpenAI Compatible</option>
                    <option value="gemini">Google Gemini</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", marginBottom: "4px", color: "var(--text-meta)", fontWeight: 600 }}>
                    {language === "ar" ? "النموذج (Model):" : "Model:"}
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder={language === "ar" ? "اسم النموذج (مثال: gemini-flash-latest / deepseek-chat)" : "Model Name (e.g. gemini-flash-latest / deepseek-chat)"}
                    style={{
                      width: "100%", padding: "8px 12px", borderRadius: "var(--radius-sm)",
                      background: "var(--color-stone)", border: "1px solid var(--border-soft)",
                      color: "var(--text-primary)", outline: "none", fontSize: "13px"
                    }}
                  />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px", alignItems: "center" }}>
                    <span style={{ fontSize: "10px", color: "var(--text-meta)", fontWeight: 600 }}>
                      {language === "ar" ? "مقترحات:" : "Suggestions:"}
                    </span>
                    {modelsForProvider(provider).map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setModel(m)}
                        style={{
                          background: model === m ? "var(--color-accent)" : "var(--color-stone)",
                          color: model === m ? "var(--color-accent-contrast)" : "var(--text-primary)",
                          border: "1px solid var(--border-soft)", borderRadius: "var(--radius-full)",
                          padding: "2px 8px", fontSize: "10px", cursor: "pointer", fontFamily: "monospace"
                        }}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", marginBottom: "4px", color: "var(--text-meta)", fontWeight: 600 }}>
                  API Key (`sk-...` / `gsk_...`):
                </label>
                <input
                  type="password"
                  placeholder={language === "ar" ? "أدخل سلسلة المفتاح هنا..." : "Enter secret key string..."}
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  style={{
                    width: "100%", padding: "8px 12px", borderRadius: "var(--radius-sm)",
                    background: "var(--color-stone)", border: "1px solid var(--border-med)",
                    color: "var(--text-primary)", outline: "none", fontSize: "13px",
                    fontFamily: "monospace"
                  }}
                  required
                />
              </div>

              {/* Test Connection Button */}
              <div>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting || !keyInput.trim()}
                  style={{
                    width: "100%", padding: "8px", borderRadius: "var(--radius-sm)",
                    background: "var(--color-stone)", border: "1px solid var(--border-soft)",
                    color: "var(--text-primary)", fontWeight: 600, fontSize: "12px",
                    cursor: isTesting ? "wait" : "pointer", display: "flex",
                    alignItems: "center", justifyContent: "center", gap: "6px"
                  }}
                >
                  {isTesting ? "⚡ Verifying live API connection..." : (language === "ar" ? "⚡ فحص واختبار الاتصال بالمفتاح والنموذج" : "⚡ Test API & Model Connection")}
                </button>
                {testResult && (
                  <div style={{
                    marginTop: "8px", padding: "8px 12px", borderRadius: "var(--radius-sm)", fontSize: "12px",
                    background: testResult.status === "valid" ? "rgba(34, 197, 94, 0.12)" : "rgba(255, 80, 80, 0.15)",
                    color: testResult.status === "valid" ? "#22c55e" : "#FF5E5E",
                    border: testResult.status === "valid" ? "1px solid #22c55e" : "1px solid #FF5E5E"
                  }}>
                    {testResult.status === "valid" ? "✅ " : "❌ "}{testResult.message}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "4px" }}>
                {savedApiKeys.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="tool-btn"
                    style={{ width: "auto", padding: "6px 14px", height: "32px", fontSize: "12px" }}
                  >
                    {t("cancel")}
                  </button>
                )}
                <button
                  type="submit"
                  className="send-btn"
                  style={{ padding: "6px 18px", height: "32px", fontSize: "12px" }}
                >
                  + {t("save")}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Footer actions */}
        {!showAddForm && (
          <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--border-soft)", paddingTop: "12px" }}>
            <button
              type="button"
              onClick={onClose}
              className="send-btn"
              style={{ padding: "6px 20px", height: "34px" }}
            >
              {language === "ar" ? "إغلاق" : "Close"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
