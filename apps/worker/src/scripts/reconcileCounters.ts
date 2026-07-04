import { createDb, type Db } from "@35mm/db";
import {
  commentLikes,
  comments,
  filmListEntries,
  filmListLikes,
  filmLists,
  pollOptions,
  pollVotes,
  postBookmarks,
  postLikes,
  postPolls,
  postReposts,
  posts,
} from "@35mm/db/schema";
import { count, eq, sql, type SQL } from "drizzle-orm";
import { loadWorkerEnv } from "../lib/env.js";

type CounterScope =
  | "posts"
  | "comments"
  | "post_polls"
  | "poll_options"
  | "film_lists"
  | "all";

type Args = {
  scope: CounterScope;
  id: string | null;
  dryRun: boolean;
};

function parseArgs(argv: string[]): Args {
  var scope: CounterScope = "all";
  var id: string | null = null;
  var dryRun = false;

  for (var arg of argv) {
    if (arg === "--") {
      continue;
    }
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg.startsWith("--scope=")) {
      var value = arg.slice("--scope=".length);
      if (!["posts", "comments", "post_polls", "poll_options", "film_lists", "all"].includes(value)) {
        throw new Error("Invalid --scope value");
      }
      scope = value as CounterScope;
      continue;
    }
    if (arg.startsWith("--id=")) {
      id = arg.slice("--id=".length);
      continue;
    }
    throw new Error("Unknown arg: " + arg);
  }

  return { scope, id, dryRun };
}

async function countRows(
  database: Db,
  table: any,
  whereSql: SQL
): Promise<number> {
  var rows = await database.select({ value: count() }).from(table).where(whereSql);
  return Number(rows[0]?.value ?? 0);
}

async function reconcilePosts(database: Db, id: string | null, dryRun: boolean): Promise<void> {
  var targetRows = await database
    .select({ id: posts.id })
    .from(posts)
    .where(id ? eq(posts.id, id) : sql`true`);

  for (var row of targetRows) {
    var likeCount = await countRows(database, postLikes, eq(postLikes.postId, row.id));
    var commentCount = await countRows(
      database,
      comments,
      sql`${comments.postId} = ${row.id} and ${comments.isDeleted} = false`
    );
    var repostCount = await countRows(database, postReposts, eq(postReposts.postId, row.id));
    var bookmarkCount = await countRows(database, postBookmarks, eq(postBookmarks.postId, row.id));

    console.log("[reconcile:counters] posts", {
      id: row.id,
      likeCount,
      commentCount,
      repostCount,
      bookmarkCount,
      dryRun,
    });

    if (!dryRun) {
      await database
        .update(posts)
        .set({ likeCount, commentCount, repostCount, bookmarkCount, updatedAt: new Date() })
        .where(eq(posts.id, row.id));
    }
  }
}

async function reconcileComments(database: Db, id: string | null, dryRun: boolean): Promise<void> {
  var targetRows = await database
    .select({ id: comments.id })
    .from(comments)
    .where(id ? eq(comments.id, id) : sql`true`);

  for (var row of targetRows) {
    var likeCount = await countRows(database, commentLikes, eq(commentLikes.commentId, row.id));
    console.log("[reconcile:counters] comments", { id: row.id, likeCount, dryRun });
    if (!dryRun) {
      await database
        .update(comments)
        .set({ likeCount, updatedAt: new Date() })
        .where(eq(comments.id, row.id));
    }
  }
}

async function reconcilePostPolls(database: Db, id: string | null, dryRun: boolean): Promise<void> {
  var targetRows = await database
    .select({ id: postPolls.id })
    .from(postPolls)
    .where(id ? eq(postPolls.id, id) : sql`true`);

  for (var row of targetRows) {
    var totalVotes = await countRows(database, pollVotes, eq(pollVotes.pollId, row.id));
    console.log("[reconcile:counters] post_polls", { id: row.id, totalVotes, dryRun });
    if (!dryRun) {
      await database
        .update(postPolls)
        .set({ totalVotes, updatedAt: new Date() })
        .where(eq(postPolls.id, row.id));
    }
  }
}

async function reconcilePollOptions(database: Db, id: string | null, dryRun: boolean): Promise<void> {
  var optionRows = await database
    .select({
      id: pollOptions.id,
      pollId: pollOptions.pollId,
      position: pollOptions.position,
    })
    .from(pollOptions)
    .where(id ? eq(pollOptions.id, id) : sql`true`);

  for (var option of optionRows) {
    var imageVotes = await countRows(database, pollVotes, eq(pollVotes.optionId, option.id));
    var rankingRows = await database
      .select({ rankingOptionIds: pollVotes.rankingOptionIds })
      .from(pollVotes)
      .where(eq(pollVotes.pollId, option.pollId));
    var rankingScore = rankingRows.reduce(function (sum, vote) {
      var ids = vote.rankingOptionIds ?? [];
      var index = ids.indexOf(option.id);
      if (index < 0) return sum;
      return sum + ids.length - index;
    }, 0);
    var voteCount = imageVotes + rankingScore;

    console.log("[reconcile:counters] poll_options", {
      id: option.id,
      voteCount,
      dryRun,
    });

    if (!dryRun) {
      await database
        .update(pollOptions)
        .set({ voteCount })
        .where(eq(pollOptions.id, option.id));
    }
  }
}

async function reconcileFilmLists(database: Db, id: string | null, dryRun: boolean): Promise<void> {
  var targetRows = await database
    .select({ id: filmLists.id })
    .from(filmLists)
    .where(id ? eq(filmLists.id, id) : sql`true`);

  for (var row of targetRows) {
    var likeCount = await countRows(database, filmListLikes, eq(filmListLikes.listId, row.id));
    var entryCount = await countRows(database, filmListEntries, eq(filmListEntries.listId, row.id));

    console.log("[reconcile:counters] film_lists", {
      id: row.id,
      likeCount,
      entryCount,
      commentCount: "unchanged",
      dryRun,
    });

    if (!dryRun) {
      await database
        .update(filmLists)
        .set({ likeCount, entryCount, updatedAt: new Date() })
        .where(eq(filmLists.id, row.id));
    }
  }
}

async function main(): Promise<void> {
  var args = parseArgs(process.argv.slice(2));
  var database = createDb(loadWorkerEnv().DATABASE_URL);

  if (args.scope === "all" || args.scope === "posts") {
    await reconcilePosts(database, args.scope === "posts" ? args.id : null, args.dryRun);
  }
  if (args.scope === "all" || args.scope === "comments") {
    await reconcileComments(database, args.scope === "comments" ? args.id : null, args.dryRun);
  }
  if (args.scope === "all" || args.scope === "post_polls") {
    await reconcilePostPolls(database, args.scope === "post_polls" ? args.id : null, args.dryRun);
  }
  if (args.scope === "all" || args.scope === "poll_options") {
    await reconcilePollOptions(database, args.scope === "poll_options" ? args.id : null, args.dryRun);
  }
  if (args.scope === "all" || args.scope === "film_lists") {
    await reconcileFilmLists(database, args.scope === "film_lists" ? args.id : null, args.dryRun);
  }
}

void main().catch(function (error) {
  console.error("[reconcile:counters] failed", error);
  process.exitCode = 1;
});
