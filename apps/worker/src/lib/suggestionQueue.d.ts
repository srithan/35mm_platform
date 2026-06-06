import { Queue } from "bullmq";
import { type MediaProcessJobPayload } from "./queue.js";
export declare const SUGGESTION_JOB_NAME: "compute-suggestions";
export type SuggestionRefreshPayload = {
    userId: string;
};
export declare var suggestionQueue: Queue | null;
export declare function enqueueSuggestionRefresh(userId: string): Promise<void>;
export declare function closeSuggestionQueue(): Promise<void>;
export type { MediaProcessJobPayload };
