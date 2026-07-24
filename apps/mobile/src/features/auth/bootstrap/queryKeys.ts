export const authBootstrapKeys = {
  all: ["auth-bootstrap"] as const,
  session: (userId: string) => ["auth-bootstrap", "session", userId] as const,
};
