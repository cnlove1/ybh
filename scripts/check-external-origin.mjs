#!/usr/bin/env node

import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";

const require = createRequire(import.meta.url);
const projectRoot = process.env.CHECK_PROJECT_ROOT ?? process.cwd();
const ts = (() => {
  try {
    return require(path.join(projectRoot, "node_modules", "typescript"));
  } catch {
    return null;
  }
})();

const errors = [];

function walkSourceFiles(directory, files = []) {
  if (!fs.existsSync(directory)) return files;

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;

    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walkSourceFiles(fullPath, files);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function sourceFiles() {
  const files = [
    ...walkSourceFiles(path.join(projectRoot, "src")),
    ...walkSourceFiles(path.join(projectRoot, "app")),
  ];
  const middleware = path.join(projectRoot, "middleware.ts");
  if (fs.existsSync(middleware)) files.push(middleware);
  return files;
}

function locationOf(node, sourceFile) {
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return `${path.relative(projectRoot, sourceFile.fileName)}:${position.line + 1}`;
}

function matchesIdentifierName(node, sourceFile, pattern) {
  return pattern.test(node.getText(sourceFile));
}

function visit(node, sourceFile) {
  const location = locationOf(node, sourceFile);

  if (ts.isNewExpression(node) && node.expression.getText(sourceFile) === "URL") {
    const baseUrl = node.arguments?.[1];
    if (
      baseUrl &&
      matchesIdentifierName(baseUrl, sourceFile, /(?:request|req)\.url$/)
    ) {
      errors.push(
        `${location}: Do not use request.url as a URL base. Use resolveExternalOrigin(request) or relativeRedirect(path).`
      );
    }
  }

  if (
    ts.isPropertyAccessExpression(node) &&
    matchesIdentifierName(node, sourceFile, /^(?:request|req)\.nextUrl\.origin$/)
  ) {
    errors.push(
      `${location}: Do not use request.nextUrl.origin as an external URL base. Use resolveExternalOrigin(request).`
    );
  }

  if (
    ts.isBinaryExpression(node) &&
    node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
    matchesIdentifierName(node.left, sourceFile, /\.host$/)
  ) {
    errors.push(
      `${location}: Do not replace URL.host after constructing an internal URL; this preserves the old port. Rebuild the URL with resolveExternalOrigin(request).`
    );
  }

  if (
    (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
    /(?:localhost|127\.0\.0\.1)(?::5001)?(?:\/|$)/.test(node.text)
  ) {
    errors.push(
      `${location}: Do not expose a local URL. Use a relative path or resolveExternalOrigin(request).`
    );
  }

  node.forEachChild((child) => visit(child, sourceFile));
}

for (const file of sourceFiles()) {
  if (!ts) {
    const content = fs.readFileSync(file, "utf8");
    const checks = [
      {
        pattern: /new\s+URL\s*\([^)]*,\s*(?:request|req)\.url\s*\)/g,
        message:
          "Do not use request.url as a URL base. Use resolveExternalOrigin(request) or relativeRedirect(path).",
      },
      {
        pattern: /(?:request|req)\.nextUrl\.origin/g,
        message:
          "Do not use request.nextUrl.origin as an external URL base. Use resolveExternalOrigin(request).",
      },
      {
        pattern: /\.host\s*=\s*[^;]+/g,
        message:
          "Do not replace URL.host after constructing an internal URL; this preserves the old port. Rebuild the URL with resolveExternalOrigin(request).",
      },
      {
        pattern: /(?:localhost|127\.0\.0\.1)(?::5001)?(?:\/|$)/g,
        message: "Do not expose a local URL. Use a relative path or resolveExternalOrigin(request).",
      },
    ];

    for (const check of checks) {
      for (const match of content.matchAll(check.pattern)) {
        const line = content.slice(0, match.index ?? 0).split(/\r?\n/).length;
        errors.push(`${path.relative(projectRoot, file)}:${line}: ${check.message}`);
      }
    }
    continue;
  }

  const sourceFile = ts.createSourceFile(
    file,
    fs.readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  visit(sourceFile, sourceFile);
}

if (errors.length > 0) {
  console.error("FAIL: external URL origin check failed.");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log("PASS: external URL origin check passed.");
}
