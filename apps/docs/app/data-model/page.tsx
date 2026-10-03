import Link from "next/link";
import fs from "node:fs";
import path from "node:path";
import tables from "../../generated/tables.json";
import { DiagramDisclosure } from "../../components/diagram";
const groups = ["identity-media","catalog","social","chat","moderation","notifications"] as const;
function group(name: string) { return name.startsWith("catalog_") ? "catalog" : /chat_/.test(name) ? "chat" : /moderation|report|strike/.test(name) ? "moderation" : /notification/.test(name) ? "notifications" : /post|feed|follow|bookmark|list|poll/.test(name) ? "social" : "identity-media"; }
function diagram(name: string) { return fs.readFileSync(path.join(process.cwd(), "generated", `${name}-erd.mmd`), "utf8"); }
export default function Page() { return <main className="shell"><h1>Data Model</h1><p className="muted">{tables.total} Drizzle tables. Columns, constraints, indexes, and foreign keys cross-checked with latest Drizzle snapshot; migration presence checked against SQL files. ERD groups improve readability; full graph below.</p>{groups.map(name => { const items = tables.tables.filter(table => group(table.name) === name); return <section key={name}><h2>{name.replace("-", " & ")} <small className="muted">({items.length})</small></h2><div className="card-grid">{items.map(table => <Link className="card" href={`/data-model/${table.name}`} key={table.name}><strong>{table.name}</strong><span>{table.columns.length} columns · {table.indexes.length} indexes</span></Link>)}</div><DiagramDisclosure label={`View ${name} ERD`} source={diagram(name)} /></section>; })}<section><h2>Full ERD</h2><DiagramDisclosure label="View all tables and foreign keys" source={diagram("full")} /></section></main>; }
