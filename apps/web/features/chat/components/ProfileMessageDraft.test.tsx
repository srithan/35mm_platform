import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileMessageDraft } from "./ProfileMessageDraft";

const mocks = vi.hoisted(function () {
  return {
    create: vi.fn(),
    send: vi.fn(),
    replace: vi.fn(),
  };
});

vi.mock("next/navigation", function () {
  return {
    useRouter: function () {
      return { replace: mocks.replace };
    },
  };
});

vi.mock("@/features/auth/components/AuthPromptProvider", function () {
  return {
    useAuthPrompt: function () {
      return {
        requireAuth: function (action: () => void) {
          action();
        },
      };
    },
  };
});

vi.mock("@/features/profile/hooks/useProfile", function () {
  return {
    usePublicProfile: function () {
      return {
        data: {
          userId: "user-2",
          username: "pat",
          displayName: "Pat",
          avatarUrl: null,
        },
        isPending: false,
        isError: false,
      };
    },
  };
});

vi.mock("../hooks/useChatQueries", function () {
  return {
    useCreateConversation: function () {
      return { mutateAsync: mocks.create, isPending: false };
    },
    useSendMessage: function () {
      return { mutateAsync: mocks.send, isPending: false };
    },
  };
});

vi.mock("./ChatList", function () {
  return { ChatList: function () { return <div>Conversation list</div>; } };
});

vi.mock("./ChatComposer", function () {
  return {
    ChatComposer: function (props: { onSend: (payload: { text: string }) => void }) {
      return (
        <button type="button" onClick={function () { props.onSend({ text: "Hello" }); }}>
          Send draft
        </button>
      );
    },
  };
});

describe("ProfileMessageDraft", function () {
  beforeEach(function () {
    mocks.create.mockReset();
    mocks.send.mockReset();
    mocks.replace.mockReset();
    mocks.create.mockResolvedValue({ id: "THREAD-1" });
    mocks.send.mockResolvedValue({ message: { id: "MESSAGE-1" } });
  });

  it("does not create a conversation until the first message is sent", function () {
    render(<ProfileMessageDraft username="pat" />);

    expect(screen.getByRole("region", { name: "Message Pat" })).toBeInTheDocument();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("creates, sends, then replaces the draft URL with the conversation URL", async function () {
    render(<ProfileMessageDraft username="pat" />);

    fireEvent.click(screen.getByRole("button", { name: "Send draft" }));

    await waitFor(function () {
      expect(mocks.create).toHaveBeenCalledWith({
        type: "dm",
        memberIds: ["user-2"],
        member: { username: "pat", displayName: "Pat" },
      });
      expect(mocks.send).toHaveBeenCalledWith(
        expect.objectContaining({
          chatId: "THREAD-1",
          text: "Hello",
          idempotencyKey: expect.any(String),
        })
      );
      expect(mocks.replace).toHaveBeenCalledWith("/chat/thread-1");
    });
  });
});
