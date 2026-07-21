"use client";

/**
 * WHY: GPR Grounded Knowledge Chunks & Document View (`FilesView.tsx`).
 * Per Ahmed's exact redesign requirement (`GAP-GPR-16`), this component displays our scrollable,
 * minimal monochrome list of rich semantic chunks (`Chunk cards`) along with document scope control.
 */
import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { CitationDrawer } from "./CitationDrawer";

interface ChunkCardDTO {
  id: string;
  label: string;
  group: string;
  val: number;
  content_preview: string;
}

export const FilesView: React.FC = () => {
  const { documents, selectedDocIds, setSelectedDocIds, language, t } = useApp();
  const [chunks, setChunks] = useState<ChunkCardDTO[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCiteCode, setActiveCiteCode] = useState<string | null>(null);
  const [activeCiteTitle, setActiveCiteTitle] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchChunks = async () => {
      setIsLoading(true);
      try {
        const docParam = selectedDocIds.length > 0 ? `?document_id=${selectedDocIds[0]}` : "";
        const res = await fetch(`/api/v1/documents/graph${docParam}`);
        if (res.ok) {
          const data = await res.json();
          setChunks(data.nodes || []);
        }
      } catch (e) {
        console.error("Failed to load chunk cards:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchChunks();
  }, [selectedDocIds]);

  const toggleSelectDoc = (docId: string) => {
    if (selectedDocIds.includes(docId)) {
      setSelectedDocIds(prev => prev.filter(id => id !== docId));
    } else {
      setSelectedDocIds([docId]);
    }
  };

  const filteredChunks = chunks.filter(c =>
    c.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.content_preview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      style={{
        height: "100%",
        overflowY: "auto",
        padding: "14px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        position: "relative"
      }}
    >
      {/* Top Document Scope Card */}
      {documents.map(doc => {
        const isSelected = selectedDocIds.includes(doc.id);
        return (
          <div
            key={doc.id}
            onClick={() => toggleSelectDoc(doc.id)}
            className={`gpr-card ${isSelected ? "selected" : ""}`}
            style={{
              background: isSelected ? "var(--color-slate-raised)" : "var(--color-stone)",
              border: isSelected ? "2px solid var(--color-accent)" : "1px solid var(--border-soft)",
              padding: "12px 14px",
              cursor: "pointer",
              flexShrink: 0
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <span style={{ fontWeight: 700, fontSize: "13px", color: "var(--text-primary)" }}>
                📘 {doc.title}
              </span>
              <span style={{
                fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "var(--radius-xs)",
                background: "var(--color-stone)", color: "var(--text-meta)"
              }}>
                {isSelected ? (language === "ar" ? "نطاق مفعل ✅" : "Scope Active ✅") : (language === "ar" ? "انقر للتقييد" : "Click to Scope")}
              </span>
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-meta)" }}>
              {language === "ar" ? `دليل معتمد يحتوي على ${doc.chunk_count} مقطع دلالي` : `Approved guide with ${doc.chunk_count} rich semantic cards`}
            </div>
          </div>
        );
      })}

      {/* Chunk Search Filter */}
      <div className="conversation-search" style={{ height: "34px" }}>
        <svg viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0z"/>
        </svg>
        <input
          type="text"
          placeholder={language === "ar" ? "البحث في بطاقات الموارد البشرية..." : "Search semantic chunk cards..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Chunks List Label */}
      <div className="chat-list-label" style={{ padding: "0 2px" }}>
        <span>{language === "ar" ? `بطاقات المعرفة المتاحة (${filteredChunks.length})` : `Available Semantic Cards (${filteredChunks.length})`}</span>
      </div>

      {/* Scrollable Chunk Cards List */}
      <div className="chat-list scrollable" style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px", paddingBottom: "10px" }}>
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "20px", color: "var(--text-meta)", fontSize: "12px" }}>
            {language === "ar" ? "جاري تحميل بطاقات المعرفة..." : "Loading semantic cards..."}
          </div>
        ) : filteredChunks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px", color: "var(--text-meta)", fontSize: "12px" }}>
            {language === "ar" ? "لا توجد نتائج مطابقة للبحث." : "No matching semantic cards found."}
          </div>
        ) : (
          filteredChunks.map((chunk) => {
            const isRole = chunk.group === "text" || chunk.label.includes("وصف وظيفي");
            const isKpi = chunk.group === "table" || chunk.label.includes("مؤشرات");
            const isEsc = chunk.group === "escalation" || chunk.label.includes("تصعيد");

            return (
              <div
                key={chunk.id}
                className="gpr-card"
                onClick={() => {
                  setActiveCiteCode(chunk.id);
                  setActiveCiteTitle(chunk.label);
                }}
                style={{
                  padding: "12px 14px",
                  background: "var(--color-stone)",
                  border: "1px solid var(--border-soft)",
                  borderRadius: "var(--radius-btn)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-meta)", background: "var(--color-slate)", padding: "2px 6px", borderRadius: "4px" }}>
                    {chunk.id} • {isRole ? "JOB ROLE" : isKpi ? "KPI TABLE" : isEsc ? "ESCALATION" : "POLICY CHAPTER"}
                  </span>
                  <span
                    style={{ display: "flex", alignItems: "center", color: "var(--text-meta)", opacity: 0.8 }}
                    title={language === "ar" ? "فحص البطاقة وقراءة النص الكامل" : "Inspect full card text"}
                  >
                    <svg viewBox="0 0 24 24" style={{ width: "15px", height: "15px", stroke: "currentColor", strokeWidth: 2, fill: "none" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </span>
                </div>

                <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", lineClamp: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {chunk.label}
                </div>

                <div style={{ fontSize: "11px", color: "var(--text-body)", lineClamp: 2, overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.5, opacity: 0.85 }}>
                  {chunk.content_preview}
                </div>
              </div>
            );
          })
        )}
      </div>

      <CitationDrawer
        isOpen={!!activeCiteCode}
        citationCode={activeCiteCode}
        citationTitle={activeCiteTitle}
        onClose={() => setActiveCiteCode(null)}
      />
    </div>
  );
};
