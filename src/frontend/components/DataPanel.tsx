"use client";

/**
 * WHY: Right Panel Data View (`DataPanel.tsx`) — exact styling from `index (31).html`.
 * Per Ahmed's exact requirement (`GAP-GPR-20`), the `Documents` tab is completely removed.
 * This panel now strictly hosts our live `ObsidianGraphView` (force-directed canvas with search & node cards).
 */
import React from "react";
import { useApp } from "../context/AppContext";
import { ObsidianGraphView } from "./ObsidianGraphView";

export const DataPanel: React.FC = () => {
  return (
    <div style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative" }}>
      <ObsidianGraphView />
    </div>
  );
};
