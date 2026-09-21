import type { ReactNode } from "react";
import { AuthScaffold } from "../components/AuthScaffold";

export interface PasswordResetScaffoldProps {
  readonly headline: string;
  readonly subtitle: string;
  readonly onBack: () => void;
  readonly children: ReactNode;
  readonly testID: string;
}
export function PasswordResetScaffold(props: PasswordResetScaffoldProps) {
  return <AuthScaffold {...props} title="Reset password" />;
}
