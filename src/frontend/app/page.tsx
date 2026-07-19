"use client";

import React, { useRef } from "react";
import { Header } from "../components/Header";
import { LeftPanel } from "../components/LeftPanel";
import { ChatPanel } from "../components/ChatPanel";
import { DataPanel } from "../components/DataPanel";
import { useApp } from "../context/AppContext";

export default function Home() {
  const { language } = useApp();
  const mainRef = useRef<HTMLDivElement>(null);

  const startResize = (targetPanel: "left" | "data", e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const isRtl = language === "ar";
    
    const startLeftWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--left-width") || "280", 10);
    const startDataWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--data-width") || "400", 10);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      if (targetPanel === "left") {
        const newWidth = isRtl ? startLeftWidth - deltaX : startLeftWidth + deltaX;
        if (newWidth >= 200 && newWidth <= 500) {
          document.documentElement.style.setProperty("--left-width", `${newWidth}px`);
        }
      } else if (targetPanel === "data") {
        const newWidth = isRtl ? startDataWidth + deltaX : startDataWidth - deltaX;
        if (newWidth >= 280 && newWidth <= 750) {
          document.documentElement.style.setProperty("--data-width", `${newWidth}px`);
        }
      }
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw", overflow: "hidden" }}>
      <Header />
      
      <main ref={mainRef} className="main-layout">
        {/* Panel 1 (Left in LTR / Right in RTL) */}
        <LeftPanel />

        {/* Resizer 1 */}
        <div
          className="resize-handle"
          onMouseDown={(e) => startResize(language === "ar" ? "data" : "left", e)}
          title="Drag to resize panel"
        />

        {/* Panel 2 (Center Chat Composer) */}
        <ChatPanel />

        {/* Resizer 2 */}
        <div
          className="resize-handle"
          onMouseDown={(e) => startResize(language === "ar" ? "left" : "data", e)}
          title="Drag to resize data panel"
        />

        {/* Panel 3 (Data Panel: Files & Obsidian Graph View) */}
        <DataPanel />
      </main>
    </div>
  );
}
