import { cn } from "@/lib/utils/cn";

type ButtonSpinnerProps = {
  className?: string;
  tone?: "primary" | "accent" | "composer-publish";
};

export function ButtonSpinner({ className, tone = "primary" }: ButtonSpinnerProps) {
  const trackVar =
    tone === "accent"
      ? "--accent-button-spinner-track"
      : tone === "composer-publish"
        ? "--composer-publish-spinner-track"
        : "--button-spinner-track";
  const tipVar =
    tone === "accent"
      ? "--accent-button-spinner-tip"
      : tone === "composer-publish"
        ? "--composer-publish-spinner-tip"
        : "--button-spinner-tip";

  return (
    <span
      className={cn(
        "inline-block shrink-0 rounded-full border-2 animate-spin [animation-duration:0.5s]",
        className
      )}
      style={{
        borderColor: "var(" + trackVar + ")",
        borderTopColor: "var(" + tipVar + ")",
      }}
      aria-hidden
    />
  );
}
