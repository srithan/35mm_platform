import { afterEach, describe, expect, it, vi } from "vitest";
import { attachPersonSlugs } from "./personIdentity";
vi.mock("next/headers", () => ({ headers: async () => new Headers({"x-forwarded-for":"192.0.2.1"}) }));
afterEach(() => vi.unstubAllGlobals());
describe("credit identity propagation", () => {
  it("matches duplicate names by ID and preserves every credit", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({items:[
      {tmdbId:20,name:"Same Name",slug:"same-name-2"},
      {tmdbId:10,name:"Same Name",slug:"same-name"},
    ]})));
    vi.stubGlobal("fetch",fetch);
    const result = await attachPersonSlugs(["movie","42"],new URLSearchParams(),{
      credits:{cast:[{id:20,name:"Same Name"}],crew:[{id:10,name:"Same Name",job:"Director"},{id:10,name:"Same Name",job:"Writer"}]},
    });
    expect(result).toMatchObject({credits:{cast:[{id:20,slug:"same-name-2"}],
      crew:[{id:10,slug:"same-name",job:"Director"},{id:10,slug:"same-name",job:"Writer"}]}});
    expect(fetch.mock.calls[0][1].headers["x-forwarded-for"]).toBe("192.0.2.1");
  });
  it("keeps multi-search pagination and ignores movie rows", async () => {
    const fetch=vi.fn().mockResolvedValue(new Response(JSON.stringify({items:[{tmdbId:20,name:"Same Name",slug:"same-name-2"}]})));
    vi.stubGlobal("fetch",fetch);
    const result=await attachPersonSlugs(["search","multi"],new URLSearchParams("query=same&page=2"),{
      results:[{id:99,media_type:"movie",title:"Same"},{id:20,media_type:"person",name:"Same Name"}],
    });
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({mode:"multi",page:2});
    expect(result).toEqual({results:[{id:99,media_type:"movie",title:"Same"},
      {id:20,media_type:"person",name:"Same Name",slug:"same-name-2"}]});
  });
  it("fails instead of creating an ambiguous name-only link", async () => {
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response(JSON.stringify({items:[]}))));
    await expect(attachPersonSlugs(["movie","42"],new URLSearchParams(),{credits:{cast:[{id:10,name:"Missing"}]}})).rejects.toThrow("no catalog identity");
  });
});
