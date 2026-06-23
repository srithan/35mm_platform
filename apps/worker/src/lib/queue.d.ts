export declare const WORKER_QUEUE_NAME = "35mm-jobs";
export type MediaProcessJobPayload = {
    postId: string;
} | {
    kind: "avatar" | "cover";
    userId: string;
    objectKey: string;
};
export declare function enqueueMediaProcessJob(payload: MediaProcessJobPayload): Promise<void>;
export declare function closeWorkerProducerQueue(): Promise<void>;
