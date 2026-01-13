import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });

const mountNode = document.getElementById("root");

if (!mountNode) {
  throw new Error("Root element #root not found");
}

try {
  createRoot(mountNode).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (err) {
  console.error("App bootstrap failed:", err);
  const message =
    err instanceof Error ? err.stack ?? err.message : typeof err === "string" ? err : String(err);

  mountNode.innerHTML = `
    <main style="padding:16px;font-family:system-ui">
      <h1 style="font-size:18px;margin:0 0 8px">App failed to start</h1>
      <pre style="white-space:pre-wrap;word-break:break-word;margin:0">${escapeHtml(message)}</pre>
    </main>
  `;
}

