import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthModal } from "./AuthModal";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

vi.mock("framer-motion", async () => {
  const React = await import("react");
  const passthrough = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    function Passthrough(props, ref) {
      const {
        // Strip motion-only props so they do not land on the DOM node.
        initial: _initial,
        animate: _animate,
        exit: _exit,
        transition: _transition,
        ...rest
      } = props as Record<string, unknown> & React.HTMLAttributes<HTMLDivElement>;
      return <div ref={ref} {...rest} />;
    }
  );
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: { div: passthrough },
    useDragControls: () => ({ start: vi.fn() }),
  };
});

vi.mock("./LoginForm", () => ({
  LoginForm: ({
    nextPath,
    onSwitchToSignup,
  }: {
    nextPath: string | null;
    onSwitchToSignup: () => void;
  }) => (
    <div data-testid="login-form" data-next={nextPath ?? ""}>
      <button type="button" onClick={onSwitchToSignup}>
        go signup
      </button>
    </div>
  ),
}));

vi.mock("./SignupForm", () => ({
  SignupForm: ({
    onSwitchToLogin,
    onNeedsVerification,
  }: {
    onSwitchToLogin: () => void;
    onNeedsVerification: (email: string) => void;
  }) => (
    <div data-testid="signup-form">
      <button type="button" onClick={onSwitchToLogin}>
        go login
      </button>
      <button
        type="button"
        onClick={function () {
          onNeedsVerification("ada@example.com");
        }}
      >
        submit signup
      </button>
    </div>
  ),
}));

vi.mock("./VerifyEmailForm", () => ({
  VerifyEmailForm: ({ email }: { email: string }) => (
    <div data-testid="verify-form" data-email={email} />
  ),
}));

describe("AuthModal", () => {
  it("renders the login form by default and switches to signup in place", () => {
    render(<AuthModal open onClose={vi.fn()} initialMode="login" next="/film/abc" />);

    expect(screen.getByTestId("login-form")).toHaveAttribute("data-next", "/film/abc");
    expect(screen.queryByTestId("signup-form")).toBeNull();

    fireEvent.click(screen.getByText("go signup"));
    expect(screen.getByTestId("signup-form")).toBeInTheDocument();
    expect(screen.queryByTestId("login-form")).toBeNull();
  });

  it("opens directly on signup and moves to verification after submit", () => {
    render(<AuthModal open onClose={vi.fn()} initialMode="signup" next="/" />);

    expect(screen.getByTestId("signup-form")).toBeInTheDocument();
    fireEvent.click(screen.getByText("submit signup"));

    expect(screen.getByTestId("verify-form")).toHaveAttribute("data-email", "ada@example.com");
    expect(screen.queryByTestId("signup-form")).toBeNull();
  });

  it("drops unsafe next paths and shows contextual decor copy", () => {
    render(
      <AuthModal
        open
        onClose={vi.fn()}
        initialMode="login"
        message="Log in to build your watchlist."
        next="//evil.example"
      />
    );

    expect(screen.getByTestId("login-form")).toHaveAttribute("data-next", "");
    expect(screen.getByText("Log in to build your watchlist.")).toBeInTheDocument();
  });

  it("calls onClose from the close button", () => {
    const onClose = vi.fn();
    render(<AuthModal open onClose={onClose} initialMode="login" next="/" />);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
