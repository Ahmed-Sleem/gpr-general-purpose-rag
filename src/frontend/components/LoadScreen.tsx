"use client";

/**
 * WHY: Load Screen (`LoadScreen.tsx`) — prevents Arabic-then-English glitch.
 * Shows a clean, minimal loading state until `AppContext` finishes boot (`isReady`).
 */
import React from "react";

export const LoadScreen: React.FC = () => {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        background: "#fafafa",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        fontFamily: "'Inter', system-ui, sans-serif", transition: "opacity 0.35s ease"
      }}
    >
      <div style={{ fontWeight: 900, fontSize: "28px", letterSpacing: "-0.04em", color: "#1a1a1a", marginBottom: "12px" }}>
        GPR
      </div>
      <div style={{ fontSize: "12px", color: "#888", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>
        Loading Workspace...
      </div>
    </div>
  );
};
