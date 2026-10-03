import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import * as validators from "@35mm/validators";
import * as dbSchema from "@35mm/db/schema";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import { is } from "drizzle-orm";
import { createSchema } from "zod-openapi";
import YAML from "yaml";
import { buildTypeSchemas } from "./typeSchemas.js";

const root = path.resolve(import.meta.dirname, "../../..");
const output = path.join(root, "apps/docs");
const api = path.join(root, "apps/api/src");
const read = (file: string) => fs.readFileSync(file, "utf8");
const write = (name: string, value: unknown) => fs.writeFileSync(path.join(output, name), JSON.stringify(value, null, 2) + "\n");
const source = (file: string) => ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const text = (node: ts.Node, sf: ts.SourceFile) => node.getText(sf);
const descendants = (node: ts.Node, fn: (node: ts.Node) => void) => { fn(node); ts.forEachChild(node, child => descendants(child, fn)); };
const lit = (node: ts.Node | undefined): string | undefined => node && ts.isStringLiteral(node) ? node.text : undefined;
const camel = (value: string) => value.replace(/[-_](.)/g, (_, c) => c.toUpperCase());
const pathKey = (value: string) => value.replace(/:([A-Za-z][\w]*)/g, "{$1}").replace(/\/+/g, "/").replace(/\/$/, "") || "/";

const mountSource = source(path.join(api, "index.ts"));
const mounts = new Map<string, string>();
descendants(mountSource, node => {
  if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression) || node.expression.name.text !== "route") return;
  const prefix = lit(node.arguments[0]);
  const routeName = node.arguments[1] && text(node.arguments[1], mountSource);
  if (prefix && routeName) mounts.set(routeName, prefix);
});
const routeFiles = ["routes/health.ts", "routes/poster-proxy.ts", "routes/suggestions.ts", ...fs.readdirSync(path.join(api, "modules")).map(name => `modules/${name}/routes.ts`).filter(name => fs.existsSync(path.join(api, name)))];
const schemaEntries = Object.entries(validators).filter(([_, value]) => !!value && typeof value === "object" && "safeParse" in value);
const validatorNames = new Set(schemaEntries.map(([name]) => name));
const componentSchemas: Record<string, unknown> = {};
const schemaProblems: string[] = [];
const sharedTypes = buildTypeSchemas(root);
const catalogServiceFile = source(path.join(api, "modules/catalog/readService.ts"));
const catalogReturnTypes = new Map<string, string>();
for (const statement of catalogServiceFile.statements) if (ts.isFunctionDeclaration(statement) && statement.name && statement.type) {
  const match = statement.type.getText(catalogServiceFile).match(/^Promise<([A-Za-z][A-Za-z0-9_]*(?:\[\])?)>$/);
  if (match) catalogReturnTypes.set(statement.name.text, match[1]);
}

for (const [name, value] of schemaEntries) {
  try {
    const result = createSchema(value as Parameters<typeof createSchema>[0], { io: "input" });
    componentSchemas[name] = result.schema;
    Object.assign(componentSchemas, result.components);
  } catch (error) { schemaProblems.push(`${name}: ${String(error)}`); }
}

const routeInventory: Array<Record<string, unknown>> = [];
const paths: Record<string, Record<string, unknown>> = {};
const moduleCounts: Record<string, number> = {};
const unresolved: string[] = [];
function extractJsonSchema(node: ts.Expression | undefined, sf: ts.SourceFile): Record<string, unknown> | null {
  if (!node || !ts.isObjectLiteralExpression(node)) return null;
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  for (const prop of node.properties) {
    if (!ts.isPropertyAssignment(prop)) return null;
    const key = ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name) ? prop.name.text : null;
    if (!key) return null;
    const value = prop.initializer;
    if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) properties[key] = { type: "string", example: value.text };
    else if (ts.isNumericLiteral(value)) properties[key] = { type: "number", example: Number(value.text) };
    else if (value.kind === ts.SyntaxKind.TrueKeyword || value.kind === ts.SyntaxKind.FalseKeyword) properties[key] = { type: "boolean", example: value.kind === ts.SyntaxKind.TrueKeyword };
    else if (value.kind === ts.SyntaxKind.NullKeyword) properties[key] = { type: "null" };
    else if (ts.isObjectLiteralExpression(value)) { const nested = extractJsonSchema(value, sf); if (!nested) return null; properties[key] = nested; }
    else if (ts.isArrayLiteralExpression(value)) properties[key] = { type: "array", items: {} };
    else return null;
    required.push(key);
  }
  return { type: "object", properties, required };
}
function findRouteCalls(sf: ts.SourceFile, routeVar: string) {
  const found: ts.CallExpression[] = [];
  descendants(sf, node => {
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return;
    if (text(node.expression.expression, sf) !== routeVar || !["get", "post", "put", "patch", "delete"].includes(node.expression.name.text)) return;
    found.push(node);
  });
  return found;
}
function endpoint(file: string, sf: ts.SourceFile, call: ts.CallExpression, routeVar: string, overridePath?: string) {
  const method = (call.expression as ts.PropertyAccessExpression).name.text;
  const routePath = overridePath ?? lit(call.arguments[0]);
  if (!routePath) return;
  const moduleName = file.startsWith("modules/") ? file.split("/")[1] : file.split("/")[1].replace(/\.ts$/, "");
  const prefix = mounts.get(routeVar) ?? (file === "routes/poster-proxy.ts" ? "/poster-proxy" : "");
  const full = pathKey(prefix + (routePath === "/" ? "" : routePath));
  const callback = call.arguments[call.arguments.length - 1];
  const callbackText = callback ? text(callback, sf) : "";
  const directArgs = call.arguments.slice(1, -1).map(arg => text(arg, sf));
  const fileText = read(path.join(api, file));
  const globalAuth = new RegExp(`${routeVar}\\.use\\(\\s*["']\\*["']\\s*,\\s*requireAuth`).test(fileText);
  const auth = globalAuth || directArgs.includes("requireAuth") ? "bearer" : /getOptionalAuthUser/.test(callbackText) ? "optional" : "none";
  let rateLimit: { limit: number; windowSeconds: number; keyPrefix: string } | null = null;
  for (const arg of directArgs) {
    const inline = arg.match(/createRateLimitMiddleware\(\{([\s\S]*?)\}\)/);
    const declaration = inline ?? fileText.match(new RegExp(`(?:var|const|let)\\s+${arg}\\s*=\\s*createRateLimitMiddleware\\(\\{([\\s\\S]*?)\\}\\)`));
    if (!declaration) continue;
    const body = declaration[1];
    const limit = Number(body.match(/\blimit:\s*(\d+)/)?.[1]);
    const windowSeconds = Number(body.match(/\bwindowSeconds:\s*(\d+)/)?.[1]);
    const keyPrefix = body.match(/\bkeyPrefix:\s*["']([^"']+)/)?.[1] ?? "";
    if (limit && windowSeconds) rateLimit = { limit, windowSeconds, keyPrefix };
  }
  const validatorsFound: Array<{ name: string; in: string }> = [];
  if (callback) descendants(callback, node => {
    if (!ts.isCallExpression(node)) return;
    let name: string;
    let place: string;
    if (ts.isPropertyAccessExpression(node.expression) && ["parse", "safeParse"].includes(node.expression.name.text)) {
      name = text(node.expression.expression, sf);
      const args = node.arguments.map(arg => text(arg, sf)).join(" ");
      place = /req\.json\(/.test(args) ? "body" : /req\.param\(/.test(args) ? "path" : /req\.quer(y|ies)\(/.test(args) ? "query" : "unknown";
    } else if (ts.isIdentifier(node.expression) && ["parseQuery", "parseJson"].includes(node.expression.text) && node.arguments[0]) {
      name = text(node.arguments[0], sf);
      place = node.expression.text === "parseJson" || (file === "modules/catalog/routes.ts" && routePath === "/people/resolve") ? "body" : "query";
    } else return;
    if (!validatorNames.has(name) || !componentSchemas[name]) return;
    if (!validatorsFound.some(item => item.name === name && item.in === place)) validatorsFound.push({ name, in: place });
  });
  const params: Array<Record<string, any>> = [...full.matchAll(/\{(\w+)\}/g)].map(match => ({ name: match[1], in: "path", required: true, schema: { type: "string" } }));
  if (file === "routes/poster-proxy.ts") params.push({ name: "url", in: "query", required: true, schema: { type: "string", format: "uri", description: "Only image.tmdb.org and imagedelivery.net URLs are accepted." } });
  if (file === "modules/webhooks/routes.ts") for (const name of ["svix-id", "svix-timestamp", "svix-signature"]) params.push({ name, in: "header", required: true, schema: { type: "string" } });
  if (file === "modules/videos/routes.ts" && routePath.startsWith("/webhook/")) for (const name of ["x-bunnystream-signature", "x-bunnystream-signature-version", "x-bunnystream-signature-algorithm"]) params.push({ name, in: "header", required: true, schema: { type: "string" } });
  for (const item of validatorsFound.filter(item => item.in === "query")) {
    const schema = componentSchemas[item.name] as { properties?: Record<string, unknown>; required?: string[] };
    if (!schema.properties) continue;
    for (const [name, property] of Object.entries(schema.properties)) if (!params.some(p => p.name === name)) params.push({ name, in: "query", required: schema.required?.includes(name) ?? false, schema: property as { type: string } });
  }
  const stageEntityRoute = moduleName === "catalog" && /stageEntity\(/.test(callbackText);
  const stageTypeMap: Record<string, string> = { titles: "title", people: "person", credits: "credit", media: "media_asset", "external-ids": "external_id", aliases: "alias", "title-relations": "title_relation", "title-companies": "title_company", "title-genres": "title_genre", companies: "company", awards: "award", "award-events": "award_event", "award-nominations": "award_nomination" };
  const stageResource = stageEntityRoute ? routePath.split("/").filter(Boolean)[0] : undefined;
  const stageType = stageResource ? stageTypeMap[stageResource] : undefined;
  const statusCodes = new Set<number>();
  let responseSchema: Record<string, unknown> | null = null;
  if (callback) descendants(callback, node => {
    if (!ts.isCallExpression(node)) return;
    if (ts.isPropertyAccessExpression(node.expression) && text(node.expression.expression, sf) === "c" && ["json", "body", "text"].includes(node.expression.name.text)) {
      const status = node.arguments[1];
      const code = status && ts.isNumericLiteral(status) ? Number(status.text) : 200;
      statusCodes.add(code);
      if (node.expression.name.text === "json" && code < 400 && !responseSchema) responseSchema = extractJsonSchema(node.arguments[0], sf);
    }
    if (ts.isIdentifier(node.expression) && node.expression.text === "apiError" && node.arguments[0] && ts.isNumericLiteral(node.arguments[0])) statusCodes.add(Number(node.arguments[0].text));
  });
  let inferredDto: string | null = null;
  if (!responseSchema && moduleName === "catalog") for (const [functionName, returnType] of catalogReturnTypes) {
    if (!new RegExp(`\\b${functionName}\\(`).test(callbackText)) continue;
    const typeName = returnType.replace(/\[\]$/, "");
    if (!sharedTypes.ensure(typeName)) continue;
    responseSchema = returnType.endsWith("[]") ? { type: "array", items: { $ref: `#/components/schemas/${typeName}` } } : { $ref: `#/components/schemas/${typeName}` };
    inferredDto = returnType;
    break;
  }
  if (!responseSchema && stageEntityRoute && sharedTypes.ensure("CatalogEditMutationResult")) {
    responseSchema = { $ref: "#/components/schemas/CatalogEditMutationResult" };
    inferredDto = "CatalogEditMutationResult";
    statusCodes.add(201);
    statusCodes.add(409);
  }
  if (!responseSchema && moduleName === "catalog" && ["/merge", "/edits/:id/approve", "/edits/:id/reject", "/edits/:id/revert"].includes(routePath) && sharedTypes.ensure("CatalogEditWorkflowResult")) {
    responseSchema = { $ref: "#/components/schemas/CatalogEditWorkflowResult" };
    inferredDto = "CatalogEditWorkflowResult";
  }
  const chatDtoByRoute: Record<string, string> = {
    "GET /inbox": "ChatInboxPage",
    "POST /threads": "ChatThreadPreview",
    "GET /threads/:threadId/messages": "ChatMessagesPage",
    "POST /threads/:threadId/messages": "ChatMessage",
    "PATCH /messages/:messageId": "ChatMessage",
    "POST /messages/:messageId/reactions": "ChatMessage",
    "DELETE /messages/:messageId/reactions/:emoji": "ChatMessage",
    "GET /threads/:threadId/read-receipts": "ChatReadReceiptsResponse",
    "GET /threads/:threadId/typing": "ChatTypingSnapshot",
    "POST /presence/batch": "ChatPresenceBatchResponse",
  };
  const chatDto = moduleName === "chat" ? chatDtoByRoute[`${method.toUpperCase()} ${routePath}`] : undefined;
  if (chatDto && sharedTypes.ensure(chatDto)) { responseSchema = { $ref: `#/components/schemas/${chatDto}` }; inferredDto = chatDto; }
  if (moduleName === "chat" && method === "post" && routePath === "/threads") statusCodes.add(201);
  if (!responseSchema && moduleName === "health" && sharedTypes.ensure("HealthResponse")) {
    responseSchema = { $ref: "#/components/schemas/HealthResponse" };
    inferredDto = "HealthResponse";
  }
  const errorMap: Record<string, number> = { badRequest: 400, unauthorized: 401, forbidden: 403, notFound: 404, conflict: 409, tooManyRequests: 429, serviceUnavailable: 503 };
  for (const [name, code] of Object.entries(errorMap)) if (new RegExp(`\\b${name}\\(`).test(callbackText)) statusCodes.add(code);
  if (auth === "bearer") statusCodes.add(401);
  if (rateLimit) { statusCodes.add(429); statusCodes.add(503); }
  if (file === "routes/poster-proxy.ts") statusCodes.add(200);
  if (!statusCodes.size) statusCodes.add(200);
  const responses: Record<string, unknown> = {};
  for (const code of [...statusCodes].sort()) responses[String(code)] = code === 204 ? { description: "No content" } : code >= 400 ? { description: `HTTP ${code}; see Errors guide for shared error contract`, content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } } : { description: code === 200 ? "Success" : "Successful response", content: { "application/json": { schema: responseSchema ?? { type: "object", description: "Response shape requires serializer review; see DIVERGENCES.md" } } } };
  const tableRefs = Object.entries(dbSchema).filter(([_, value]) => is(value, PgTable)).filter(([symbol]) => new RegExp(`\\b${symbol}\\b`).test(callbackText)).map(([_, value]) => getTableConfig(value as Parameters<typeof getTableConfig>[0]).name);
  if (stageEntityRoute && !tableRefs.includes("catalog_edits")) tableRefs.push("catalog_edits");
  const operationId = `${method}_${full.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "")}`;
  const draft = moduleName === "catalog" ? "docs/catalog/api-reference.md" : moduleName === "moderation" ? "docs/moderation/api-reference.md" : null;
  const tableLinks = tableRefs.map(name => `[${name}](/data-model/${name})`).join(", ");
  const routeAuth = file === "modules/webhooks/routes.ts" ? "svix" : file === "modules/videos/routes.ts" && routePath.startsWith("/webhook/") ? "bunny-signature" : auth;
  const op: Record<string, unknown> = {
    tags: [moduleName], operationId, summary: `${method.toUpperCase()} ${full}`, description: `Source: \`${file}:${sf.getLineAndCharacterOfPosition(call.pos).line + 1}\`. ${draft ? `Prior draft: \`${draft}\`. ` : ""}${tableLinks ? `Direct table references: ${tableLinks}.` : ""}`,
    parameters: params, responses, security: auth === "bearer" ? [{ BearerAuth: [] }] : [],
    "x-35mm-auth": routeAuth, "x-35mm-rate-limit": rateLimit, "x-35mm-tables": tableRefs,
    "x-35mm-source": file, ...(inferredDto ? { "x-35mm-response-dto": inferredDto } : {}),
  };
  if (file === "routes/poster-proxy.ts") {
    op.responses = {
      "200": { description: "Proxied image bytes", content: { "image/*": { schema: { type: "string", format: "binary" } } } },
      "400": { description: "Missing url query parameter", content: { "text/plain": { schema: { type: "string" } } } },
      "403": { description: "URL host not allowlisted", content: { "text/plain": { schema: { type: "string" } } } },
      "502": { description: "Upstream fetch or response failed", content: { "text/plain": { schema: { type: "string" } } } },
    };
  }
  const body = validatorsFound.find(item => item.in === "body");
  if (stageEntityRoute && stageType) {
    const sourceSchema = componentSchemas.stageCatalogEditSchema as any;
    const variant = sourceSchema.properties.operations.items.oneOf.find((item: any) => item.properties.entityType?.const === stageType);
    const simpleName = `CatalogStage${camel(stageType)}Input`;
    const simpleProps = { data: variant?.properties.data ?? { type: "object" }, summary: sourceSchema.properties.summary, rationale: sourceSchema.properties.rationale, idempotencyKey: sourceSchema.properties.idempotencyKey, publicVisible: sourceSchema.properties.publicVisible, sourceSnapshotAt: sourceSchema.properties.sourceSnapshotAt, sources: sourceSchema.properties.sources, action: { type: "string", enum: ["create", "update", "delete"] }, entityId: { type: "string", pattern: "^[0-9A-HJKMNP-TV-Z]{26}$" } };
    componentSchemas[simpleName] = { type: "object", properties: simpleProps, ...(method === "delete" ? {} : { required: ["data"] }) };
    const operationsName = "CatalogStageOperationsInput";
    if (!componentSchemas[operationsName]) {
      const operationsSchema = structuredClone(sourceSchema);
      delete operationsSchema.properties.source;
      operationsSchema.required = operationsSchema.required.filter((item: string) => item !== "source");
      componentSchemas[operationsName] = operationsSchema;
    }
    op.requestBody = { required: method !== "delete", description: "Simple entity body or shared operations body. Server assigns source; header or body must supply idempotency key.", content: { "application/json": { schema: { oneOf: [{ $ref: `#/components/schemas/${simpleName}` }, { $ref: `#/components/schemas/${operationsName}` }] } } } };
  }
  if (file === "modules/webhooks/routes.ts") op.requestBody = { required: true, description: "Svix-signed Clerk event JSON. Event-specific shape comes from Clerk/Svix; handler reads event.type and event.data.", content: { "application/json": { schema: { type: "object", required: ["type", "data"], properties: { type: { type: "string" }, data: { type: "object" } } } } } };
  if (body && !stageEntityRoute) op.requestBody = { required: true, content: { "application/json": { schema: { $ref: `#/components/schemas/${body.name}` } } } };
  const idempotency = stageEntityRoute || /Idempotency-Key|idempotencyKey/.test(callbackText);
  if (idempotency) {
    (op.parameters as unknown[]).push({ name: "Idempotency-Key", in: "header", required: false, description: "Required unless body supplies idempotencyKey; see Idempotency guide.", schema: { type: "string" } });
  }
  const issues: string[] = [];
  if (["post", "put", "patch"].includes(method) && !body && !stageEntityRoute && /req\.json\(/.test(callbackText)) issues.push("body parsed without shared Zod validator; manual shape review");
  if (file === "modules/webhooks/routes.ts") issues.push("Clerk event-specific request variants are external and need confirmation");
  if (file !== "routes/poster-proxy.ts" && !responseSchema && [...statusCodes].some(code => code >= 200 && code < 204 || code > 204 && code < 300)) issues.push("response serializer or expression needs manual schema verification");
  if (validatorsFound.some(item => item.in === "unknown")) issues.push("validator location needs manual verification");
  if (issues.length) { op["x-35mm-needs-confirmation"] = issues; unresolved.push(`${method.toUpperCase()} ${full}: ${issues.join("; ")}`); }
  paths[full] ??= {};
  if (paths[full][method]) throw new Error(`Duplicate ${method} ${full}`);
  paths[full][method] = op;
  moduleCounts[moduleName] = (moduleCounts[moduleName] ?? 0) + 1;
  routeInventory.push({ module: moduleName, method: method.toUpperCase(), path: full, source: file, auth: routeAuth, rateLimit, validators: validatorsFound, tables: tableRefs, issues });
}
for (const file of routeFiles) {
  const sf = source(path.join(api, file));
  const declarations: string[] = [];
  descendants(sf, node => { if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && /new Hono/.test(text(node.initializer, sf))) declarations.push(node.name.text); });
  // Routes with default-exported Hono instance use a different name but same mount.
  for (const routeVar of declarations) {
    for (const call of findRouteCalls(sf, routeVar)) {
      const first = call.arguments[0];
      if (lit(first)) endpoint(file, sf, call, routeVar);
      else if (file === "modules/catalog/routes.ts" && first && text(first, sf) === '"/" + path + "/:id"') {
        const names = ["titles", "people", "credits", "media", "external-ids", "aliases", "title-relations", "title-companies", "title-genres", "companies", "awards", "award-events", "award-nominations"];
        for (const name of names) endpoint(file, sf, call, routeVar, `/${name}/:id`);
      } else unresolved.push(`${file}:${sf.getLineAndCharacterOfPosition(call.pos).line + 1}: dynamic route path`);
    }
  }
}
sharedTypes.ensure("ChatMessage");
const realtimeSchemas: Record<string, unknown> = {
  ChatTypingUpdateEvent: { type: "object", required: ["userId", "username", "avatarUrl", "isTyping"], properties: { userId: { type: "string" }, username: { type: "string" }, avatarUrl: { anyOf: [{ type: "string" }, { type: "null" }] }, isTyping: { type: "boolean" } } },
  ChatMessageReadEvent: { type: "object", required: ["userId", "username", "lastReadMessageId", "readAt"], properties: { userId: { type: "string" }, username: { type: "string" }, lastReadMessageId: { type: "string" }, readAt: { type: "string", format: "date-time" } } },
  ChatThreadUpdatedEvent: { type: "object", required: ["threadId", "lastMessageAt", "lastMessagePreview", "senderId", "unreadCount"], properties: { threadId: { type: "string" }, lastMessageAt: { type: "string", format: "date-time" }, lastMessagePreview: { type: "string" }, senderId: { type: "string" }, unreadCount: { type: "integer" } } },
  NotificationNewEvent: { type: "object", required: ["notificationId", "actorIds", "actorProfiles", "bundleCount", "type", "entityId", "entityType", "metadata"], properties: { notificationId: { type: "string" }, actorIds: { type: "array", items: { type: "string" } }, actorProfiles: { type: "array", items: { type: "object", required: ["userId", "username", "displayName", "avatarUrl"], properties: { userId: { type: "string" }, username: { type: "string" }, displayName: { anyOf: [{ type: "string" }, { type: "null" }] }, avatarUrl: { anyOf: [{ type: "string" }, { type: "null" }] } } } }, bundleCount: { type: "integer" }, type: { type: "string" }, entityId: { anyOf: [{ type: "string" }, { type: "null" }] }, entityType: { anyOf: [{ type: "string" }, { type: "null" }] }, metadata: { type: "object", additionalProperties: true } } },
};
const realtimeEvents = [
  { channel: "thread:{threadId}", name: "message.new", schema: "ChatMessage" },
  { channel: "thread:{threadId}", name: "message.edited", schema: "ChatMessage" },
  { channel: "thread:{threadId}", name: "message.deleted", schema: "ChatMessage" },
  { channel: "thread:{threadId}", name: "message.reaction", schema: "ChatMessage" },
  { channel: "thread:{threadId}", name: "typing.update", schema: "ChatTypingUpdateEvent" },
  { channel: "thread:{threadId}", name: "message.read", schema: "ChatMessageReadEvent" },
  { channel: "user:{userId}:inbox", name: "thread.updated", schema: "ChatThreadUpdatedEvent" },
  { channel: "user:{userId}:notifications", name: "notification.new", schema: "NotificationNewEvent" },
];
const openapi = {
  openapi: "3.1.0", info: { title: "35mm Internal API", version: "0.1.0", description: "Source-derived API inventory. Entries marked needs confirmation require handler/serializer review before client generation." },
  servers: [{ url: "http://localhost:4000", description: "Configure actual API URL in Scalar before Try it" }],
  "x-35mm-realtime-events": realtimeEvents,
  tags: Object.keys(moduleCounts).sort().map(name => ({ name })), paths,
  components: { schemas: { ApiError: { type: "object", required: ["code", "message"], properties: { code: { type: "string" }, message: { type: "string" } } }, ...componentSchemas, ...sharedTypes.components, ...realtimeSchemas }, securitySchemes: { BearerAuth: { type: "http", scheme: "bearer" } } },
};
write("openapi/spec.json", openapi);
fs.writeFileSync(path.join(output, "openapi/spec.yaml"), YAML.stringify(openapi, { lineWidth: 0 }));
write("generated/routes.json", { total: routeInventory.length, moduleCounts, routes: routeInventory, unresolved, schemaProblems });

const tables: Array<Record<string, unknown>> = [];
const enums: Record<string, string[]> = {};
for (const [symbol, value] of Object.entries(dbSchema)) {
  if (!is(value, PgTable)) {
    if (value && typeof value === "function" && "enumValues" in value && "enumName" in value) enums[(value as { enumName: string }).enumName] = [...(value as { enumValues: string[] }).enumValues];
    continue;
  }
  const config = getTableConfig(value);
  const columns = config.columns.map(column => ({
    name: column.name, type: column.getSQLType(), nullable: !column.notNull,
    default: column.hasDefault ? (column.default === undefined ? column.defaultFn ? "runtime function" : "database expression" : typeof column.default === "object" ? String(column.default) : column.default) : null,
    primaryKey: column.primary, enumValues: "enumValues" in column ? column.enumValues : undefined,
  }));
  const schemaFiles = fs.readdirSync(path.join(root, "packages/db/src/schema")).filter(name => name.endsWith(".ts"));
  const sourceFile = schemaFiles.find(file => new RegExp(`export\\s+(?:var|const)\\s+${symbol}\\s*=\\s*pgTable\\(`).test(read(path.join(root, "packages/db/src/schema", file)))) ?? null;
  const indexes = config.indexes.map(index => {
    const idx = index.config;
    return { name: idx.name, unique: idx.unique, columns: idx.columns.map(item => "name" in item ? item.name : String(item)), where: idx.where ? String(idx.where) : null };
  });
  const foreignKeys = config.foreignKeys.map(fk => {
    const ref = fk.reference();
    return { columns: ref.columns.map(c => c.name), targetTable: getTableConfig(ref.foreignTable).name, targetColumns: ref.foreignColumns.map(c => c.name), onDelete: fk.onDelete ?? "no action", onUpdate: fk.onUpdate ?? "no action" };
  });
  tables.push({ symbol, name: config.name, sourceFile, columns, primaryKeys: config.primaryKeys.map(pk => pk.columns.map(c => c.name)), uniqueConstraints: config.uniqueConstraints.map(c => ({ name: c.name, columns: c.columns.map(col => col.name) })), indexes, foreignKeys, checks: config.checks.map(check => ({ name: check.name, expression: String(check.value) })), relatedEndpoints: routeInventory.filter(route => (route.tables as string[]).includes(config.name)).map(route => `${route.method} ${route.path}`) });
}
tables.sort((a, b) => String(a.name).localeCompare(String(b.name)));
const snapshot = JSON.parse(read(path.join(root, "packages/db/drizzle/meta/0067_snapshot.json"))) as { tables: Record<string, any> };
const snapshotDivergences: string[] = [];
for (const table of tables) {
  const name = String(table.name);
  const prior = snapshot.tables[`public.${name}`];
  if (!prior) { snapshotDivergences.push(`${name}: absent from latest Drizzle snapshot`); continue; }
  for (const column of table.columns as Array<any>) {
    const snap = prior.columns[column.name];
    if (!snap) { snapshotDivergences.push(`${name}.${column.name}: absent from snapshot`); continue; }
    if (snap.type !== column.type || snap.notNull === column.nullable) snapshotDivergences.push(`${name}.${column.name}: schema ${column.type}, nullable=${column.nullable}; snapshot ${snap.type}, nullable=${!snap.notNull}`);
    column.default = snap.default ?? null;
  }
  for (const name of Object.keys(prior.columns)) if (!(table.columns as Array<any>).some(column => column.name === name)) snapshotDivergences.push(`${table.name}.${name}: snapshot-only column`);
  table.indexes = Object.values(prior.indexes ?? {}).map((idx: any) => ({ name: idx.name, unique: idx.isUnique, columns: idx.columns.map((c: any) => c.expression), where: idx.where ?? null, purpose: idx.isUnique ? `Prevents duplicate ${idx.columns.map((c: any) => c.expression).join(" + ")} values${idx.where ? " for the partial row set" : ""}.` : `Speeds bounded lookups or ordering by ${idx.columns.map((c: any) => c.expression).join(" + ")}${idx.where ? " for rows matching the partial predicate" : ""}.` }));
  table.checks = Object.values(prior.checkConstraints ?? {}).map((check: any) => ({ name: check.name, expression: check.value }));
  table.primaryKeys = [Object.values(prior.columns).filter((column: any) => column.primaryKey).map((column: any) => column.name), ...Object.values(prior.compositePrimaryKeys ?? {}).map((pk: any) => pk.columns)].filter((columns: any) => columns.length);
  table.uniqueConstraints = Object.values(prior.uniqueConstraints ?? {}).map((constraint: any) => ({ name: constraint.name, columns: constraint.columns }));
  table.foreignKeys = Object.values(prior.foreignKeys ?? {}).map((fk: any) => ({ columns: fk.columnsFrom, targetTable: fk.tableTo, targetColumns: fk.columnsTo, onDelete: fk.onDelete, onUpdate: fk.onUpdate }));
}

const architectureSchema = read(path.join(root, "docs/architecture.md")).split("## 5. Current Database Schema")[1]?.split("## 6. API Architecture")[0] ?? "";
const purposes: Record<string, string> = {};
for (const match of architectureSchema.matchAll(/^(`[^`]+`(?:,\s*`[^`]+`)*)\s*\n\s*\n- ([^\n]+)/gm)) for (const name of match[1].matchAll(/`([^`]+)`/g)) purposes[name[1]] = match[2];
const sourcedPurposes: Record<string, string> = {
  chat_threads: "Postgres metadata for chat threads; message bodies live in AWS Keyspaces.",
  chat_participants: "Membership records for chat threads.",
  chat_member_state: "Per-member read, archive, mute, delete, and activity state for chat inboxes.",
  chat_thread_meta: "Thread-wide latest-message preview and activity metadata for inbox reads.",
  counter_jobs: "Durable counter update outbox written with interaction facts.",
  counter_job_deltas: "Aggregated pending counter deltas used in bounded read-after-write overlays.",
  profile_follow_approval_outbox: "Durable batches for approving follows after a private profile becomes public.",
  video_assets: "Ownership, status, and publication metadata for Bunny Stream video assets."
};
for (const table of tables) table.purpose = purposes[String(table.name)] ?? sourcedPurposes[String(table.name)] ?? null;
const migrations = fs.readdirSync(path.join(root, "packages/db/drizzle")).filter(name => name.endsWith(".sql")).map(name => read(path.join(root, "packages/db/drizzle", name))).join("\n");
const migrated = new Set([...migrations.matchAll(/CREATE TABLE(?: IF NOT EXISTS)?\s+"?([a-z_]+)"?/gi)].map(match => match[1]));
const missingMigrations = tables.map(table => String(table.name)).filter(name => !migrated.has(name));
write("generated/tables.json", { total: tables.length, enums, tables, missingMigrations, snapshotDivergences });
function erd(rows: typeof tables) {
  const lines = ["erDiagram"];
  for (const table of rows) {
    lines.push(`  ${table.name} {`);
    for (const column of table.columns as Array<{name:string; type:string; primaryKey:boolean}>) lines.push(`    ${column.type.replace(/[^\w]/g, "_")} ${column.name}${column.primaryKey ? " PK" : ""}`);
    lines.push("  }");
  }
  for (const table of rows) for (const fk of table.foreignKeys as Array<{targetTable:string; columns:string[]}>) if (rows.some(row => row.name === fk.targetTable)) lines.push(`  ${fk.targetTable} ||--o{ ${table.name} : "${fk.columns.join(", ")}"`);
  return lines.join("\n") + "\n";
}
fs.writeFileSync(path.join(output, "generated/full-erd.mmd"), erd(tables));
for (const [group, rows] of Object.entries(Object.groupBy(tables, table => String(table.name).startsWith("catalog_") ? "catalog" : /chat_/.test(String(table.name)) ? "chat" : /moderation|report|strike/.test(String(table.name)) ? "moderation" : /notification/.test(String(table.name)) ? "notifications" : /post|feed|follow|bookmark|list|poll/.test(String(table.name)) ? "social" : "identity-media"))) fs.writeFileSync(path.join(output, `generated/${group}-erd.mmd`), erd(rows ?? []));
console.log(JSON.stringify({ endpoints: routeInventory.length, modules: moduleCounts, tables: tables.length, unresolved: unresolved.length, missingMigrations, schemaProblems: schemaProblems.length }, null, 2));
