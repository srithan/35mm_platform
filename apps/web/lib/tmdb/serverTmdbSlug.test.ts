import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveTmdbPersonSlug, resolveTmdbTitleSlug } from "./serverTmdbSlug";
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
describe("catalog-backed slug resolution", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
  it("retains title fallback", async () => {
    vi.stubEnv("TMDB_API_KEY", "test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(json({}, 404))
      .mockResolvedValueOnce(json({ results: [{id: 1386315, title: "The Runner", overview: "A runner."}] })));
    expect(await resolveTmdbTitleSlug("movie", "the-runner")).toEqual({id: "1386315", tmdbId: "1386315", title: "The Runner", description: "A runner."});
  });
  it.each(["writer", "director", "actor"] as const)("preserves exact identity through %s role without searching", async role => {
    const fetch = vi.fn().mockResolvedValue(json({ primaryName: "Mark Gibson", externalIds: [{provider:"tmdb", externalId:"60208"}] }));
    vi.stubGlobal("fetch", fetch);
    expect(await resolveTmdbPersonSlug("mark-gibson", role)).toEqual({id:"60208", name:"Mark Gibson"});
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("keeps numbered slugs assigned to distinct IDs", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({primaryName:"Mark Gibson", externalIds:[{provider:"tmdb",externalId:"933123"}]})));
    expect(await resolveTmdbPersonSlug("mark-gibson-2", "actor")).toEqual({id:"933123",name:"Mark Gibson"});
  });
  it("bootstraps legacy links using persisted identity, not name matching", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(json({},404)).mockResolvedValueOnce(json({items:[
      {tmdbId:1,slug:"kevin-macdonald-2",name:"Kevin Macdonald"},
      {tmdbId:2,slug:"kevin-macdonald",name:"Kevin Macdonald"},
    ]})));
    expect(await resolveTmdbPersonSlug("kevin-macdonald", "director")).toEqual({id:"2",name:"Kevin Macdonald"});
  });
  it("does not turn catalog outages into 404s or search guesses", async () => {
    const fetch = vi.fn().mockResolvedValue(json({},503));
    vi.stubGlobal("fetch",fetch);
    await expect(resolveTmdbPersonSlug("kevin-macdonald")).rejects.toThrow("503");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
