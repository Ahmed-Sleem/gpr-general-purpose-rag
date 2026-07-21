"use client";

/**
 * WHY: Sleek Centered Citation & Chunk Inspection Modal (`CitationDrawer.tsx`).
 * Per Ahmed's exact feedback (`GAP-GPR-17`), replaces fixed side-drawer positioning
 * (`which overlapped and cropped over CSS Grid panels`) with a centered frosted modal (`var(--color-paper)`, `var(--radius-xl)`).
 * Fetches and renders the exact full text and metadata (`page_number`, `group`) of any clicked chunk or citation.
 */
import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
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
  const { language, inspectingNode } = useApp();
  const [chunkData, setChunkData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !citationCode) {
      setChunkData(null);
      return;
    }

    if (inspectingNode) {
      setChunkData(inspectingNode);
      setLoading(false);
      return;
    }

    const fetchChunkDetails = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/v1/documents/graph");
        if (res.ok) {
          const data = await res.json();
          const nodes = data.nodes || [];
          const matched = nodes.find((n: any) =>
            n.id === citationCode ||
            n.label.toLowerCase().includes(citationCode.toLowerCase()) ||
            n.id.toLowerCase().includes(citationCode.toLowerCase()) ||
            (citationTitle && n.label.toLowerCase() === citationTitle.toLowerCase())
          );
          setChunkData(matched || null);
        }
      } catch (e) {
        console.error("Error loading chunk details:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchChunkDetails();
  }, [isOpen, citationCode, citationTitle]);

  if (!isOpen || !citationCode) return null;

  const groupBadge = chunkData?.group ? chunkData.group.toUpperCase() : "SEMANTIC CHUNK";
  const fullText = chunkData?.content || chunkData?.content_preview || citationTitle || (language === "ar" ? "نص المقطع المفهرس برقم القسم المعتمد في الدليل." : "Indexed chunk content under approved manual section.");

  return ReactDOM.createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0, 0, 0, 0.78)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
        pointerEvents: "auto"
      }}
    >
      <div style={{
        background: "var(--color-paper)", border: "1px solid var(--border-med)",
        borderRadius: "var(--radius-xl)", padding: "26px", width: "660px", maxWidth: "94vw",
        maxHeight: "86vh", display: "flex", flexDirection: "column", gap: "16px",
        boxShadow: "var(--shadow-elevated)"
      }}>
        {/* Header Bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-soft)", paddingBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{
              background: "var(--color-accent)", color: "var(--color-accent-contrast)",
              padding: "4px 10px", borderRadius: "var(--radius-xs)", fontWeight: 700, fontSize: "12px"
            }}>
              {citationCode}
            </span>
            <span style={{
              background: "var(--color-slate-raised)", color: "var(--text-meta)",
              padding: "3px 8px", borderRadius: "var(--radius-xs)", fontWeight: 700, fontSize: "11px"
            }}>
              {groupBadge}
            </span>
            {chunkData?.page_number && (
              <span style={{ fontSize: "11px", color: "var(--text-meta)", fontWeight: 600 }}>
                📄 {language === "ar" ? `صفحة ${chunkData.page_number}` : `Page ${chunkData.page_number}`}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "var(--text-meta)", fontSize: "20px", cursor: "pointer", padding: "2px 6px" }}
          >
            ✕
          </button>
        </div>

        {/* Title */}
        <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.4 }}>
          {chunkData?.label || citationTitle || (language === "ar" ? "بطاقة المعرفة المستخرجة" : "Extracted Knowledge Card")}
        </h3>

        {/* Full Text Body */}
        <div className="scrollable" style={{
          flex: 1, overflowY: "auto", background: "var(--color-stone)", border: "1px solid var(--border-soft)",
          borderRadius: "var(--radius-md)", padding: "18px", fontSize: "13px", lineHeight: 1.8, color: "var(--text-body)"
        }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "30px", color: "var(--text-meta)" }}>
              ⏳ {language === "ar" ? "جاري استدعاء النص الكامل للبطاقة من قاعدة بيانات GPR..." : "Loading complete card text from GPR database..."}
            </div>
          ) : (
            <div style={{ whiteSpace: "pre-wrap" }}>
              {fullText}
            </div>
          )}
        </div>

        {/* Footer Actions (`SVG-only button`) */}
        <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--border-soft)", paddingTop: "12px" }}>
          <button
            onClick={onClose}
            className="send-btn"
            title={language === "ar" ? "إغلاق معاينة البطاقة (Close Card)" : "Close Card Excerpt"}
            style={{ padding: "6px 14px", height: "34px", display: "flex", alignItems: "center", gap: "6px" }}
          >
            <svg viewBox="0 0 24 24" style={{ width: "16px", height: "16px" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
            <span>{language === "ar" ? "حسناً" : "Done"}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) as unknown as React.ReactElement;
};
