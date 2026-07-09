export const contributionKeys = {
  all: ["contributions"] as const,
  submissions: () => [...contributionKeys.all, "submissions"] as const,
};
