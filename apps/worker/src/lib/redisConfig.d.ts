export type RedisRestConfig = {
    baseUrl: string;
    token: string;
};
export declare function resolveCacheRedisRestConfig(): RedisRestConfig | null;
export declare function resolveQueueRedisUrl(): string;
