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
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { useIsDesktopMd } from "@/lib/hooks/useIsDesktopMd";
import { useScrollLock } from "@/lib/hooks/useScrollLock";

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

const SHEET_DISMISS_DRAG = 80;
const DROPDOWN_CLOSE_MS = 170;
const SHEET_SPRING = { type: "spring" as const, damping: 34, stiffness: 420, mass: 0.82 };

function groupSheetItems(items: PortalDropdownItem[]): PortalDropdownItem[][] {
  const groups: PortalDropdownItem[][] = [];
  let current: PortalDropdownItem[] = [];

  items.forEach(function (item) {
    if (item.dividerBefore && current.length > 0) {
      groups.push(current);
      current = [];
    }
    current.push(item);
  });

  if (current.length > 0) {
    groups.push(current);
  }

  return groups;
}

function SheetMenuGroups({
  items,
  closeMenu,
}: {
  items: PortalDropdownItem[];
  closeMenu: () => void;
}) {
  const groups = groupSheetItems(items);

  return (
    <>
      {groups.map(function (group, groupIndex) {
        return (
          <div
            key={"sheet-group-" + String(groupIndex)}
            className="overflow-hidden rounded-[22px] bg-elevated"
          >
            {group.map(function (item, itemIndex) {
              const isLast = itemIndex === group.length - 1;

              return (
                <div key={item.id}>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={item.disabled}
                    onClick={function () {
                      if (item.disabled) return;
                      item.onSelect?.();
                      closeMenu();
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-5 px-5 py-[17px]",
                      "min-h-[58px] text-left transition-colors active:bg-hover",
                      item.danger ? "text-film-red" : "text-fg",
                      item.disabled && "cursor-not-allowed opacity-45"
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate text-[16px] font-semibold leading-snug tracking-[-0.015em]">
                      {item.label}
                    </span>
                    {item.icon ? (
                      <span
                        className={cn(
                          "flex shrink-0 items-center justify-center opacity-90",
                          item.danger ? "text-film-red" : "text-fg",
                          "[&>svg]:h-6 [&>svg]:w-6"
                        )}
                      >
                        {item.icon}
                      </span>
                    ) : null}
                  </button>
                  {!isLast ? <div className="mx-5 h-px bg-border" aria-hidden /> : null}
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}

function DropdownMenuItems({
  items,
  itemLayout,
  closeMenu,
}: {
  items: PortalDropdownItem[];
  itemLayout: "default" | "rich";
  closeMenu: () => void;
}) {
  return (
    <>
      {items.map(function (item, index) {
        return (
          <div key={item.id} className={cn(index > 0 && "mt-0.5")}>
            {item.dividerBefore ? <div className="my-1.5 h-px bg-border" /> : null}
            <button
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={function () {
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
              {item.icon ? (
                <span
                  className={cn(
                    "flex items-center justify-center shrink-0 transition-colors",
                    itemLayout === "rich"
                      ? "mt-0.5 h-5 w-5 rounded-md"
                      : "h-4 w-4",
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
              ) : null}
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
        );
      })}
    </>
  );
}

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
  const isDesktopMd = useIsDesktopMd();
  const isBottomSheet = isDesktopMd !== true;

  const [isOpen, setIsOpen] = useState(false);
  const [shouldRenderMenu, setShouldRenderMenu] = useState(false);
  const [isMenuAnimatedOpen, setIsMenuAnimatedOpen] = useState(false);
  const [sheetDragOffset, setSheetDragOffset] = useState(0);
  const [triggerEl, setTriggerEl] = useState<HTMLButtonElement | null>(null);
  const [position, setPosition] = useState<MenuPosition>({
    top: 0,
    left: 0,
    maxHeight: 320,
    arrowLeft: 24,
    arrowEdge: "top",
  });
  const menuRef = useRef<HTMLDivElement>(null);
  const sheetDragStartY = useRef(0);
  const sheetDragging = useRef(false);
  const prevDesktopMd = useRef<boolean | null>(null);
  const blockClicksUntilRef = useRef(0);
  const menuId = useId();

  useScrollLock(isOpen && isBottomSheet);

  const getEnabledItems = useCallback(function () {
    const menu = menuRef.current;
    if (!menu) return [] as HTMLButtonElement[];
    return Array.from(
      menu.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]')
    ).filter(function (node) {
      return !node.disabled;
    });
  }, []);

  const focusFirstItem = useCallback(function () {
    const itemsToFocus = getEnabledItems();
    itemsToFocus[0]?.focus();
  }, [getEnabledItems]);

  const positionMenu = useCallback(function () {
    if (isBottomSheet) return;

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
  }, [align, isBottomSheet, sideOffset, triggerEl]);

  const closeMenu = useCallback(function () {
    if (isBottomSheet) {
      blockClicksUntilRef.current = Date.now() + 450;
    }
    setIsOpen(false);
    setSheetDragOffset(0);
    sheetDragging.current = false;
  }, [isBottomSheet]);

  const onSheetBackdropPointerDown = useCallback(
    function (e: React.PointerEvent<HTMLElement>) {
      e.preventDefault();
      e.stopPropagation();
      closeMenu();
    },
    [closeMenu]
  );

  useEffect(function () {
    if (!isBottomSheet) return;

    const onClickCapture = function (e: MouseEvent) {
      if (Date.now() < blockClicksUntilRef.current) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };

    document.addEventListener("click", onClickCapture, true);
    return function () {
      document.removeEventListener("click", onClickCapture, true);
    };
  }, [isBottomSheet]);

  const toggleMenu = useCallback(function () {
    setIsOpen(function (prev) {
      if (!prev) {
        setShouldRenderMenu(true);
      }
      return !prev;
    });
  }, []);

  useLayoutEffect(function () {
    if (!isOpen || !shouldRenderMenu || isBottomSheet) return;
    positionMenu();
    const rafId = requestAnimationFrame(positionMenu);
    return function () {
      cancelAnimationFrame(rafId);
    };
  }, [isBottomSheet, isOpen, positionMenu, shouldRenderMenu]);

  const onSheetExitComplete = useCallback(function () {
    if (!isOpen) {
      setShouldRenderMenu(false);
    }
  }, [isOpen]);

  useEffect(function () {
    if (isBottomSheet) {
      if (isOpen) {
        setShouldRenderMenu(true);
      }
      return;
    }

    let rafId = 0;
    let nextRafId = 0;
    let timeoutId = 0;

    if (isOpen) {
      setShouldRenderMenu(true);
      rafId = window.requestAnimationFrame(function () {
        nextRafId = window.requestAnimationFrame(function () {
          setIsMenuAnimatedOpen(true);
        });
      });
      return function () {
        window.cancelAnimationFrame(rafId);
        window.cancelAnimationFrame(nextRafId);
      };
    }

    setIsMenuAnimatedOpen(false);

    timeoutId = window.setTimeout(function () {
      setShouldRenderMenu(false);
    }, DROPDOWN_CLOSE_MS);

    return function () {
      window.cancelAnimationFrame(rafId);
      window.cancelAnimationFrame(nextRafId);
      window.clearTimeout(timeoutId);
    };
  }, [isBottomSheet, isOpen]);

  useEffect(function () {
    if (shouldRenderMenu) {
      return;
    }

    setIsMenuAnimatedOpen(false);
    setSheetDragOffset(0);
  }, [shouldRenderMenu]);

  useEffect(function () {
    if (!isOpen || isBottomSheet) {
      return;
    }

    positionMenu();
  }, [isBottomSheet, isMenuAnimatedOpen, isOpen, positionMenu]);

  useEffect(function () {
    if (
      prevDesktopMd.current !== null &&
      isDesktopMd !== null &&
      prevDesktopMd.current !== isDesktopMd &&
      isOpen
    ) {
      closeMenu();
    }
    prevDesktopMd.current = isDesktopMd;
  }, [closeMenu, isDesktopMd, isOpen]);

  useEffect(function () {
    if (!isOpen) return;

    const onEscape = function (e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      closeMenu();
      triggerEl?.focus();
    };

    window.addEventListener("keydown", onEscape);

    if (isBottomSheet) {
      return function () {
        window.removeEventListener("keydown", onEscape);
      };
    }

    const onPointerDown = function (e: PointerEvent) {
      const target = e.target as Node;
      if (
        menuRef.current?.contains(target) ||
        triggerEl?.contains(target)
      ) {
        return;
      }
      closeMenu();
    };

    const onViewportChange = function () {
      positionMenu();
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);

    return function () {
      window.removeEventListener("keydown", onEscape);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [closeMenu, isBottomSheet, isOpen, positionMenu, triggerEl]);

  const onTriggerKeyDown = useCallback(
    function (e: React.KeyboardEvent<HTMLButtonElement>) {
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
    function (e: React.KeyboardEvent<HTMLDivElement>) {
      const enabled = getEnabledItems();
      if (enabled.length === 0) return;
      const currentIndex = enabled.findIndex(function (item) {
        return item === document.activeElement;
      });

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

  const onSheetTouchStart = useCallback(function (e: React.TouchEvent<HTMLDivElement>) {
    sheetDragStartY.current = e.touches[0]?.clientY ?? 0;
    sheetDragging.current = true;
  }, []);

  const onSheetTouchMove = useCallback(function (e: React.TouchEvent<HTMLDivElement>) {
    if (!sheetDragging.current) return;
    const currentY = e.touches[0]?.clientY ?? sheetDragStartY.current;
    const delta = currentY - sheetDragStartY.current;
    if (delta > 0) {
      setSheetDragOffset(delta);
    }
  }, []);

  const onSheetTouchEnd = useCallback(
    function () {
      sheetDragging.current = false;
      if (sheetDragOffset >= SHEET_DISMISS_DRAG) {
        closeMenu();
        return;
      }
      setSheetDragOffset(0);
    },
    [closeMenu, sheetDragOffset]
  );

  const menu =
    shouldRenderMenu && typeof document !== "undefined"
      ? createPortal(
          isBottomSheet ? (
            <AnimatePresence onExitComplete={onSheetExitComplete}>
              {isOpen ? (
                <div key="sheet-root" className="fixed inset-0 z-[351]">
                  <motion.button
                    type="button"
                    aria-hidden
                    tabIndex={-1}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                    onPointerDown={onSheetBackdropPointerDown}
                    className="absolute inset-0 bg-[rgb(15_15_15/0.38)] backdrop-blur-[8px] [-webkit-backdrop-filter:blur(8px)]"
                  />
                  <motion.div
                    ref={menuRef}
                    id={menuId}
                    role="dialog"
                    aria-modal="true"
                    aria-label={menuLabel}
                    onKeyDown={onMenuKeyDown}
                    onTouchStart={onSheetTouchStart}
                    onTouchMove={onSheetTouchMove}
                    onTouchEnd={onSheetTouchEnd}
                    onTouchCancel={onSheetTouchEnd}
                    initial={{ y: "105%" }}
                    animate={{
                      y: sheetDragOffset > 0 ? sheetDragOffset : 0,
                    }}
                    exit={{ y: "105%" }}
                    transition={
                      sheetDragOffset > 0
                        ? { duration: 0 }
                        : SHEET_SPRING
                    }
                    className={cn(
                      "absolute inset-x-0 bottom-0 flex max-h-[min(88vh,680px)] flex-col",
                      "overflow-hidden rounded-t-[32px] bg-sunken",
                      "pb-[max(1rem,env(safe-area-inset-bottom))]",
                      "touch-pan-y"
                    )}
                  >
                    <div className="flex shrink-0 justify-center pb-3 pt-4">
                      <span
                        aria-hidden
                        className="h-[5px] w-10 rounded-full bg-border-strong/90"
                      />
                    </div>
                    <div className="flex flex-col gap-3 overflow-y-auto overscroll-contain px-4 pb-3 pt-0.5">
                      <SheetMenuGroups items={items} closeMenu={closeMenu} />
                    </div>
                  </motion.div>
                </div>
              ) : null}
            </AnimatePresence>
          ) : (
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
                <DropdownMenuItems
                  items={items}
                  itemLayout={itemLayout}
                  closeMenu={closeMenu}
                />
              </div>
            </div>
          ),
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
