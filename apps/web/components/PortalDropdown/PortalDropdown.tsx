"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils/cn";

export interface PortalDropdownItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  dividerBefore?: boolean;
  onSelect?: () => void;
}

interface PortalDropdownProps {
  items: PortalDropdownItem[];
  trigger: (props: {
    ref: (node: HTMLButtonElement | null) => void;
    isOpen: boolean;
    toggle: () => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
    menuId: string;
  }) => React.ReactNode;
  align?: "start" | "end";
  sideOffset?: number;
  menuLabel?: string;
  menuClassName?: string;
  itemLayout?: "default" | "rich";
  showArrow?: boolean;
}

type MenuPosition = {
  top: number;
  left: number;
  maxHeight: number;
  arrowLeft: number;
  arrowEdge: "top" | "bottom";
};

export function PortalDropdown({
  items,
  trigger,
  align = "end",
  sideOffset = 8,
  menuLabel = "Options menu",
  menuClassName,
  itemLayout = "default",
  showArrow = true,
}: PortalDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [shouldRenderMenu, setShouldRenderMenu] = useState(false);
  const [isMenuAnimatedOpen, setIsMenuAnimatedOpen] = useState(false);
  const [triggerEl, setTriggerEl] = useState<HTMLButtonElement | null>(null);
  const [position, setPosition] = useState<MenuPosition>({
    top: 0,
    left: 0,
    maxHeight: 320,
    arrowLeft: 24,
    arrowEdge: "top",
  });
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const getEnabledItems = useCallback(() => {
    const menu = menuRef.current;
    if (!menu) return [] as HTMLButtonElement[];
    return Array.from(
      menu.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]')
    ).filter((node) => !node.disabled);
  }, []);

  const focusFirstItem = useCallback(() => {
    const itemsToFocus = getEnabledItems();
    itemsToFocus[0]?.focus();
  }, [getEnabledItems]);

  const positionMenu = useCallback(() => {
    const menuEl = menuRef.current;
    if (!triggerEl || !menuEl) return;

    const margin = 8;
    const triggerRect = triggerEl.getBoundingClientRect();
    const menuRect = menuEl.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    const spaceBelow = viewportH - triggerRect.bottom - margin;
    const spaceAbove = triggerRect.top - margin;
    const openUpward =
      spaceBelow < menuRect.height && spaceAbove > spaceBelow;

    let top = openUpward
      ? triggerRect.top - menuRect.height - sideOffset
      : triggerRect.bottom + sideOffset;
    let left =
      align === "end"
        ? triggerRect.right - menuRect.width
        : triggerRect.left;

    left = Math.max(margin, Math.min(left, viewportW - menuRect.width - margin));
    top = Math.max(margin, Math.min(top, viewportH - menuRect.height - margin));

    const maxHeight = openUpward
      ? Math.max(120, triggerRect.top - sideOffset - margin)
      : Math.max(120, viewportH - triggerRect.bottom - sideOffset - margin);

    const rawArrowLeft = triggerRect.left + triggerRect.width / 2 - left;
    const arrowLeft = Math.max(18, Math.min(rawArrowLeft, menuRect.width - 18));

    setPosition({
      top,
      left,
      maxHeight,
      arrowLeft,
      arrowEdge: openUpward ? "bottom" : "top",
    });
  }, [align, sideOffset, triggerEl]);

  const closeMenu = useCallback(() => setIsOpen(false), []);

  const toggleMenu = useCallback(() => {
    setIsOpen((prev) => {
      if (!prev) {
        setShouldRenderMenu(true);
      }
      return !prev;
    });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen || !shouldRenderMenu) return;
    positionMenu();
    const rafId = requestAnimationFrame(positionMenu);
    return () => cancelAnimationFrame(rafId);
  }, [isOpen, positionMenu, shouldRenderMenu]);

  useEffect(() => {
    let rafId = 0;
    let nextRafId = 0;
    let timeoutId = 0;

    if (isOpen) {
      setShouldRenderMenu(true);
      rafId = window.requestAnimationFrame(() => {
        nextRafId = window.requestAnimationFrame(() => {
          setIsMenuAnimatedOpen(true);
        });
      });
      return () => {
        window.cancelAnimationFrame(rafId);
        window.cancelAnimationFrame(nextRafId);
      };
    }

    setIsMenuAnimatedOpen(false);

    timeoutId = window.setTimeout(() => {
      setShouldRenderMenu(false);
    }, 170);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.cancelAnimationFrame(nextRafId);
      window.clearTimeout(timeoutId);
    };
  }, [isOpen]);

  useEffect(() => {
    if (shouldRenderMenu) {
      return;
    }

    setIsMenuAnimatedOpen(false);
  }, [shouldRenderMenu]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    positionMenu();
  }, [isMenuAnimatedOpen, isOpen, positionMenu]);

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current?.contains(target) ||
        triggerEl?.contains(target)
      ) {
        return;
      }
      closeMenu();
    };

    const onEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      closeMenu();
      triggerEl?.focus();
    };

    const onViewportChange = () => positionMenu();

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onEscape);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onEscape);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [closeMenu, isOpen, positionMenu, triggerEl]);

  const onTriggerKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (!isOpen) {
          setShouldRenderMenu(true);
          setIsOpen(true);
          requestAnimationFrame(focusFirstItem);
          return;
        }
        focusFirstItem();
      }
    },
    [focusFirstItem, isOpen]
  );

  const onMenuKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const enabled = getEnabledItems();
      if (enabled.length === 0) return;
      const currentIndex = enabled.findIndex((item) => item === document.activeElement);

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % enabled.length;
        enabled[nextIndex]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prevIndex =
          currentIndex < 0
            ? enabled.length - 1
            : (currentIndex - 1 + enabled.length) % enabled.length;
        enabled[prevIndex]?.focus();
      } else if (e.key === "Home") {
        e.preventDefault();
        enabled[0]?.focus();
      } else if (e.key === "End") {
        e.preventDefault();
        enabled[enabled.length - 1]?.focus();
      }
    },
    [getEnabledItems]
  );

  const menu =
    shouldRenderMenu && typeof document !== "undefined"
      ? createPortal(
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={menuLabel}
          onKeyDown={onMenuKeyDown}
          className={cn(
            "fixed z-[340] min-w-[212px] origin-top-right rounded-xl border border-black/[0.06] bg-elevated p-2 shadow-[0_18px_44px_rgba(15,15,15,0.18),0_3px_10px_rgba(15,15,15,0.08)]",
            "transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[opacity,transform]",
            isMenuAnimatedOpen
              ? "translate-y-0 scale-100 opacity-100"
              : "-translate-y-1.5 scale-[0.96] opacity-0 pointer-events-none",
            menuClassName
          )}
          style={{
            top: position.top,
            left: position.left,
            overflow: "visible",
          }}
        >
          {showArrow ? (
            <span
              aria-hidden
              className={cn(
                "absolute w-3.5 h-3.5 rotate-45",
                position.arrowEdge === "top"
                  ? "-top-[7px] border-l border-t border-black/[0.10]"
                  : "-bottom-[7px] border-r border-b border-black/[0.10]"
              )}
              style={{
                left: position.arrowLeft - 7,
                backgroundColor: "var(--elevated)",
              }}
            />
          ) : null}
          <div style={{ maxHeight: position.maxHeight, overflowY: "auto" }}>
            {items.map((item, index) => (
              <div key={item.id} className={cn(index > 0 && "mt-0.5")}>
                {item.dividerBefore ? <div className="my-1.5 h-px bg-border" /> : null}
                <button
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    if (item.disabled) return;
                    item.onSelect?.();
                    closeMenu();
                  }}
                  className={cn(
                    "group w-full flex text-left text-[13px] font-medium transition-all",
                    itemLayout === "rich"
                      ? "items-start gap-2.5 rounded-lg px-2.5 py-2.5"
                      : "items-center gap-2 rounded-md px-2.5 py-2.5",
                    item.danger
                      ? "text-film-red hover:bg-hover"
                      : itemLayout === "rich"
                        ? "text-fg hover:bg-hover"
                        : "text-fg-muted hover:text-fg hover:bg-hover",
                    item.disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <span
                    className={cn(
                      "flex items-center justify-center shrink-0 transition-colors",
                      itemLayout === "rich" ? "mt-0.5 h-5 w-5 rounded-md" : "h-4 w-4",
                      item.danger
                        ? cn(
                          "text-film-red",
                          itemLayout === "rich" &&
                            "bg-film-red/10 group-hover:bg-sunken"
                        )
                        : cn(
                          "text-fg-faint group-hover:text-fg",
                          itemLayout === "rich" && "bg-sunken"
                        )
                    )}
                  >
                    {item.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate tracking-[0.01em]">{item.label}</span>
                    {itemLayout === "rich" && item.description ? (
                      <span className="mt-0.5 block truncate text-[11.5px] font-normal leading-snug text-fg-faint">
                        {item.description}
                      </span>
                    ) : null}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )
      : null;

  return (
    <>
      {trigger({
        ref: setTriggerEl,
        isOpen,
        toggle: toggleMenu,
        onKeyDown: onTriggerKeyDown,
        menuId,
      })}
      {menu}
    </>
  );
}
