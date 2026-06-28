# Graph Report - apps/api  (2026-06-28)

## Corpus Check
- 62 files · ~58,919 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 396 nodes · 977 edges · 14 communities (13 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Get Db()|Get Db()]]
- [[_COMMUNITY_Routes|Routes]]
- [[_COMMUNITY_Routes|Routes]]
- [[_COMMUNITY_Dependencies|Dependencies]]
- [[_COMMUNITY_Routes|Routes]]
- [[_COMMUNITY_Routes|Routes]]
- [[_COMMUNITY_Feed Cache|Feed Cache]]
- [[_COMMUNITY_Jobs|Jobs]]
- [[_COMMUNITY_Notifications|Notifications]]
- [[_COMMUNITY_Compiler Options|Compiler Options]]
- [[_COMMUNITY_Routes|Routes]]
- [[_COMMUNITY_Mention Notifications.e2e.test|Mention Notifications.e2e.test]]
- [[_COMMUNITY_Import Routes With Db Responses()|Import Routes With Db Responses()]]

## God Nodes (most connected - your core abstractions)
1. `getDb()` - 55 edges
2. `loadEnv()` - 31 edges
3. `badRequest()` - 29 edges
4. `notFound()` - 22 edges
5. `resolveProfileAvatarUrl()` - 22 edges
6. `getRedisClient()` - 14 edges
7. `resolvePublicMediaUrl()` - 14 edges
8. `getR2ObjectKeyFromUrl()` - 12 edges
9. `createNotification()` - 11 edges
10. `invalidateViewerFeedCaches()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `getUnreadNotificationCount()` --calls--> `getDb()`  [EXTRACTED]
  src/lib/notifications.ts → src/lib/db.ts
- `applyViewerInteractionFlags()` --calls--> `getDb()`  [EXTRACTED]
  src/modules/feed/routes.ts → src/lib/db.ts
- `highFollowerFolloweeIds()` --calls--> `getDb()`  [EXTRACTED]
  src/modules/feed/routes.ts → src/lib/db.ts
- `toCursor()` --calls--> `encodeCompositeCursor()`  [EXTRACTED]
  src/modules/notifications/routes.ts → src/lib/cursor.ts
- `createNotification()` --calls--> `getDb()`  [EXTRACTED]
  src/lib/notifications.ts → src/lib/db.ts

## Import Cycles
- None detected.

## Communities (14 total, 1 thin omitted)

### Community 0 - "Get Db()"
Cohesion: 0.06
Nodes (57): getDb(), initDb(), ApiError, forbidden(), notFound(), unauthorized(), ensureWatchlistForUser(), isMissingFilmListSchemaError() (+49 more)

### Community 1 - "Routes"
Cohesion: 0.05
Nodes (52): conflict(), notMutedByViewerSql(), feedHighFollowerCachePostLimit(), feedHighFollowerCacheTtlSeconds(), feedHighFollowerThreshold(), parseFeedHighFollowerCachePostLimit(), parseFeedHighFollowerCacheTtlSeconds(), parseFeedHighFollowerThreshold() (+44 more)

### Community 2 - "Routes"
Cohesion: 0.09
Nodes (37): Env, loadEnv(), parseCorsOrigins(), requireEnv(), connectionFromRedisUrl(), defaultJobOptions(), enqueueSuggestionRefresh(), getQueue() (+29 more)

### Community 3 - "Dependencies"
Cohesion: 0.06
Nodes (32): dependencies, @35mm/db, @35mm/types, @35mm/validators, @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, bullmq, @clerk/backend (+24 more)

### Community 4 - "Routes"
Cohesion: 0.09
Nodes (28): CompositeCursor, decodeCompositeCursor(), encodeCompositeCursor(), badRequest(), markNotificationRead(), markNotificationUnread(), decodeFeedScoreCursor(), getCommentDepth() (+20 more)

### Community 5 - "Routes"
Cohesion: 0.15
Nodes (22): configuredR2HostAndPath(), CoverVariants, createS3Client(), extractObjectKeyFromPathStyleR2Url(), getBucketName(), getR2ObjectKeyFromUrl(), getSignedUrlTtlSeconds(), isFullUrl() (+14 more)

### Community 6 - "Feed Cache"
Cohesion: 0.15
Nodes (27): authorIndexKey(), deleteKeysFromIndex(), FeedCachePayload, getFeedCache(), getHighFollowerAuthorFeedCache(), highFollowerAuthorFeedCacheKey(), HighFollowerAuthorFeedCachePayload, homeFeedCacheKey() (+19 more)

### Community 7 - "Jobs"
Cohesion: 0.13
Nodes (22): buildQueue(), connectionFromRedisUrl(), CounterIncrementJobPayload, CounterName, CounterTargetTable, defaultJobOptions(), enqueueCounterIncrementJob(), enqueueFeedFanoutJob() (+14 more)

### Community 8 - "Notifications"
Cohesion: 0.16
Nodes (16): canPreferenceNotify(), createNotification(), entityFilterClauses(), getUnreadNotificationCount(), hasNotificationSettingsEnabled(), isMissingActorIdsColumnError(), isMutedByRecipient(), markAllNotificationsRead() (+8 more)

### Community 9 - "Compiler Options"
Cohesion: 0.20
Nodes (9): compilerOptions, declaration, module, moduleResolution, outDir, rootDir, types, extends (+1 more)

### Community 10 - "Routes"
Cohesion: 0.36
Nodes (6): fetchSettingsForUser(), formatSettings(), isLegacySettingsSchemaError(), isValidAccentColor(), isValidTheme(), SettingsRecord

### Community 12 - "Import Routes With Db Responses()"
Cohesion: 0.60
Nodes (3): importRoutesWithDbResponses(), queryFor(), stubRequiredEnv()

## Knowledge Gaps
- **79 isolated node(s):** `name`, `version`, `private`, `type`, `node` (+74 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDb()` connect `Get Db()` to `Routes`, `Routes`, `Routes`, `Feed Cache`, `Notifications`, `Routes`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Why does `loadEnv()` connect `Routes` to `Get Db()`, `Routes`, `Feed Cache`, `Jobs`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `badRequest()` connect `Routes` to `Get Db()`, `Routes`, `Routes`, `Routes`, `Routes`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _79 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Get Db()` be split into smaller, more focused modules?**
  _Cohesion score 0.06288568909785483 - nodes in this community are weakly interconnected._
- **Should `Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.05134575569358178 - nodes in this community are weakly interconnected._
- **Should `Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.08879492600422834 - nodes in this community are weakly interconnected._