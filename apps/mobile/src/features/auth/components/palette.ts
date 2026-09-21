import { useColorScheme } from "react-native";

export const authPalettes = {
  light: {
    paper: "#FFFFFF",
    ink: "#000000",
    field: "#F2F2F7",
    border: "#C6C6C8",
    secondary: "#636366",
    link: "#007AFF",
    error: "#C62828",
    success: "#26753D",
  },
  dark: {
    paper: "#000000",
    ink: "#FFFFFF",
    field: "#1C1C1E",
    border: "#48484A",
    secondary: "#AEAEB2",
    link: "#64A9FF",
    error: "#FF6961",
    success: "#66D98A",
  },
} as const;

// Signed-out surfaces follow the device, independently of saved account themes.
export function useAuthPalette() {
  return authPalettes[useColorScheme() === "dark" ? "dark" : "light"];
}
