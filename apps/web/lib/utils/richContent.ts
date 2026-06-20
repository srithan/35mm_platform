"use client";

export const RICH_TEXT_PREFIX = "__35MM_RICH_TEXT_V1__";

export type RichTextMark = {
  type: string;
  attrs?: Record<string, unknown>;
};

export type RichTextNode = {
  type?: string;
  text?: string;
  marks?: RichTextMark[];
  attrs?: Record<string, unknown>;
  content?: RichTextNode[];
};

export type RichTextDoc = {
  type: "doc";
  content?: RichTextNode[];
};

export function isStoredRichText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.startsWith(RICH_TEXT_PREFIX);
}

export function parseStoredRichText(value: string | null | undefined): RichTextDoc | null {
  if (!isStoredRichText(value)) return null;
  try {
    const parsed = JSON.parse(value.slice(RICH_TEXT_PREFIX.length));
    if (parsed && typeof parsed === "object" && parsed.type === "doc") {
      return parsed as RichTextDoc;
    }
  } catch {
    return null;
  }
  return null;
}

export function serializeRichTextDoc(doc: RichTextDoc): string {
  return RICH_TEXT_PREFIX + JSON.stringify(doc);
}

export function docFromPlainText(text: string): RichTextDoc {
  const lines = text.split("\n");
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: lines.flatMap(function (line, index) {
          const nodes: RichTextNode[] = [];
          if (line.length > 0) nodes.push({ type: "text", text: line });
          if (index < lines.length - 1) nodes.push({ type: "hardBreak" });
          return nodes;
        }),
      },
    ],
  };
}

function textFromNode(node: RichTextNode): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "mention") {
    const label =
      typeof node.attrs?.label === "string"
        ? node.attrs.label
        : typeof node.attrs?.username === "string"
          ? node.attrs.username
          : "user";
    return "@" + label.replace(/^@/, "");
  }
  if (node.type === "hardBreak") return "\n";

  const childText = (node.content ?? []).map(textFromNode).join("");
  if (node.type === "paragraph") return childText;
  return childText;
}

export function richDocToPlainText(doc: RichTextDoc | null): string {
  if (!doc) return "";
  return (doc.content ?? [])
    .map(textFromNode)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

export function storedRichTextToPlainText(value: string | null | undefined): string {
  const doc = parseStoredRichText(value);
  return doc ? richDocToPlainText(doc) : value ?? "";
}

export function extractMentionIdsFromDoc(doc: RichTextDoc | null): string[] {
  const ids = new Set<string>();
  function walk(node: RichTextNode) {
    if (node.type === "mention" && typeof node.attrs?.id === "string") {
      ids.add(node.attrs.id);
    }
    for (const child of node.content ?? []) walk(child);
  }
  for (const node of doc?.content ?? []) walk(node);
  return Array.from(ids);
}

export function extractMentionIdsFromStoredRichText(value: string | null | undefined): string[] {
  return extractMentionIdsFromDoc(parseStoredRichText(value));
}

export function hasVisibleRichText(value: string | null | undefined): boolean {
  return storedRichTextToPlainText(value).trim().length > 0;
}
