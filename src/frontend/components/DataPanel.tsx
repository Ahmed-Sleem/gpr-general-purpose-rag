"use client";

import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { FilesView } from "./FilesView";
import { ObsidianGraphView } from "./ObsidianGraphView";

export const DataPanel: React.FC = () => {
  const { t } = useApp();
  const [activeTab, setActiveTab] = useState<"files" | "graph">("files");

  return (
    <div className="glass-panel" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Top Tab Bar Toggle */}
      <div style={{
        display: "flex", borderBottom: "1px solid var(--border)",
        background: "var(--bg-canvas)", padding: "4px"
      }}>
        <button
          onClick={() => setActiveTab("files")}
          style={{
            flex: 1, padding: "8px 10px", border: "none", borderRadius: "6px",
            background: activeTab === "files" ? "var(--bg-card)" : "transparent",
            color: activeTab === "files" ? "var(--accent-green)" : "var(--text-secondary)",
            fontWeight: activeTab === "files" ? 600 : 400, fontSize: "12px",
            cursor: "pointer", transition: "all 0.2s"
          }}
        >
          {t("files_tab")}
        </button>
        <button
          onClick={() => setActiveTab("graph")}
          style={{
            flex: 1, padding: "8px 10px", border: "none", borderRadius: "6px",
            background: activeTab === "graph" ? "var(--bg-card)" : "transparent",
            color: activeTab === "graph" ? "var(--accent-green)" : "var(--text-secondary)",
            fontWeight: activeTab === "graph" ? 600 : 400, fontSize: "12px",
            cursor: "pointer", transition: "all 0.2s"
          }}
        >
          {t("graph_tab")}
        </button>
      </div>

      {/* Tab Body */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {activeTab === "files" ? <FilesView /> : <ObsidianGraphView />}
      </div>
    </div>
  );
};
