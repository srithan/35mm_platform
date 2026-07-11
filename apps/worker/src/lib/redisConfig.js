import { loadWorkerEnv } from "./env.js";
function protocolUrlToRestConfig(value) {
    var trimmed = value.trim();
    if (!trimmed)
        return null;
    try {
        var parsed = new URL(trimmed);
        if (parsed.protocol !== "redis:" && parsed.protocol !== "rediss:")
            return null;
        var token = decodeURIComponent(parsed.password || "");
        if (!parsed.hostname || !token)
            return null;
        return {
            baseUrl: "https://" + parsed.hostname,
            token,
        };
    }
    catch (_error) {
        return null;
    }
}
function explicitRestConfig(url, token) {
    var trimmedUrl = url.trim();
    var trimmedToken = token.trim();
    if (!trimmedUrl || !trimmedToken)
        return null;
    try {
        var parsed = new URL(trimmedUrl);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
            return null;
        return {
            baseUrl: trimmedUrl.replace(/\/+$/, ""),
            token: trimmedToken,
        };
    }
    catch (_error) {
        return null;
    }
}
function protocolUrlFromRestConfig(url, token) {
    var parsed = new URL(url);
    return `rediss://default:${encodeURIComponent(token)}@${parsed.host}:6379`;
}
export function resolveCacheRedisRestConfig() {
    var env = loadWorkerEnv();
    return (protocolUrlToRestConfig(env.UPSTASH_REDIS_URL) ??
        explicitRestConfig(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN));
}
export function resolveQueueRedisUrl() {
    var env = loadWorkerEnv();
    var direct = env.QUEUE_REDIS_URL.trim();
    if (direct)
        return direct;
    var queueRest = explicitRestConfig(env.QUEUE_REDIS_REST_URL, env.QUEUE_REDIS_REST_TOKEN);
    if (queueRest)
        return protocolUrlFromRestConfig(queueRest.baseUrl, queueRest.token);
    return "";
}
