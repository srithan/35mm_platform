import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary";
}

export function Button({ children, variant = "primary", ...props }: ButtonProps) {
  const base: CSSProperties = {
    borderRadius: 8,
    cursor: props.disabled ? "not-allowed" : "pointer",
    fontSize: 14,
    fontWeight: 650,
    lineHeight: 1,
    opacity: props.disabled ? 0.5 : 1,
    padding: "11px 16px"
  };

  const style: CSSProperties =
    variant === "primary"
      ? {
          ...base,
          background: "#181716",
          border: "1px solid #181716",
          color: "#fff"
        }
      : {
          ...base,
          background: "#fff",
          border: "1px solid #d8d0c6",
          color: "#181716"
        };

  return (
    <button {...props} style={{ ...style, ...props.style }}>
      {children}
    </button>
  );
}
