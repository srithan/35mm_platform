export const suggestionsKeys = {
  all: ["suggestions"] as const,
  list: (limit: number, cursor: string | null) => {
    return ["suggestions", "users", limit, cursor] as const;
  },
};
