"use client";

import React, { useRef, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useApp } from "../context/AppContext";

// Dynamically import `react-force-graph-2d` with SSR disabled (`window` canvas requirement)
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

interface GraphNode {
  id: string;
  label: string;
  group: string;
  val: number;
  content_preview: string;
  page_number?: number;
  x?: number;
  y?: number;
}

interface GraphLink {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  label: string;
  value: number;
}

export const ObsidianGraphView: React.FC = () => {
  const { selectedDocIds, activeGraphNodeIds, language } = useApp();
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[] }>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const fgRef = useRef<any>(null);

  const loadGraph = async () => {
    try {
      const docParam = selectedDocIds.length > 0 ? `?document_id=${selectedDocIds[0]}` : "";
      const res = await fetch(`/api/v1/documents/graph${docParam}`);
      if (res.ok) {
        const data = await res.json();
        setGraphData(data);
      }
    } catch (e) {
      console.error("Failed to load Obsidian graph:", e);
    }
  };

  useEffect(() => {
    loadGraph();
  }, [selectedDocIds]);

  // Live SSE camera panning & node highlighting when ReAct agent executes retrieval
  useEffect(() => {
    if (fgRef.current && activeGraphNodeIds.length > 0 && graphData.nodes.length > 0) {
      const targetNodes = graphData.nodes.filter(n => activeGraphNodeIds.includes(n.id));
      if (targetNodes.length === 1 && targetNodes[0].x !== undefined && targetNodes[0].y !== undefined) {
        fgRef.current.centerAt(targetNodes[0].x, targetNodes[0].y, 1000);
        fgRef.current.zoom(3, 1000);
      } else if (targetNodes.length > 1) {
        fgRef.current.zoomToFit(1000, 30, (node: any) => activeGraphNodeIds.includes(node.id));
      }
    }
  }, [activeGraphNodeIds, graphData]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", background: "var(--bg-canvas)" }}>
      {/* Top Controls Overlay */}
      <div style={{
        position: "absolute", top: 10, left: 10, right: 10, zIndex: 10,
        display: "flex", justifyContent: "space-between", pointerEvents: "none"
      }}>
        <div style={{
          background: "var(--bg-surface)", padding: "4px 10px", borderRadius: "6px",
          border: "1px solid var(--border)", fontSize: "11px", color: "var(--text-secondary)"
        }}>
          {language === "ar" ? `📊 خريطة الترابط (${graphData.nodes.length} عقدة | ${graphData.links.length} رابط)` : `📊 Network Graph (${graphData.nodes.length} nodes | ${graphData.links.length} edges)`}
        </div>
        <button
          onClick={() => fgRef.current?.zoomToFit(800, 20)}
          style={{
            pointerEvents: "auto", background: "var(--bg-card)", border: "1px solid var(--border)",
            color: "var(--text-primary)", padding: "4px 10px", borderRadius: "6px", fontSize: "11px", cursor: "pointer"
          }}
        >
          🎯 {language === "ar" ? "إعادة ضبط الكاميرا" : "Fit Camera"}
        </button>
      </div>

      {/* Force Graph Canvas */}
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        nodeLabel="label"
        nodeColor={(node: any) => activeGraphNodeIds.includes(node.id) ? "#9BE36B" : (node.group === "heading" ? "#5EB1FF" : "#888888")}
        nodeRelSize={4}
        linkDirectionalParticles={(link: any) => activeGraphNodeIds.includes(typeof link.source === "object" ? link.source.id : link.source) ? 4 : 0}
        linkDirectionalParticleSpeed={0.008}
        onNodeClick={(node: any) => setSelectedNode(node)}
        nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
          const isActive = activeGraphNodeIds.includes(node.id);
          const size = isActive ? 8 : (node.group === "heading" ? 5 : 3);

          // Draw Glowing Ring if active
          if (isActive) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, size + 4, 0, 2 * Math.PI);
            ctx.fillStyle = "rgba(155, 227, 107, 0.35)";
            ctx.fill();
          }

          // Draw Node Circle
          ctx.beginPath();
          ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
          ctx.fillStyle = isActive ? "#9BE36B" : (node.group === "heading" ? "#5EB1FF" : "#777777");
          ctx.fill();

          // Draw Label when zoomed in or active
          if (globalScale > 1.8 || isActive) {
            const label = node.label || "";
            const fontSize = Math.max(10 / globalScale, 2.5);
            ctx.font = `${isActive ? "bold " : ""}${fontSize}px sans-serif`;
            ctx.fillStyle = isActive ? "#9BE36B" : "#DDDDDD";
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillText(label, node.x, node.y + size + 2);
          }
        }}
      />

      {/* Node Detail Inspection Modal */}
      {selectedNode && (
        <div style={{
          position: "absolute", bottom: 16, left: 16, right: 16, zIndex: 20,
          background: "var(--bg-surface)", border: "1px solid var(--border-focus)",
          borderRadius: "8px", padding: "14px", boxShadow: "0 10px 30px rgba(0,0,0,0.6)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontWeight: 600, color: "var(--accent-green)", fontSize: "13px" }}>
              📍 {selectedNode.label} (Group: {selectedNode.group})
            </span>
            <button
              onClick={() => setSelectedNode(null)}
              style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
            >
              ✕
            </button>
          </div>
          <p style={{ fontSize: "12px", lineHeight: 1.5, color: "var(--text-primary)", maxHeight: "120px", overflowY: "auto", background: "var(--bg-canvas)", padding: "8px", borderRadius: "4px" }}>
            {selectedNode.content_preview}
          </p>
        </div>
      )}
    </div>
  );
};
