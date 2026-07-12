import { eq } from "drizzle-orm";
import { comments, posts, profiles } from "@35mm/db/schema";
import type { ModerationContentType } from "@35mm/types";
import { notFound } from "../../lib/errors.js";

type Tx = any;

export type ModerationTarget = {
  authorUserId: string;
  updatedAt: Date;
};

export async function resolveModerationTarget(
  tx: Tx,
  contentType: ModerationContentType,
  contentId: string
): Promise<ModerationTarget> {
  if (contentType === "post") {
    var postRows = await tx
      .select({ authorUserId: posts.userId, updatedAt: posts.updatedAt })
      .from(posts)
      .where(eq(posts.id, contentId))
      .limit(1);
    if (!postRows[0]) throw notFound("Moderation post target was not found");
    return postRows[0];
  }

  if (contentType === "comment") {
    var commentRows = await tx
      .select({ authorUserId: comments.userId, updatedAt: comments.updatedAt })
      .from(comments)
      .where(eq(comments.id, contentId))
      .limit(1);
    if (!commentRows[0]) throw notFound("Moderation comment target was not found");
    return commentRows[0];
  }

  var profileRows = await tx
    .select({ authorUserId: profiles.userId, updatedAt: profiles.updatedAt })
    .from(profiles)
    .where(eq(profiles.userId, contentId))
    .limit(1);
  if (!profileRows[0]) throw notFound("Moderation profile target was not found");
  return profileRows[0];
}
