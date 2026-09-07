import {
  parseRichTextBody,
  RICH_TEXT_PREFIX,
  type RichTextDoc,
  type RichTextMark,
  type RichTextNode,
} from "@35mm/validators/rich-text";
import { AppText, useMobileUI, type AppTextProps } from "@35mm/mobile-ui";
import { memo, useCallback, useMemo, useState, type ReactNode } from "react";
import { Linking, StyleSheet, Text, type TextStyle } from "react-native";

const MAX_STORED_RICH_TEXT_CHARACTERS = 100_000;
const MAX_RENDERED_NODES = 1_000;
const MAX_RENDER_DEPTH = 8;

type ParsedBody =
  | { readonly kind: "plain"; readonly value: string }
  | { readonly kind: "rich"; readonly document: RichTextDoc }
  | { readonly kind: "invalid" };

function withinComplexityBounds(document: RichTextDoc): boolean {
  let seen = 0;
  let stack: { readonly node: RichTextNode; readonly depth: number }[] = [
    { node: document, depth: 0 },
  ];

  while (stack.length > 0) {
    let current = stack.pop();
    if (!current) break;
    seen += 1;
    if (seen > MAX_RENDERED_NODES || current.depth > MAX_RENDER_DEPTH) return false;
    for (let child of current.node.content ?? []) {
      stack.push({ node: child, depth: current.depth + 1 });
    }
  }

  return true;
}

export function parseStoredRichTextForMobile(value: string): ParsedBody {
  if (!value.startsWith(RICH_TEXT_PREFIX)) return { kind: "plain", value };
  if (value.length > MAX_STORED_RICH_TEXT_CHARACTERS) return { kind: "invalid" };

  try {
    let document = parseRichTextBody(value);
    if (!document || !withinComplexityBounds(document)) return { kind: "invalid" };
    return { kind: "rich", document };
  } catch {
    return { kind: "invalid" };
  }
}

function styleForMarks(marks: readonly RichTextMark[] | undefined): TextStyle {
  let style: TextStyle = {};
  let underline = false;
  let strike = false;
  for (let mark of marks ?? []) {
    if (mark.type === "bold") style.fontWeight = "700";
    if (mark.type === "italic") style.fontStyle = "italic";
    if (mark.type === "underline") underline = true;
    if (mark.type === "strike") strike = true;
  }
  if (underline || strike) {
    style.textDecorationLine = underline && strike ? "underline line-through" : underline ? "underline" : "line-through";
  }
  return style;
}

function linkForMarks(marks: readonly RichTextMark[] | undefined): string | null {
  for (let mark of marks ?? []) {
    if (mark.type === "link") return mark.attrs.href;
  }
  return null;
}

function hasSpoiler(marks: readonly RichTextMark[] | undefined): boolean {
  return (marks ?? []).some((mark) => mark.type === "spoiler");
}

function RichTextLeaf({
  marks,
  onLinkFailure,
  value,
}: {
  readonly marks?: readonly RichTextMark[];
  readonly onLinkFailure: () => void;
  readonly value: string;
}) {
  const { theme } = useMobileUI();
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);
  const link = linkForMarks(marks);
  const spoiler = hasSpoiler(marks);
  const openLink = useCallback(() => {
    if (!link) return;
    void Linking.openURL(link).catch(onLinkFailure);
  }, [link, onLinkFailure]);

  return (
    <Text
      accessibilityRole={link ? "link" : undefined}
      accessibilityLabel={spoiler && !spoilerRevealed ? "Spoiler, tap to reveal" : undefined}
      onPress={spoiler && !spoilerRevealed ? () => setSpoilerRevealed(true) : link ? openLink : undefined}
      style={[
        styleForMarks(marks),
        link ? { color: theme.colors.accent, textDecorationLine: "underline" } : null,
        spoiler && !spoilerRevealed
          ? { backgroundColor: theme.colors.text, color: theme.colors.text }
          : null,
      ]}
    >
      {value}
    </Text>
  );
}

function renderNode(
  node: RichTextNode,
  key: string,
  onLinkFailure: () => void,
): ReactNode {
  if (node.type === "text") {
    return (
      <RichTextLeaf
        key={key}
        {...(node.marks ? { marks: node.marks } : {})}
        onLinkFailure={onLinkFailure}
        value={node.text ?? ""}
      />
    );
  }
  if (node.type === "mention") {
    let label = (node.attrs?.label ?? node.attrs?.username ?? "user").replace(/^@/, "");
    return (
      <Text key={key} style={styles.mention}>
        @{label}
      </Text>
    );
  }
  if (node.type === "hardBreak") return "\n";
  return (node.content ?? []).map((child, index) =>
    renderNode(child, `${key}-${index}`, onLinkFailure),
  );
}

export const RichTextBody = memo(function RichTextBody({
  value,
  role = "body",
  style,
  ...textProps
}: {
  readonly value: string;
} & Omit<AppTextProps, "children">) {
  const [linkFailure, setLinkFailure] = useState(false);
  const parsed = useMemo(() => parseStoredRichTextForMobile(value), [value]);
  const onLinkFailure = useCallback(() => setLinkFailure(true), []);

  if (parsed.kind === "invalid") {
    return (
      <AppText accessibilityLiveRegion="polite" color="textSecondary" role={role} style={style}>
        Post text unavailable.
      </AppText>
    );
  }
  if (parsed.kind === "plain") {
    return (
      <AppText {...textProps} role={role} style={style}>
        {parsed.value}
      </AppText>
    );
  }

  return (
    <>
      {(parsed.document.content ?? []).map((node, index) => (
        <AppText {...textProps} key={`paragraph-${index}`} role={role} style={style}>
          {renderNode(node, `rich-${index}`, onLinkFailure)}
        </AppText>
      ))}
      {linkFailure ? (
        <AppText accessibilityLiveRegion="polite" color="destructive" role="metadata">
          Couldn’t open link.
        </AppText>
      ) : null}
    </>
  );
});

const styles = StyleSheet.create({
  mention: {
    fontWeight: "600",
  },
});
