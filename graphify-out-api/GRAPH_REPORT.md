# Graph Report - apps/api  (2026-07-11)

## Corpus Check
- 70 files · ~93,003 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 749 nodes · 2036 edges · 31 communities (27 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bd7a2b16`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

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
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]

## God Nodes (most connected - your core abstractions)
1. `getDb()` - 99 edges
2. `badRequest()` - 47 edges
3. `loadEnv()` - 39 edges
4. `getRedisClient()` - 36 edges
5. `notFound()` - 34 edges
6. `getWriteDb()` - 28 edges
7. `mergeCatalogEntities()` - 26 edges
8. `resolveProfileAvatarUrl()` - 22 edges
9. `createRateLimitMiddleware()` - 21 edges
10. `createUlid()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `toCursor()` --calls--> `encodeCompositeCursor()`  [EXTRACTED]
  src/modules/notifications/routes.ts → src/lib/cursor.ts
- `getUnreadNotificationCount()` --calls--> `getDb()`  [EXTRACTED]
  src/lib/notifications.ts → src/lib/db.ts
- `explain()` --calls--> `getDb()`  [EXTRACTED]
  src/modules/catalog/read.db.test.ts → src/lib/db.ts
- `restoreDeletedThreadForMembers()` --calls--> `getDb()`  [EXTRACTED]
  src/modules/chat/routes.ts → src/lib/db.ts
- `applyViewerInteractionFlags()` --calls--> `getDb()`  [EXTRACTED]
  src/modules/feed/routes.ts → src/lib/db.ts

## Import Cycles
- None detected.

## Communities (31 total, 4 thin omitted)

### Community 0 - "Get Db()"
Cohesion: 0.18
Nodes (16): forbidden(), assertCanInteractWithPost(), assertNoBlockBetween(), blockFiltersForAuthor(), getModerationStatus(), ModerationStatus, notBlockedByAuthorSql(), notBlockedByViewerSql() (+8 more)

### Community 1 - "Routes"
Cohesion: 0.07
Nodes (25): applyPendingPostCounterDeltas(), applyViewerInteractionFlags(), applyVisiblePostCountersToRows(), CachedHighFollowerAuthorRow, compareHomeFeedRows(), CreatePostInput, FeedPoll, FeedScoreCursor (+17 more)

### Community 2 - "Routes"
Cohesion: 0.09
Nodes (44): Env, loadEnv(), parseCorsOrigins(), requireEnv(), withLocalDevCorsOrigins(), EmailNotificationType, isObjectRecord(), parseUnsubscribeToken() (+36 more)

### Community 3 - "Dependencies"
Cohesion: 0.06
Nodes (35): dependencies, @35mm/db, @35mm/types, @35mm/validators, @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, aws-sigv4-auth-cassandra-plugin, bullmq (+27 more)

### Community 4 - "Routes"
Cohesion: 0.16
Nodes (17): markNotificationRead(), AvatarVariants, resolveProfileAvatarUrl(), ActorProfile, asNotificationItem(), EntityCommentRow, EntityFilmRow, EntityPostRow (+9 more)

### Community 5 - "Routes"
Cohesion: 0.05
Nodes (89): getWriteDb(), initDb(), conflict(), createUlid(), encodeRandom(), encodeTime(), apiErrorPayload(), applyCatalogEdit() (+81 more)

### Community 6 - "Feed Cache"
Cohesion: 0.08
Nodes (36): authorIndexKey(), deleteKeysFromIndex(), FeedCachePayload, getFeedCache(), highFollowerAuthorFeedCacheKey(), HighFollowerAuthorFeedCachePayload, homeFeedCacheKey(), invalidateAuthorProfileFeedCaches() (+28 more)

### Community 7 - "Jobs"
Cohesion: 0.12
Nodes (29): serviceUnavailable(), buildQueue(), ChatDeliverJobPayload, ChatJobName, ChatJobPayloadByName, ChatMessageUpdatedJobPayload, ChatReadReceiptJobPayload, ChatTypingJobPayload (+21 more)

### Community 8 - "Notifications"
Cohesion: 0.12
Nodes (21): canPreferenceNotify(), createNotification(), entityFilterClauses(), getUnreadNotificationCount(), hasNotificationSettingsEnabled(), isMissingActorIdsColumnError(), isMutedByRecipient(), markAllNotificationsRead() (+13 more)

### Community 9 - "Compiler Options"
Cohesion: 0.06
Nodes (67): getKeyspacesClient(), numberEnv(), tryGetKeyspacesClient(), warmKeyspacesClient(), getRedisClient(), activityVisibilityKey(), clearTyping(), getActivityVisibilityCache() (+59 more)

### Community 10 - "Routes"
Cohesion: 0.13
Nodes (19): findUsernameLock(), isMissingUsernameLocksTable(), UsernameLockLookup, importRoutesWithDbResponses(), queryFor(), stubRequiredEnv(), fetchSettingsForUser(), formatSettings() (+11 more)

### Community 12 - "Import Routes With Db Responses()"
Cohesion: 0.10
Nodes (64): getDb(), notFound(), catalogReadCacheKey(), CatalogReadCachePayload, getCatalogReadCache(), normalizePart(), setCatalogReadCache(), companyCard() (+56 more)

### Community 14 - "Community 14"
Cohesion: 0.17
Nodes (14): CounterWriter, keyFor(), recordCounterDeltas(), validateCounterDelta(), wakeCounterOutbox(), CompositeCursor, encodeCompositeCursor(), CounterIncrementJobPayload (+6 more)

### Community 15 - "Community 15"
Cohesion: 0.16
Nodes (19): decodeCompositeCursor(), badRequest(), ensureWatchlistForUser(), isMissingFilmListSchemaError(), nextListPosition(), resolveFilmId(), tryEnsureWatchlistForUser(), watchlistShareSlug() (+11 more)

### Community 16 - "Community 16"
Cohesion: 0.13
Nodes (15): canViewList(), decodeListEntryCursor(), encodeListEntryCursor(), FilmListEntriesPage, ListCursor, listEntries(), ListEntriesDbContext, ListEntryCursor (+7 more)

### Community 17 - "Community 17"
Cohesion: 0.17
Nodes (12): ApiError, isQueueEnabled(), buildClient(), configKey(), getRateLimitRedisClient(), isRedisEnabled(), RedisClient, UpstashResult (+4 more)

### Community 18 - "Community 18"
Cohesion: 0.15
Nodes (10): connectionFromRedisUrl(), defaultJobOptions(), enqueueSuggestionRefresh(), getQueue(), getRedisUrl(), SUGGESTION_JOB_NAME, SuggestionRefreshPayload, asFollowSuggestion() (+2 more)

### Community 19 - "Community 19"
Cohesion: 0.23
Nodes (11): unauthorized(), AuthEnv, AuthUser, clerkSecretKeys(), displayNameForClerkUser(), emailForClerkUser(), ensureLocalUser(), getOptionalAuthUser() (+3 more)

### Community 20 - "Community 20"
Cohesion: 0.23
Nodes (11): applyLocalRateLimit(), applyRateLimit(), createRateLimitMiddleware(), identifyByIp(), ipFromRequest(), localFallbackEnabled(), LocalRateLimitEntry, localRateLimitKey() (+3 more)

### Community 21 - "Community 21"
Cohesion: 0.27
Nodes (10): toPostItem(), cleanNumber(), cleanString(), cleanType(), feedMediaUrl(), fullMediaUrl(), isRecord(), normalizePostMediaItem() (+2 more)

### Community 22 - "Community 22"
Cohesion: 0.27
Nodes (8): feedHighFollowerCachePostLimit(), feedHighFollowerCacheTtlSeconds(), feedHighFollowerThreshold(), parseFeedHighFollowerCachePostLimit(), parseFeedHighFollowerCacheTtlSeconds(), parseFeedHighFollowerThreshold(), highFollowerLiveRowsFromAuthorCache(), shouldUseColdFeedFallback()

### Community 23 - "Community 23"
Cohesion: 0.35
Nodes (8): closeApiQueue(), explicitRestConfig(), protocolUrlFromRestConfig(), protocolUrlToRestConfig(), resolveCacheRedisRestConfig(), resolveQueueRedisUrl(), resolveRateLimitRedisRestConfig(), splitRedisConfigured()

### Community 24 - "Community 24"
Cohesion: 0.22
Nodes (10): applyMentionMetadataToNode(), collectMentionIdsFromNode(), dateFromDb(), hydratePostPoll(), hydratePostPollsForRows(), hydratePostRichMentionsForRows(), hydratePostsForRows(), hydrateRichMentions() (+2 more)

### Community 25 - "Community 25"
Cohesion: 0.20
Nodes (9): compilerOptions, declaration, module, moduleResolution, outDir, rootDir, types, extends (+1 more)

### Community 26 - "Community 26"
Cohesion: 0.38
Nodes (7): feedScoreCursorSql(), feedScoreSql(), getPostById(), postVisibilitySql(), profileAccessSql(), selectHighFollowerAuthorRowsFromDb(), selectLiveHomeFeedRows()

### Community 27 - "Community 27"
Cohesion: 0.40
Nodes (5): getHighFollowerAuthorFeedCache(), highFollowerAuthorRowsFromCache(), homeRowFromCachedHighFollowerAuthorRow(), passesFeedScoreCursor(), rankHighFollowerAuthorCacheRows()

## Knowledge Gaps
- **135 isolated node(s):** `name`, `version`, `private`, `type`, `node` (+130 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDb()` connect `Import Routes With Db Responses()` to `Get Db()`, `Routes`, `Routes`, `Routes`, `Routes`, `Feed Cache`, `Notifications`, `Compiler Options`, `Routes`, `Community 14`, `Community 15`, `Community 16`, `Community 18`, `Community 19`, `Community 24`, `Community 26`, `Community 28`, `Community 29`?**
  _High betweenness centrality (0.134) - this node is a cross-community bridge._
- **Why does `badRequest()` connect `Community 15` to `Routes`, `Routes`, `Routes`, `Routes`, `Feed Cache`, `Compiler Options`, `Routes`, `Import Routes With Db Responses()`, `Community 14`, `Community 16`, `Community 28`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Why does `getWriteDb()` connect `Routes` to `Routes`, `Feed Cache`, `Compiler Options`, `Community 14`, `Community 16`, `Community 19`, `Community 28`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _135 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.06951871657754011 - nodes in this community are weakly interconnected._
- **Should `Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.09200603318250378 - nodes in this community are weakly interconnected._
- **Should `Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05555555555555555 - nodes in this community are weakly interconnected._