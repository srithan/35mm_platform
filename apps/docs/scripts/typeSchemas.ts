import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

export function buildTypeSchemas(root: string) {
  const directory = path.join(root, "packages/types/src");
  const declarations = new Map<string, { node: ts.InterfaceDeclaration | ts.TypeAliasDeclaration; sf: ts.SourceFile }>();
  for (const file of fs.readdirSync(directory).filter(name => name.endsWith(".ts"))) {
    const sf = ts.createSourceFile(file, fs.readFileSync(path.join(directory, file), "utf8"), ts.ScriptTarget.Latest, true);
    for (const statement of sf.statements) if (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) declarations.set(statement.name.text, { node: statement, sf });
  }
  const components: Record<string, unknown> = {};
  const inProgress = new Set<string>();
  function properties(members: ts.NodeArray<ts.TypeElement>) {
    const props: Record<string, unknown> = {};
    const required: string[] = [];
    let additionalProperties: unknown;
    for (const member of members) {
      if (ts.isIndexSignatureDeclaration(member)) { additionalProperties = member.type ? convert(member.type) : {}; continue; }
      if (!ts.isPropertySignature(member) || !member.name) continue;
      const name = ts.isIdentifier(member.name) || ts.isStringLiteral(member.name) ? member.name.text : null;
      if (!name) continue;
      props[name] = member.type ? convert(member.type) : {};
      if (!member.questionToken) required.push(name);
    }
    return { type: "object", properties: props, ...(required.length ? { required } : {}), ...(additionalProperties !== undefined ? { additionalProperties } : {}) };
  }
  function convert(node: ts.TypeNode): Record<string, unknown> {
    if (node.kind === ts.SyntaxKind.StringKeyword) return { type: "string" };
    if (node.kind === ts.SyntaxKind.NumberKeyword) return { type: "number" };
    if (node.kind === ts.SyntaxKind.BooleanKeyword) return { type: "boolean" };
    if (node.kind === ts.SyntaxKind.NullKeyword) return { type: "null" };
    if (node.kind === ts.SyntaxKind.UnknownKeyword || node.kind === ts.SyntaxKind.AnyKeyword) return {};
    if (ts.isArrayTypeNode(node)) return { type: "array", items: convert(node.elementType) };
    if (ts.isTupleTypeNode(node)) return { type: "array", prefixItems: node.elements.map(convert), minItems: node.elements.length, maxItems: node.elements.length };
    if (ts.isParenthesizedTypeNode(node)) return convert(node.type);
    if (ts.isTypeLiteralNode(node)) return properties(node.members);
    if (ts.isLiteralTypeNode(node)) {
      const literal = node.literal;
      if (ts.isStringLiteral(literal)) return { type: "string", const: literal.text };
      if (ts.isNumericLiteral(literal)) return { type: "number", const: Number(literal.text) };
      if (literal.kind === ts.SyntaxKind.TrueKeyword) return { type: "boolean", const: true };
      if (literal.kind === ts.SyntaxKind.FalseKeyword) return { type: "boolean", const: false };
      if (literal.kind === ts.SyntaxKind.NullKeyword) return { type: "null" };
    }
    if (ts.isUnionTypeNode(node)) {
      const children = node.types.map(convert);
      if (children.every(item => "const" in item && item.type === "string")) return { type: "string", enum: children.map(item => item.const) };
      return { anyOf: children };
    }
    if (ts.isIntersectionTypeNode(node)) return { allOf: node.types.map(convert) };
    if (ts.isTypeReferenceNode(node)) {
      const name = node.typeName.getText();
      if ((name === "Array" || name === "ReadonlyArray") && node.typeArguments?.length) return { type: "array", items: convert(node.typeArguments[0]) };
      if ((name === "Record" || name === "Partial") && node.typeArguments?.length) return { type: "object", additionalProperties: name === "Record" && node.typeArguments[1] ? convert(node.typeArguments[1]) : {} };
      if (name === "Date") return { type: "string", format: "date-time" };
      if (declarations.has(name)) { ensure(name); return { $ref: `#/components/schemas/${name}` }; }
      return { description: `Unresolved TypeScript type ${name}` };
    }
    return {};
  }
  function ensure(name: string): boolean {
    if (components[name]) return true;
    if (inProgress.has(name)) return true;
    const entry = declarations.get(name);
    if (!entry) return false;
    inProgress.add(name);
    const { node } = entry;
    let schema: Record<string, unknown>;
    if (ts.isInterfaceDeclaration(node)) {
      schema = properties(node.members);
      if (node.heritageClauses?.length) {
        const bases = node.heritageClauses.flatMap(clause => clause.types).map(base => {
          const baseName = base.expression.getText(entry.sf);
          ensure(baseName);
          return { $ref: `#/components/schemas/${baseName}` };
        });
        schema = { allOf: [...bases, schema] };
      }
    } else schema = convert(node.type);
    components[name] = schema;
    inProgress.delete(name);
    return true;
  }
  return { components, ensure };
}
