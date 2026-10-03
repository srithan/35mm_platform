"use client";
import { useEffect, useMemo, useState } from "react";
import { ApiReferenceReact } from "@scalar/api-reference-react";
import spec from "../openapi/spec.json";
const STORAGE_KEY = "35mm-docs-api-base-url";
const fallback = "http://localhost:4000";
function clean(value: string) { try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? url.origin + url.pathname.replace(/\/$/, "") : null; } catch { return null; } }
export function Reference() {
  const [draft, setDraft] = useState(fallback);
  const [base, setBase] = useState(fallback);
  const [error, setError] = useState("");
  useEffect(() => { const value = localStorage.getItem(STORAGE_KEY); const valid = value && clean(value); if (valid) { setDraft(valid); setBase(valid); } }, []);
  const content = useMemo(() => ({ ...spec, servers: [{ url: base, description: "Selected API environment" }] }), [base]);
  return <><div className="reference-config"><label htmlFor="api-base-url">Try it base URL</label><input id="api-base-url" type="url" value={draft} onChange={event => setDraft(event.target.value)} placeholder="https://api.example.internal" /><button onClick={() => { const value = clean(draft); if (!value) { setError("Enter an http or https URL."); return; } localStorage.setItem(STORAGE_KEY, value); setBase(value); setError(""); }}>Use URL</button><span className="muted">Saved in this browser. Bearer input available in Scalar auth panel.</span>{error && <span role="alert">{error}</span>}</div><div className="notice">Source-derived reference: entries marked “needs confirmation” may omit nested response fields, exact error triggers, or examples. See <a href="/DIVERGENCES.md">DIVERGENCES.md</a> in repository.</div><ApiReferenceReact key={base} configuration={{ content, layout: "modern", theme: "default", defaultHttpClient: { targetKey: "shell", clientKey: "curl" }, hiddenClients: [], persistAuth: false, telemetry: false, showSidebar: true, withDefaultFonts: false }} /></>;
}
