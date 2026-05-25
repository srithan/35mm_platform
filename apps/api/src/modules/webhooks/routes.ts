import { Hono } from "hono";
import { Webhook } from "svix";
import { eq, sql } from "drizzle-orm";
import { users, profiles, userSettings } from "@35mm/db/schema";
import { getDb } from "../../lib/db.js";

export var webhookRoutes = new Hono();

webhookRoutes.post("/clerk", async function (c) {
  var webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return c.json({ code: "CONFIG_ERROR", message: "Webhook secret not configured" }, 500);
  }

  var svixId = c.req.header("svix-id");
  var svixTimestamp = c.req.header("svix-timestamp");
  var svixSignature = c.req.header("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return c.json({ code: "BAD_REQUEST", message: "Missing Svix headers" }, 400);
  }

  var body = await c.req.text();
  var wh = new Webhook(webhookSecret);
  var event: any;

  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch (_err) {
    return c.json({ code: "UNAUTHORIZED", message: "Invalid webhook signature" }, 401);
  }

  var db = getDb();

  if (event.type === "user.created") {
    var data = event.data;
    var clerkId = data.id as string;
    var email = (data.email_addresses?.[0]?.email_address ?? "") as string;
    var firstName = (data.first_name ?? "") as string;
    var lastName = (data.last_name ?? "") as string;
    var displayName = (firstName + " " + lastName).trim() || "User";
    var username = (data.username ?? clerkId) as string;

    var inserted = await db
      .insert(users)
      .values({
        clerkUserId: clerkId,
        email: email,
        ageVerifiedAt: new Date(),
        status: "active",
      })
      .returning({ id: users.id })
      .onConflictDoNothing();

    if (inserted.length > 0) {
      var userId = inserted[0].id;

      await db.insert(profiles).values({
        userId: userId,
        username: username.toLowerCase(),
        displayName: displayName,
        avatarUrl: null,
        bio: null,
        coverUrl: null,
        location: null,
        website: null,
        role: null,
        roleContext: null,
      });

      await db.execute(
        sql`insert into "user_settings" ("user_id") values (${userId}) on conflict ("user_id") do nothing`
      );
    }
  }

  if (event.type === "user.updated") {
    var data = event.data;
    var clerkId = data.id as string;
    var email = (data.email_addresses?.[0]?.email_address ?? "") as string;

    await db
      .update(users)
      .set({ email: email, updatedAt: new Date() })
      .where(eq(users.clerkUserId, clerkId));
  }

  if (event.type === "user.deleted") {
    var data = event.data;
    var clerkId = data.id as string;

    await db
      .update(users)
      .set({ status: "deactivated", updatedAt: new Date() })
      .where(eq(users.clerkUserId, clerkId));
  }

  return c.json({ received: true });
});
