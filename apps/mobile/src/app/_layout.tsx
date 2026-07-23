import { Slot } from "expo-router";

import { AppProviders } from "@/providers";

export default function RootLayout() {
  return (
    <AppProviders>
      <Slot />
    </AppProviders>
  );
}
