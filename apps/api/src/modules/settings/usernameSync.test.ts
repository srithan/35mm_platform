import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../lib/errors.js";
import {
  synchronizeUsername,
  type UsernameSyncDependencies,
} from "./usernameSync.js";

function createHarness(input?: {
  clerkUsername?: string | null;
  previousUsername?: string;
  clerkUpdateError?: Error;
  confirmationUsername?: string | null;
  confirmationError?: Error;
  finalizeError?: Error;
}) {
  var events: string[] = [];
  var clerkReadCount = 0;
  var updateUser = vi.fn(async function () {
    events.push("clerk:update");
    if (input?.clerkUpdateError) throw input.clerkUpdateError;
  });

  var dependencies: UsernameSyncDependencies = {
    now: function () {
      return new Date("2026-07-25T12:00:00.000Z");
    },
    async usernameRequiresSync() {
      return true;
    },
    createClerkUsernameClient: function () {
      return {
        async getUser() {
          events.push("clerk:get");
          clerkReadCount += 1;
          if (clerkReadCount > 1 && input?.confirmationError) {
            throw input.confirmationError;
          }
          if (clerkReadCount > 1 && input?.confirmationUsername !== undefined) {
            return { username: input.confirmationUsername };
          }
          return { username: input?.clerkUsername ?? "tony" };
        },
        updateUser,
      };
    },
    async reservePendingUsername() {
      events.push("db:reserve");
      return {
        previousUsername: input?.previousUsername ?? "tony",
        staleChangeFinalized: false,
      };
    },
    async clearPendingUsername() {
      events.push("db:clear");
    },
    async finalizePendingUsername() {
      events.push("db:finalize");
      if (input?.finalizeError) throw input.finalizeError;
      return true;
    },
  };

  return { dependencies, events, updateUser };
}

async function run(dependencies: UsernameSyncDependencies) {
  return synchronizeUsername({
    userId: "local-user",
    clerkUserId: "user_clerk",
    clerkSecretKey: "sk_test",
    clerkAuthSource: "platform",
    targetUsername: "ynot",
    dependencies,
  });
}

describe("synchronizeUsername", function () {
  it("updates Clerk before finalizing the local username", async function () {
    var harness = createHarness();

    await expect(run(harness.dependencies)).resolves.toEqual({ changed: true });
    expect(harness.events).toEqual([
      "clerk:get",
      "db:reserve",
      "clerk:update",
      "db:finalize",
    ]);
    expect(harness.updateUser).toHaveBeenCalledWith("user_clerk", {
      username: "ynot",
    });
  });

  it("repairs existing local-to-Clerk drift when the requested local username is unchanged", async function () {
    var harness = createHarness({
      clerkUsername: "tony",
      previousUsername: "ynot",
    });

    await expect(run(harness.dependencies)).resolves.toEqual({ changed: true });
    expect(harness.updateUser).toHaveBeenCalledWith("user_clerk", {
      username: "ynot",
    });
    expect(harness.events.at(-1)).toBe("db:finalize");
  });

  it("does not write Clerk when Clerk already owns the requested username", async function () {
    var harness = createHarness({
      clerkUsername: "ynot",
      previousUsername: "ynot",
    });

    await expect(run(harness.dependencies)).resolves.toEqual({ changed: true });
    expect(harness.updateUser).not.toHaveBeenCalled();
    expect(harness.events).toEqual([
      "clerk:get",
      "db:reserve",
      "db:finalize",
    ]);
  });

  it("skips Clerk after the local profile records a completed auth sync", async function () {
    var harness = createHarness();
    harness.dependencies.usernameRequiresSync = async function () {
      return false;
    };

    await expect(run(harness.dependencies)).resolves.toEqual({ changed: false });
    expect(harness.events).toEqual([]);
    expect(harness.updateUser).not.toHaveBeenCalled();
  });

  it("clears the durable reservation when Clerk rejects the update", async function () {
    var harness = createHarness({
      clerkUpdateError: new Error("Clerk unavailable"),
    });

    await expect(run(harness.dependencies)).rejects.toMatchObject({
      code: "USERNAME_SYNC_UNAVAILABLE",
      status: 503,
    } satisfies Partial<ApiError>);
    expect(harness.events).toEqual([
      "clerk:get",
      "db:reserve",
      "clerk:update",
      "clerk:get",
      "db:clear",
    ]);
  });

  it("finalizes forward when Clerk applied the rename before returning an error", async function () {
    var harness = createHarness({
      clerkUpdateError: new Error("connection reset"),
      confirmationUsername: "ynot",
    });

    await expect(run(harness.dependencies)).resolves.toEqual({ changed: true });
    expect(harness.events).toEqual([
      "clerk:get",
      "db:reserve",
      "clerk:update",
      "clerk:get",
      "db:finalize",
    ]);
    expect(harness.events).not.toContain("db:clear");
  });

  it("keeps the reservation when Clerk write outcome cannot be confirmed", async function () {
    var harness = createHarness({
      clerkUpdateError: new Error("connection reset"),
      confirmationError: new Error("Clerk unavailable"),
    });

    await expect(run(harness.dependencies)).rejects.toMatchObject({
      code: "USERNAME_SYNC_PENDING",
      status: 503,
    } satisfies Partial<ApiError>);
    expect(harness.events).toEqual([
      "clerk:get",
      "db:reserve",
      "clerk:update",
      "clerk:get",
    ]);
    expect(harness.events).not.toContain("db:clear");
  });

  it("keeps the durable reservation when local finalization fails after Clerk succeeds", async function () {
    var harness = createHarness({
      finalizeError: new Error("database unavailable"),
    });

    await expect(run(harness.dependencies)).rejects.toMatchObject({
      code: "USERNAME_SYNC_PENDING",
      status: 503,
    } satisfies Partial<ApiError>);
    expect(harness.events).toEqual([
      "clerk:get",
      "db:reserve",
      "clerk:update",
      "db:finalize",
    ]);
    expect(harness.events).not.toContain("db:clear");
  });

  it("fails closed when the verified Clerk secret is unavailable", async function () {
    await expect(
      synchronizeUsername({
        userId: "local-user",
        clerkUserId: "user_clerk",
        clerkSecretKey: undefined,
        targetUsername: "ynot",
      })
    ).rejects.toMatchObject({
      code: "USERNAME_SYNC_UNAVAILABLE",
      status: 503,
    } satisfies Partial<ApiError>);
  });
});
