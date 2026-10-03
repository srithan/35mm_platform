import spec from "../../openapi/spec.json";
export function GET() { return Response.json(spec, { headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" } }); }
