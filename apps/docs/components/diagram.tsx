"use client";
import { useEffect, useId, useState } from "react";
declare global { interface Window { mermaid?: { initialize(options: Record<string, unknown>): void; render(id: string, source: string): Promise<{ svg: string }> } } }
let mermaidLoad: Promise<void> | null = null;
function ensureMermaid(): Promise<void> {
  if (window.mermaid) return Promise.resolve();
  if (!mermaidLoad) mermaidLoad = new Promise((resolve, reject) => { const script = document.createElement("script"); script.src = "/mermaid.min.js"; script.async = true; script.onload = () => resolve(); script.onerror = () => reject(new Error("Mermaid script failed to load")); document.head.appendChild(script); });
  return mermaidLoad;
}
export function Diagram({ source }: { source: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { let active = true; ensureMermaid().then(async () => { if (!window.mermaid) throw new Error("Mermaid unavailable"); window.mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral" }); const result = await window.mermaid.render(`erd${id}`, source); if (active) setSvg(result.svg); }).catch(() => { if (active) setError("Diagram could not render. View Mermaid source below."); }); return () => { active = false; }; }, [id, source]);
  return <div><div className="diagram">{svg ? <div dangerouslySetInnerHTML={{ __html: svg }} /> : <p className="muted">{error || "Rendering diagram…"}</p>}</div><details><summary>Mermaid source</summary><pre>{source}</pre></details></div>;
}
export function DiagramDisclosure({ label, source }: { label: string; source: string }) {
  const [open, setOpen] = useState(false);
  return <details onToggle={event => setOpen(event.currentTarget.open)}><summary>{label}</summary>{open && <Diagram source={source} />}</details>;
}
