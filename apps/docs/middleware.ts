import { NextRequest, NextResponse } from "next/server";
export function middleware(request: NextRequest) {
  const password = process.env.DOCS_SHARED_PASSWORD;
  if (!password) return NextResponse.next();
  const header = request.headers.get("authorization") ?? "";
  let supplied = "";
  if (header.startsWith("Basic ")) { try { supplied = atob(header.slice(6)).split(":").slice(1).join(":"); } catch { /* invalid header */ } }
  const encoder = new TextEncoder();
  const a = encoder.encode(supplied); const b = encoder.encode(password);
  let mismatch = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) mismatch |= (a[i] ?? 0) ^ (b[i] ?? 0);
  if (mismatch === 0) return NextResponse.next();
  return new NextResponse("Authentication required", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="35mm Docs"', "Cache-Control": "no-store" } });
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
