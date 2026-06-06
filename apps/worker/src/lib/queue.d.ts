export declare const WORKER_QUEUE_NAME = "35mm-jobs";
export type MediaProcessJobPayload = {
    postId: string;
};
export declare function enqueueMediaProcessJob(payload: MediaProcessJobPayload): Promise<void>;
export declare function closeWorkerProducerQueue(): Promise<void>;
