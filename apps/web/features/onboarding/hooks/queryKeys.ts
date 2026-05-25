export const onboardingKeys = {
  all: ["onboarding"] as const,
  status: () => ["onboarding", "status"] as const,
  suggestions: () => ["onboarding", "suggestions"] as const,
};
