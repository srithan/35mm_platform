import fs from "node:fs";
import path from "node:path";
export function GET() { return new Response(fs.readFileSync(path.join(process.cwd(), "DIVERGENCES.md"), "utf8"), { headers: { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" } }); }
