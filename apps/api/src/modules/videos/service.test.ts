import { afterEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import {
  createBunnyVideo,
  playbackUrl,
  providerState,
  reconcileVideo,
  sha256,
  uploadCredentials,
  validWebhook,
  type BunnyConfig,
  type BunnyVideo,
  type VideoAsset,
} from "@35mm/db/video-service";
import type { Db } from "@35mm/db";
import { videoUploadSchema, publishFilmSchema } from "@35mm/validators";
const config: BunnyConfig = {
  BUNNY_STREAM_LIBRARY_ID: "123",
  BUNNY_STREAM_API_KEY: "test-upload-secret",
  BUNNY_STREAM_TOKEN_KEY: "test-player-secret",
  BUNNY_STREAM_WEBHOOK_SECRET: "test-webhook-secret",
  BUNNY_STREAM_CDN_HOST: "test.b-cdn.net",
  BUNNY_STREAM_POST_COLLECTION_ID: "d5f5a4c6-23be-4567-8901-234567890123",
  BUNNY_STREAM_FILM_COLLECTION_ID: "e5f5a4c6-23be-4567-8901-234567890123",
};
const asset = {
  id: "d5f5a4c6-23be-4567-8901-234567890123",
  providerId: "a5f5a4c6-23be-4567-8901-234567890123",
  libraryId: "123",
  createdAt: new Date(),
  purpose: "post",
  declaredBytes: 1000,
  state: "processing",
  isDeleted: false,
  stagingProviderId: "b5f5a4c6-23be-4567-8901-234567890123",
} as VideoAsset;
const video: BunnyVideo = {
  guid: asset.providerId!,
  videoLibraryId: 123,
  title: `35mm:${asset.id}`,
  status: 4,
  length: 2,
  width: 640,
  height: 360,
  storageSize: 2000,
  collectionId: config.BUNNY_STREAM_POST_COLLECTION_ID,
};
afterEach(() => vi.unstubAllGlobals());
function database(claim = true, current = asset) {
  const sets: Record<string, unknown>[] = [];
  const returning = vi
    .fn()
    .mockImplementation(async () =>
      sets.length === 1
        ? claim
          ? [current]
          : []
        : [{ ...current, ...sets.at(-1) }],
    );
  const db = {
    update: () => ({
      set: (value: Record<string, unknown>) => {
        sets.push(value);
        return { where: () => ({ returning }) };
      },
    }),
  } as unknown as Db;
  return { db, sets };
}
describe("Bunny video security and processing", () => {
  it("assigns new uploads to the collection for their purpose", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(Response.json({ ...video, collectionId: null }))
      .mockResolvedValueOnce(Response.json({ success: true }));
    vi.stubGlobal("fetch", fetcher);
    const created = await createBunnyVideo({ ...asset, purpose: "film" }, config);
    expect(created.collectionId).toBe(config.BUNNY_STREAM_FILM_COLLECTION_ID);
    expect(JSON.parse(fetcher.mock.calls[0]![1].body)).toEqual({
      title: `35mm:${asset.id}`,
      collectionId: config.BUNNY_STREAM_FILM_COLLECTION_ID,
    });
    expect(JSON.parse(fetcher.mock.calls[1]![1].body)).toEqual({
      collectionId: config.BUNNY_STREAM_FILM_COLLECTION_ID,
    });
  });
  it("repairs a provider collection mismatch during reconciliation", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(Response.json({ ...video, collectionId: null }))
      .mockResolvedValueOnce(Response.json({ success: true }))
      .mockResolvedValueOnce(Response.json({ success: true, data: { originals: 1000 } }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetcher);
    const { db } = database();
    expect((await reconcileVideo(db, asset, config)).state).toBe("ready");
    expect(fetcher.mock.calls[1]![0]).toContain(`/videos/${asset.providerId}`);
    expect(JSON.parse(fetcher.mock.calls[1]![1].body)).toEqual({
      collectionId: config.BUNNY_STREAM_POST_COLLECTION_ID,
    });
  });
  it("uses GET status 4 for readiness, never webhook event 3 or 6", () => {
    expect(providerState(video)).toBe("ready");
    expect(providerState({ ...video, status: 3 })).toBe("processing");
    expect(providerState({ ...video, status: 6 })).toBe("failed");
    expect(providerState({ ...video, width: 0 })).toBe("processing");
  });
  it("checks the exact webhook bytes and version", () => {
    const raw = '{"VideoLibraryId":123}';
    const headers = new Headers({
      "X-BunnyStream-Signature-Version": "v1",
      "X-BunnyStream-Signature-Algorithm": "hmac-sha256",
      "X-BunnyStream-Signature": createHmac(
        "sha256",
        config.BUNNY_STREAM_WEBHOOK_SECRET,
      )
        .update(raw)
        .digest("hex"),
    });
    expect(validWebhook(raw, headers, config)).toBe(true);
    expect(validWebhook(raw + " ", headers, config)).toBe(false);
    headers.set("X-BunnyStream-Signature", "bad");
    expect(validWebhook(raw, headers, config)).toBe(false);
  });
  it("binds upload grants to the asset and fixed expiration; playback expires in five minutes", () => {
    const grant = uploadCredentials(
      { ...asset, stagingProviderId: null },
      config,
    );
    expect(grant.signature).toBe(
      sha256(
        "123" + config.BUNNY_STREAM_API_KEY + grant.expires + asset.providerId,
      ),
    );
    expect(grant.expires).toBe(
      Math.floor(asset.createdAt.getTime() / 1000) + 86400,
    );
    const playback = playbackUrl(asset, config, 1000000);
    expect(playback.expires).toBe(1300);
    const poster = new URL(playback.posterUrl);
    expect(poster.pathname).toBe(`/${asset.providerId}/thumbnail.jpg`);
    expect(poster.searchParams.get("expires")).toBe("1300");
    expect(poster.searchParams.get("token")).toBe(
      Buffer.from(sha256(config.BUNNY_STREAM_TOKEN_KEY + poster.pathname + 1300), "hex").toString("base64url"),
    );
    expect(playback.embedUrl).toContain(
      sha256(config.BUNNY_STREAM_TOKEN_KEY + asset.providerId + 1300),
    );
    expect(JSON.stringify(playback)).not.toContain(config.BUNNY_STREAM_API_KEY);
  });
  it("does not regress an acknowledged upload while Bunny starts encoding", async () => {
    const stage = { ...asset, stagingProviderId: null };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ ...video, status: 0 })));
    const { db } = database(true, stage);
    expect((await reconcileVideo(db, stage, config)).state).toBe("processing");
  });
  it("does not call Bunny when another request holds the processing lease", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const { db } = database(false);
    expect(await reconcileVideo(db, asset, config)).toEqual(asset);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([
    [1000, 2, "ready"],
    [1001, 2, "failed"],
    [0, 2, "processing"],
    [1000, 601, "failed"],
  ])(
    "validates actual original bytes %i and duration %i before %s",
    async (originals, length, expected) => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(Response.json({ ...video, length }))
          .mockResolvedValueOnce(
            Response.json({ success: true, data: { originals } }),
          )
          .mockResolvedValueOnce(Response.json({ success: true })),
      );
      const { db } = database();
      expect((await reconcileVideo(db, asset, config)).state).toBe(expected);
    },
  );
  it("reserves a server-only final copy instead of publishing the reusable TUS target", async () => {
    const stage = { ...asset, stagingProviderId: null };
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json(video))
      .mockResolvedValueOnce(
        Response.json({ success: true, data: { originals: 1000 } }),
      )
      .mockResolvedValueOnce(Response.json({ success: true }));
    vi.stubGlobal("fetch", fetcher);
    const { db, sets } = database(true, stage);
    const result = await reconcileVideo(db, stage, config);
    expect(result.state).toBe("processing");
    expect(result.providerId).toBeNull();
    expect(result.stagingProviderId).toBe(stage.providerId);
    expect(sets.at(-1)?.finalizationStartedAt).toBeInstanceOf(Date);
    expect(fetcher.mock.calls[2]?.[0]).toContain(
      `/videos/fetch?collectionId=${config.BUNNY_STREAM_POST_COLLECTION_ID}`,
    );
    const body = JSON.parse(fetcher.mock.calls[2]?.[1].body);
    expect(body.title).toBe(`35mm:sealed:${asset.id}`);
    expect(body.url).toContain(`/${stage.providerId}/original?token=`);
    expect(() => uploadCredentials(result, config)).toThrow();
  });
  it("accepts Bunny's empty successful DELETE body when removing staging media", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(Response.json(video))
        .mockResolvedValueOnce(
          Response.json({ success: true, data: { originals: 1000 } }),
        )
        .mockResolvedValueOnce(new Response(null, { status: 200 })),
    );
    const { db } = database();
    expect((await reconcileVideo(db, asset, config)).state).toBe("ready");
  });
  it("rejects oversized declarations before provider creation", () => {
    const input = {
      idempotencyKey: asset.id,
      purpose: "post",
      filename: "film.mp4",
      contentType: "video/mp4",
      contentLength: 120 * 1024 * 1024,
    };
    expect(videoUploadSchema.safeParse(input).success).toBe(true);
    expect(
      videoUploadSchema.safeParse({
        ...input,
        contentLength: input.contentLength + 1,
      }).success,
    ).toBe(false);
    expect(
      videoUploadSchema.safeParse({ ...input, contentType: "text/html" })
        .success,
    ).toBe(false);
    expect(publishFilmSchema.safeParse({ title: "Only a title" }).success).toBe(
      false,
    );
  });
});
