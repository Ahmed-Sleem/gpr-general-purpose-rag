"use client";

import React, { useState, useRef } from "react";
import { useApp, DocumentDTO } from "../context/AppContext";

export const FilesView: React.FC = () => {
  const { documents, fetchDocuments, selectedDocIds, setSelectedDocIds, language, t } = useApp();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " "));

    try {
      const res = await fetch("/api/v1/documents/upload", {
        method: "POST",
        body: formData
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(errData.detail || "Upload failed");
      }
      await fetchDocuments();
    } catch (e: any) {
      setUploadError(e.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(language === "ar" ? "هل أنت متأكد من حذف هذا المستند وكل فهرسته؟" : "Are you sure you want to delete this document?")) return;

    try {
      await fetch(`/api/v1/documents/${docId}`, { method: "DELETE" });
      setSelectedDocIds(prev => prev.filter(id => id !== docId));
      await fetchDocuments();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const toggleSelectDoc = (docId: string) => {
    if (selectedDocIds.includes(docId)) {
      setSelectedDocIds(prev => prev.filter(id => id !== docId));
    } else {
      setSelectedDocIds([docId]); // single scope or multi scope
    }
  };

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Upload Dropzone */}
      <div
        onClick={() => !isUploading && fileInputRef.current?.click()}
        style={{
          border: "2px dashed var(--border)", borderRadius: "10px", padding: "20px 14px",
          textAlign: "center", cursor: isUploading ? "wait" : "pointer",
          background: isUploading ? "var(--bg-card)" : "rgba(155, 227, 107, 0.04)",
          transition: "all 0.2s"
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt,.md"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleUpload(e.target.files[0]);
            }
          }}
          style={{ display: "none" }}
        />
        <div style={{ fontSize: "24px", marginBottom: "8px" }}>📤</div>
        <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
          {isUploading ? (language === "ar" ? "جاري الرفع والفهرسة الهيكلية..." : "Uploading & indexing structural blocks...") : t("upload_dropzone")}
        </div>
        {uploadError && (
          <div style={{ fontSize: "12px", color: "#FF5E5E", marginTop: "6px" }}>
            ❌ {uploadError}
          </div>
        )}
      </div>

      {/* Scope Hint */}
      <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 600 }}>
        📌 {t("select_doc_hint")} {selectedDocIds.length > 0 ? `(${selectedDocIds.length} scoped)` : (language === "ar" ? "(الجميع مفعل)" : "(All docs active)")}
      </div>

      {/* Persistent Documents List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {documents.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)", fontSize: "12px" }}>
            {t("no_docs")}
          </div>
        ) : (
          documents.map(doc => {
            const isSelected = selectedDocIds.includes(doc.id);
            return (
              <div
                key={doc.id}
                onClick={() => toggleSelectDoc(doc.id)}
                className={`cyrkil-card ${isSelected ? "selected" : ""}`}
                style={{ position: "relative" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                  <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-primary)", maxWidth: "80%" }}>
                    📄 {doc.title}
                  </div>
                  <button
                    onClick={(e) => handleDelete(doc.id, e)}
                    style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "14px" }}
                    title="Delete document"
                  >
                    🗑️
                  </button>
                </div>

                <div style={{ fontSize: "11px", color: "var(--text-secondary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{doc.file_type.toUpperCase()} • {(doc.file_size / 1024).toFixed(1)} KB</span>
                  <span style={{
                    padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: 600,
                    background: doc.status === "ready" ? "var(--accent-green-bg)" : "rgba(255, 180, 50, 0.15)",
                    color: doc.status === "ready" ? "var(--accent-green)" : "#FFB432"
                  }}>
                    {doc.status === "ready" ? `${doc.chunk_count} ${language === "ar" ? "مقطع" : "chunks"}` : doc.status}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
