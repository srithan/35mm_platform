import { z } from "zod";

export const RICH_TEXT_PREFIX = "__35MM_RICH_TEXT_V1__";

export type RichTextMark =
  | { type: "bold" | "italic" | "underline" | "strike" | "spoiler" }
  | {
      type: "link";
      attrs: {
        href: string;
        target?: string | null | undefined;
        rel?: string | null | undefined;
        class?: string | null | undefined;
      };
    };

export type RichTextNode = {
  type: string;
  text?: string | undefined;
  marks?: RichTextMark[] | undefined;
  attrs?: {
    id?: string | undefined;
    label?: string | undefined;
    username?: string | undefined;
    deleted?: boolean | undefined;
  } | undefined;
  content?: RichTextNode[] | undefined;
};

function isHttpUrl(value: string): boolean {
  try {
    var parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (_error) {
    return false;
  }
}

export var httpUrlSchema = z.string().trim().min(1).max(2048).refine(isHttpUrl, "URL must use http or https");

var richTextMarkSchema = z.union([
  z.object({
    type: z.enum(["bold", "italic", "underline", "strike", "spoiler"]),
  }),
  z.object({
    type: z.literal("link"),
    attrs: z.object({
      href: httpUrlSchema,
      target: z.string().max(40).nullable().optional(),
      rel: z.string().max(120).nullable().optional(),
      class: z.string().max(200).nullable().optional(),
    }),
  }),
]);

var richTextNodeSchema: z.ZodType<RichTextNode> = z.lazy(function () {
  return z.union([
    z.object({
      type: z.literal("text"),
      text: z.string().max(5000),
      marks: z.array(richTextMarkSchema).max(8).optional(),
    }),
    z.object({
      type: z.literal("hardBreak"),
    }),
    z.object({
      type: z.literal("mention"),
      attrs: z.object({
        id: z.string().uuid(),
        label: z.string().trim().min(1).max(30).regex(/^[a-zA-Z0-9._]+$/),
        username: z.string().trim().min(1).max(30).regex(/^[a-zA-Z0-9._]+$/).optional(),
        deleted: z.boolean().optional(),
      }),
    }),
    z.object({
      type: z.literal("paragraph"),
      content: z.array(richTextNodeSchema).max(500).optional(),
    }),
    z.object({
      type: z.literal("doc"),
      content: z.array(richTextNodeSchema).max(200).optional(),
    }),
  ]);
});

export var richTextDocSchema = z.object({
  type: z.literal("doc"),
  content: z.array(richTextNodeSchema).max(200).optional(),
});

export type RichTextDoc = z.infer<typeof richTextDocSchema>;

export function parseRichTextBody(value: string): RichTextDoc | null {
  if (!value.startsWith(RICH_TEXT_PREFIX)) return null;
  var parsed = JSON.parse(value.slice(RICH_TEXT_PREFIX.length));
  return richTextDocSchema.parse(parsed);
}

function richTextNodeToText(node: RichTextNode): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "mention") {
    var label = node.attrs?.label ?? node.attrs?.username ?? "user";
    return "@" + label.replace(/^@/, "");
  }
  if (node.type === "hardBreak") return "\n";
  return (node.content ?? []).map(richTextNodeToText).join("");
}

export function richTextBodyToVisibleText(value: string): string {
  var doc = parseRichTextBody(value);
  if (!doc) return value;
  return (doc.content ?? []).map(richTextNodeToText).join("\n");
}

export function richTextMentionIds(value: string): string[] {
  var doc = parseRichTextBody(value);
  if (!doc) return [];
  var ids = new Set<string>();
  function walk(node: RichTextNode) {
    if (node.type === "mention" && typeof node.attrs?.id === "string") {
      ids.add(node.attrs.id);
    }
    for (var child of node.content ?? []) walk(child);
  }
  walk(doc);
  return Array.from(ids);
}

export function validateRichTextBody(value: string, maxVisibleChars: number): string {
  var visible = richTextBodyToVisibleText(value).trim();
  if (visible.length < 1 || visible.length > maxVisibleChars) {
    throw new Error(`Body must be 1-${maxVisibleChars} visible characters`);
  }
  return value;
}
