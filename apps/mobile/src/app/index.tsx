import { AuthBootstrapGate } from "@/features/auth/bootstrap/AuthBootstrapGate";
import { SignupCompletionRecoveryGate } from "@/features/auth/signup/SignupCompletionRecoveryGate";
import { WelcomeScreen } from "@/features/auth/welcome/WelcomeScreen";
import { FoundationGallery } from "@/harness/FoundationGallery";

export default function IndexRoute() {
  return (
    <SignupCompletionRecoveryGate>
      <AuthBootstrapGate>
        {(destination) =>
          destination.status === "signedOut" ? (
            <WelcomeScreen />
          ) : (
            <FoundationGallery />
          )
        }
      </AuthBootstrapGate>
    </SignupCompletionRecoveryGate>
  );
}
