export const signupKeys = {
  all: ["auth", "signup"] as const,
  usernameAvailability: (username: string) =>
    [...signupKeys.all, "username-availability", username] as const,
};
