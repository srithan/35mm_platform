import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

export const queryPersister = createSyncStoragePersister({
  storage: typeof window !== "undefined" ? window.sessionStorage : undefined,
  key: "35mm-query-cache",
  throttleTime: 1000,
});
