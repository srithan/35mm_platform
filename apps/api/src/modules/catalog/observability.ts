import type { CatalogEditSource, CatalogEntityRef } from "@35mm/types";

type CatalogMutationLogInput = {
  operation: string;
  editId?: string | null;
  actorUserId?: string | null;
  source?: CatalogEditSource | null;
  entityRefs?: CatalogEntityRef[];
  outcome: string;
  durationMs: number;
  error?: unknown;
};

export function logCatalogMutation(input: CatalogMutationLogInput): void {
  var payload = {
    operation: input.operation,
    editId: input.editId ?? null,
    actorUserId: input.actorUserId ?? null,
    source: input.source ?? null,
    entityRefs: input.entityRefs ?? [],
    outcome: input.outcome,
    durationMs: Math.round(input.durationMs),
  };

  if (input.error) {
    console.error("[catalog.mutation]", { ...payload, error: input.error });
    return;
  }

  console.log("[catalog.mutation]", payload);
}

export function logCatalogMetric(
  name: string,
  value: number,
  tags: Record<string, string | number | boolean | null> = {}
): void {
  console.log("[catalog.metric]", {
    name,
    value,
    tags,
  });
}

export function nowMs(): number {
  return performance.now();
}
