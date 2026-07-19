import type { Metadata } from "next";
import { AppProvider } from "../context/AppContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cyrkil Universal Knowledge Workspace — RAG Chat & Obsidian Graph",
  description: "Bilingual Arabic/English internal staff knowledge workspace with relational RAG and live Obsidian Graph View.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
