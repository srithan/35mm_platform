// @vitest-environment jsdom
import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import { NotificationDropdown } from "./NotificationDropdown";
import type { HeaderNotifRow } from "../types";

vi.mock("./NotificationFollowRequestsView", () => ({
  FollowRequestsEntryRow: () => null,
  NotificationFollowRequestsView: () => null,
}));

function queryResult<T>(data: T): UseQueryResult<T> {
  return {
    data,
    isPending: false,
  } as UseQueryResult<T>;
}

function mutationResult<TVariables>(): UseMutationResult<unknown, Error, TVariables, unknown> {
  return {
    isPending: false,
    mutate: vi.fn(),
  } as unknown as UseMutationResult<unknown, Error, TVariables, unknown>;
}

it("portals the notification panel to the document body", async () => {
  const wrapRef = createRef<HTMLDivElement>();
  const listRef = createRef<HTMLUListElement>();

  render(
    <header data-testid="header">
      <NotificationDropdown
        wrapRef={wrapRef}
        listRef={listRef}
        open
        onToggle={vi.fn()}
        onClose={vi.fn()}
        notifRowsQuery={queryResult({ items: [] as HeaderNotifRow[] })}
        notifRows={[]}
        unreadRowsQuery={queryResult({ items: [] })}
        followRequestTotal={0}
        unreadBadgeCount="0"
        markAllMutation={mutationResult<void>()}
        markOneMutation={mutationResult<string>()}
        markUnreadMutation={mutationResult<string>()}
        onTrapWheel={vi.fn()}
      />
    </header>
  );

  const panel = await screen.findByRole("dialog", { name: "Notifications" });

  expect(screen.getByTestId("header")).not.toContainElement(panel);
  expect(panel.parentElement).toBe(document.body);
  expect(panel.style.position).toBe("fixed");
});
