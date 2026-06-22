"use client";

import { Mark, mergeAttributes } from "@tiptap/core";
import Mention from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils/cn";
import { FloatingFormattingToolbar } from "./FormattingToolbar";
import {
  docFromPlainText,
  isStoredRichText,
  parseStoredRichText,
  serializeRichTextDoc,
  type RichTextDoc,
} from "@/lib/utils/richContent";
import { searchMentionSuggestions, type MentionSuggestion } from "@/features/feed/api/mentionsApi";

export const Spoiler = Mark.create({
  name: "spoiler",
  parseHTML() {
    return [{ tag: "span[data-spoiler]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-spoiler": "true",
        class: "rounded-[4px] bg-accent/10 px-1 text-fg decoration-dashed underline underline-offset-4",
      }),
      0,
    ];
  },
});

type MentionItem = MentionSuggestion;

const UserMention = Mention.extend({
  addAttributes() {
    return {
      id: {
        default: null,
      },
      label: {
        default: null,
      },
      username: {
        default: null,
      },
      deleted: {
        default: false,
      },
      isPrivate: {
        default: false,
      },
    };
  },
});

function createMentionSuggestion(getToken: () => Promise<string | null>) {
  return {
    char: "@",
    allowSpaces: false,
    debounce: 225,
    items: async ({ query }: { query: string }) => {
      try {
        return await searchMentionSuggestions(query, await getToken());
      } catch (_err) {
        return [];
      }
    },
    render: function () {
      var root: HTMLDivElement | null = null;
      var selectedIndex = 0;
      var items: MentionItem[] = [];
      var command: ((item: MentionItem) => void) | null = null;
      var isLoading = false;

      function updateSelection() {
        if (!root) return;
        root.querySelectorAll<HTMLElement>("[role='option']").forEach(function (el, index) {
          el.setAttribute("aria-selected", index === selectedIndex ? "true" : "false");
          el.className = cn(
            "flex w-full items-center gap-2 px-3 py-2 text-left text-[13px]",
            index === selectedIndex ? "bg-hover text-fg" : "text-fg hover:bg-hover"
          );
        });
      }

      function renderItems() {
        if (!root) return;
        root.innerHTML = "";
        root.setAttribute("role", "listbox");
        root.className =
          "z-[calc(var(--z-composer)+10)] min-w-[240px] overflow-hidden rounded-lg border border-border bg-elevated py-1 shadow-xl";
        if (items.length === 0) {
          var empty = document.createElement("div");
          empty.className = "px-3 py-2 text-[13px] text-fg-muted";
          empty.textContent = isLoading ? "Searching…" : "No users found";
          root.appendChild(empty);
          return;
        }
        items.forEach(function (item, index) {
          var button = document.createElement("button");
          button.type = "button";
          button.setAttribute("role", "option");
          button.id = `mention-option-${item.id}`;
          var avatar = document.createElement("span");
          avatar.className =
            "relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sunken text-[11px] font-semibold";
          avatar.textContent = (item.displayName || item.username).slice(0, 1).toUpperCase();
          if (item.avatarUrl) {
            const avatarImage = document.createElement("img");
            avatarImage.src = item.avatarUrl;
            avatarImage.alt = "";
            avatarImage.className = "absolute inset-0 h-full w-full object-cover";
            avatarImage.addEventListener("error", function () {
              avatarImage.remove();
            });
            avatar.appendChild(avatarImage);
          }
          var textWrap = document.createElement("span");
          textWrap.className = "min-w-0";
	          var name = document.createElement("span");
	          name.className = "flex min-w-0 items-center gap-1 font-semibold";
	          var nameText = document.createElement("span");
	          nameText.className = "truncate";
	          nameText.textContent = item.displayName;
	          name.appendChild(nameText);
	          if (item.isPrivate) {
	            var lock = document.createElement("span");
	            lock.className = "h-2.5 w-2.5 shrink-0 rounded-sm border border-fg-muted";
	            lock.setAttribute("aria-label", "Private account");
	            name.appendChild(lock);
	          }
          var handle = document.createElement("span");
          handle.className = "block truncate text-[12px] text-fg-muted";
          handle.textContent = "@" + item.username;
          textWrap.appendChild(name);
          textWrap.appendChild(handle);
          button.appendChild(avatar);
          button.appendChild(textWrap);
          button.addEventListener("mouseenter", function () {
            selectedIndex = index;
            updateSelection();
          });
          button.addEventListener("mousedown", function (event) {
            event.preventDefault();
            command?.(item);
          });
          root!.appendChild(button);
        });
        updateSelection();
      }

      function position(clientRect: (() => DOMRect | null) | null | undefined) {
        if (!root || !clientRect) return;
        var rect = clientRect();
        if (!rect) return;
        root.style.position = "fixed";
        root.style.left = rect.left + "px";
        root.style.top = rect.bottom + 8 + "px";
      }

      return {
        onStart: function (props: any) {
          root = document.createElement("div");
          document.body.appendChild(root);
          isLoading = Boolean(props.loading);
          items = props.items ?? [];
          command = function (item: MentionItem) {
            props.command({
	              id: item.id,
	              label: item.username,
	              username: item.username,
	              isPrivate: item.isPrivate,
	            });
          };
          renderItems();
          position(props.clientRect);
        },
        onUpdate: function (props: any) {
          isLoading = Boolean(props.loading);
          items = props.items ?? [];
          selectedIndex = Math.min(selectedIndex, Math.max(items.length - 1, 0));
          command = function (item: MentionItem) {
            props.command({
	              id: item.id,
	              label: item.username,
	              username: item.username,
	              isPrivate: item.isPrivate,
	            });
          };
          renderItems();
          position(props.clientRect);
        },
        onKeyDown: function (props: { event: KeyboardEvent }) {
          if (props.event.key === "ArrowDown") {
            selectedIndex = (selectedIndex + 1) % Math.max(items.length, 1);
            updateSelection();
            return true;
          }
          if (props.event.key === "ArrowUp") {
            selectedIndex = (selectedIndex + items.length - 1) % Math.max(items.length, 1);
            updateSelection();
            return true;
          }
          if (props.event.key === "Enter" || props.event.key === "Tab") {
            if (items[selectedIndex]) command?.(items[selectedIndex]);
            return true;
          }
          if (props.event.key === "Escape") return false;
          return false;
        },
        onExit: function () {
          root?.remove();
          root = null;
        },
      };
    },
  };
}

function editorContentFromValue(value: string): RichTextDoc {
  return parseStoredRichText(value) ?? docFromPlainText(value);
}

function selectedTextRect(editor: Editor): DOMRect | null {
  if (typeof window === "undefined") return null;
  const { from, to, empty } = editor.state.selection;
  if (empty || from === to) return null;

  try {
    const start = editor.view.coordsAtPos(from);
    const end = editor.view.coordsAtPos(to);
    const sameLine = Math.abs(start.top - end.top) < Math.max(start.bottom - start.top, 18);
    const left = sameLine ? Math.min(start.left, end.left) : start.left;
    const right = sameLine ? Math.max(start.right, end.right) : start.right;
    const top = start.top;
    const bottom = start.bottom;

    return new DOMRect(left, top, Math.max(right - left, 1), Math.max(bottom - top, 1));
  } catch (_err) {
    return null;
  }
}

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string, plainText: string, editor: Editor) => void;
  onEditorReady?: (editor: Editor | null) => void;
  placeholder: string;
  className?: string;
  editorClassName?: string;
  autoFocus?: boolean;
  onFocus?: () => void;
  onBlur?: (event: FocusEvent) => void;
  onPaste?: (event: ClipboardEvent) => void;
  editable?: boolean;
}

export function RichTextEditor(props: RichTextEditorProps) {
  const { getToken } = useAuth();
  const lastSerializedRef = useRef<string>("");
  const initialContent = useMemo(() => editorContentFromValue(props.value), []);
  const extensions = useMemo(
    function () {
      return [
        StarterKit.configure({
          heading: false,
          blockquote: false,
          code: false,
          codeBlock: false,
          horizontalRule: false,
        }),
        Spoiler,
        Placeholder.configure({
          placeholder: props.placeholder,
          showOnlyWhenEditable: false,
        }),
        UserMention.configure({
          HTMLAttributes: {
            class: "rounded-[4px] bg-social-accent-bg px-1 font-medium text-social-accent no-underline",
          },
          suggestion: createMentionSuggestion(getToken),
          renderText({ options, node }) {
            return `${options.suggestion.char}${node.attrs.label ?? node.attrs.username ?? "user"}`;
          },
        }),
      ];
    },
    [getToken, props.placeholder]
  );

  const editor = useEditor({
    extensions,
    content: initialContent,
    editable: props.editable ?? true,
    autofocus: props.autoFocus ? "end" : false,
    editorProps: {
      attributes: {
        role: "combobox",
        "aria-autocomplete": "list",
        "aria-label": props.placeholder,
        "aria-disabled": props.editable === false ? "true" : "false",
        placeholder: props.placeholder,
        class: cn(
          "ProseMirror min-h-[inherit] w-full outline-none focus:outline-none focus-visible:outline-none",
          props.editorClassName
        ),
      },
      handlePaste: function (_view, event) {
        props.onPaste?.(event);
        return event.defaultPrevented;
      },
    },
    onUpdate: function ({ editor }) {
      var serialized = serializeRichTextDoc(editor.getJSON() as RichTextDoc);
      lastSerializedRef.current = serialized;
      props.onChange(serialized, editor.getText(), editor);
    },
    onFocus: props.onFocus,
    onBlur: function ({ event }) {
      props.onBlur?.(event);
    },
  });

  useEffect(
    function () {
      props.onEditorReady?.(editor ?? null);
      return function () {
        props.onEditorReady?.(null);
      };
    },
    [editor, props.onEditorReady]
  );

  useEffect(
    function () {
      if (!editor) return;
      editor.setEditable(props.editable ?? true);
      editor.view.dom.setAttribute("aria-disabled", props.editable === false ? "true" : "false");
    },
    [editor, props.editable]
  );

  useEffect(
    function () {
      if (!editor) return;
      if (props.value === lastSerializedRef.current) return;
      var next = editorContentFromValue(props.value);
      editor.commands.setContent(next, { emitUpdate: false });
      lastSerializedRef.current = isStoredRichText(props.value)
        ? props.value
        : serializeRichTextDoc(next);
    },
    [editor, props.value]
  );

  return (
    <>
      {editor ? (
        <BubbleMenu
          editor={editor}
          updateDelay={0}
          appendTo={function () {
            return document.body;
          }}
          getReferencedVirtualElement={function () {
            const rect = selectedTextRect(editor);
            if (!rect) return null;
            return {
              getBoundingClientRect: function () {
                return rect;
              },
              getClientRects: function () {
                return [rect];
              },
            };
          }}
          options={{
            strategy: "fixed",
            placement: "bottom",
            offset: 8,
            flip: { fallbackPlacements: ["top"] },
            shift: { padding: 12 },
            inline: true,
          }}
          className="z-[calc(var(--z-composer)+20)]"
          shouldShow={function ({ editor: activeEditor, state, from, to }) {
            return activeEditor.isEditable && activeEditor.isFocused && from !== to && !state.selection.empty;
          }}
        >
          <FloatingFormattingToolbar editor={editor} />
        </BubbleMenu>
      ) : null}
      <EditorContent
        editor={editor}
        className={cn(
          "rich-text-editor [&_.ProseMirror]:whitespace-pre-wrap [&_.ProseMirror]:break-words [&_.ProseMirror]:outline-none [&_.ProseMirror:focus]:outline-none [&_.ProseMirror:focus-visible]:outline-none [&_[data-type=mention]]:no-underline [&_.ProseMirror_p.is-editor-empty:first-child:before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child:before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child:before]:h-0 [&_.ProseMirror_p.is-editor-empty:first-child:before]:text-fg-muted [&_.ProseMirror_p.is-editor-empty:first-child:before]:content-[attr(data-placeholder)]",
          props.className
        )}
      />
    </>
  );
}
