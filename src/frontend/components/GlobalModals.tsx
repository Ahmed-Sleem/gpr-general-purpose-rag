"use client";

/**
 * WHY: Global Modals Wrapper (`GlobalModals.tsx`).
 * Renders `SettingsModal` and `CitationDrawer` at the absolute root outside `.main-window`.
 * This guarantees 100% immunity to CSS Grid layout traps, `pointer-events: none`, or stacking freeze bugs (`Rule 21`).
 */
import React from "react";
import { useApp } from "../context/AppContext";
import { SettingsModal } from "./SettingsModal";
import { CitationDrawer } from "./CitationDrawer";

export const GlobalModals: React.FC = () => {
  const { isSettingsOpen, setIsSettingsOpen, inspectingNodeId, setInspectingNodeId, inspectingNode, setInspectingNode } = useApp();

  return (
    <>
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      <CitationDrawer
        isOpen={!!inspectingNodeId || !!inspectingNode}
        citationCode={inspectingNodeId || (inspectingNode ? inspectingNode.id : null)}
        citationTitle={inspectingNode ? inspectingNode.label : null}
        onClose={() => {
          setInspectingNodeId(null);
          setInspectingNode(null);
        }}
      />
    </>
  );
};
