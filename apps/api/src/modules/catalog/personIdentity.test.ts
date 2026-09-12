import { afterEach, describe, expect, it, vi } from "vitest";
import { catalogPersonSourceSchema } from "@35mm/validators";
import { personSlugBase, sourcePeople, registerPeople } from "./personIdentity.js";
const mocks = vi.hoisted(() => ({read:vi.fn(),transaction:vi.fn(),invalidate:vi.fn()}));
vi.mock("../../lib/db.js", () => ({getDb:()=>({execute:mocks.read}), getWriteDb:()=>({transaction:mocks.transaction})}));
vi.mock("./readCache.js", () => ({invalidateCatalogReadCaches:mocks.invalidate,getCatalogReadCache:vi.fn(),setCatalogReadCache:vi.fn()}));
afterEach(()=>vi.clearAllMocks());
describe("person identity registry",()=>{
  it("normalizes accents and reserves numbered suffixes",()=>{
    expect(personSlugBase("Paola Fernández")).toBe("paola-fernandez");
    expect(personSlugBase("Person-2")).toBe("person");
  });
  it("deduplicates by ID, never by name or role",()=>{
    expect(sourcePeople({kind:"movie",id:42},{credits:{cast:[{id:2,name:"Same"}],crew:[{id:1,name:"Same"},{id:1,name:"Same"}]}}))
      .toEqual([{id:2,name:"Same"},{id:1,name:"Same"}]);
  });
  it("filters multi-search to people",()=>{
    expect(sourcePeople(catalogPersonSourceSchema.parse({kind:"search",query:"Same",mode:"multi"}),{results:[{id:99,media_type:"movie"},{id:1,media_type:"person",name:"Same"}]}))
      .toEqual([{id:1,name:"Same"}]);
  });
  it("hot identities do not write or invalidate",async()=>{
    const identity={tmdbId:1,slug:"same-2",name:"Same"};
    mocks.read.mockResolvedValue({rows:[identity]});
    expect(await registerPeople([{id:1,name:"Renamed"}])).toEqual([identity]);
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });
  it("rechecks after locking so concurrent retry does not insert again",async()=>{
    mocks.read.mockResolvedValueOnce({rows:[]}).mockResolvedValueOnce({rows:[{tmdbId:1,slug:"same",name:"Same"}]});
    const execute=vi.fn().mockResolvedValueOnce({rows:[]}).mockResolvedValueOnce({rows:[{external_id:"1"}]});
    mocks.transaction.mockImplementation(async callback=>callback({execute}));
    expect(await registerPeople([{id:1,name:"Same"}])).toEqual([{tmdbId:1,slug:"same",name:"Same"}]);
    expect(execute).toHaveBeenCalledTimes(2);
  });
  it("surfaces conflicting provider mappings instead of choosing a person",async()=>{
    mocks.read.mockResolvedValue({rows:[{tmdbId:1,slug:"same"},{tmdbId:1,slug:"other"}]});
    await expect(registerPeople([{id:1,name:"Same"}])).rejects.toThrow("reconciliation");
  });
});
