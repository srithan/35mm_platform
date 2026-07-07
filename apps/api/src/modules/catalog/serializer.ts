import type { CatalogEditDto } from "@35mm/types";

type CatalogEditRow = {
  id: string;
  status: CatalogEditDto["status"];
  source: CatalogEditDto["source"];
  summary: string;
  publicVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export function toCatalogEditDto(row: CatalogEditRow): CatalogEditDto {
  return {
    id: row.id,
    status: row.status,
    source: row.source,
    summary: row.summary,
    publicVisible: row.publicVisible,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export type CatalogHistoryCursor = {
  createdAt: Date;
  id: string;
};

export function encodeCatalogHistoryCursor(cursor: CatalogHistoryCursor): string {
  return Buffer.from(
    JSON.stringify({
      createdAt: cursor.createdAt.toISOString(),
      id: cursor.id,
    })
  ).toString("base64url");
}

export function decodeCatalogHistoryCursor(value: string | undefined): CatalogHistoryCursor | null {
  if (!value) return null;
  try {
    var parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as {
      createdAt?: unknown;
      id?: unknown;
    };
    if (typeof parsed.createdAt !== "string" || typeof parsed.id !== "string") return null;
    var createdAt = new Date(parsed.createdAt);
    if (Number.isNaN(createdAt.getTime()) || parsed.id.trim().length === 0) return null;
    return { createdAt, id: parsed.id };
  } catch (_error) {
    return null;
  }
}
