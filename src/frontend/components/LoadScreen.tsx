"use client";

/**
 * WHY: Load Screen (`LoadScreen.tsx`).
 * Uses shared theme tokens so the loading state matches the final persisted GUI mode.
 */
import React from "react";

export const LoadScreen: React.FC = () => {
  return (
    <div className="load-screen" role="status" aria-live="polite" aria-label="Loading GPR workspace">
      <div className="load-screen-title">GPR</div>
      <div className="load-screen-subtitle">Loading Workspace...</div>
    </div>
  );
};
