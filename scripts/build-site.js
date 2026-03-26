const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const sourceDir = path.join(projectRoot, "public_html");
const outputRoot = path.join(projectRoot, "build");
const outputDir = path.join(outputRoot, "public_html");
const templatePath = path.join(sourceDir, "template.html");
const builtIndexJsPath = path.join(outputDir, "index.js");
const sharedIds = ["topbar", "menu", "splash", "shared-search", "footer"];

function cleanOutput() {
  fs.rmSync(outputRoot, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });
}

function collectSourceHtmlFiles() {
  const htmlFiles = [];

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (!entry.isFile()) continue;
      if (path.extname(entry.name).toLowerCase() !== ".html") continue;
      if (entry.name === "template.html") continue;

      htmlFiles.push(fullPath);
    }
  }

  walk(sourceDir);
  return htmlFiles;
}

function extractElementBounds(html, id) {
  const idPattern = new RegExp(`<([a-zA-Z0-9:-]+)\\b[^>]*\\bid=["']${id}["'][^>]*>`, "i");
  const match = idPattern.exec(html);
  if (!match) return null;

  const tagName = match[1];
  const start = match.index;
  const tokenPattern = new RegExp(`<\\/?${tagName}\\b[^>]*>`, "gi");
  tokenPattern.lastIndex = start;

  let depth = 0;
  let token;
  while ((token = tokenPattern.exec(html))) {
    const tokenText = token[0];
    const isClosing = /^<\//.test(tokenText);
    const isSelfClosing = /\/>$/.test(tokenText);

    if (!isClosing) {
      depth += 1;
      if (isSelfClosing) {
        depth -= 1;
      }
    } else {
      depth -= 1;
      if (depth === 0) {
        return {
          start,
          end: tokenPattern.lastIndex,
          html: html.slice(start, tokenPattern.lastIndex)
        };
      }
    }
  }

  return null;
}

function replaceElementById(html, id, replacement) {
  const bounds = extractElementBounds(html, id);
  if (!bounds) return html;
  return html.slice(0, bounds.start) + replacement + html.slice(bounds.end);
}

function toRootRelative(value) {
  if (!value) return value;
  if (value.startsWith("#")) return value;
  if (/^(?:[a-z]+:|\/\/|\/)/i.test(value)) return value;
  return "/" + value.replace(/^\.\//, "").replace(/^\/+/, "");
}

function rewriteSharedUrls(fragment) {
  return fragment.replace(/\b(href|src|action)=("([^"]*)"|'([^']*)')/gi, function (match, attr, quotedValue, doubleValue, singleValue) {
    const quote = quotedValue.charAt(0);
    const rawValue = doubleValue || singleValue || "";
    const nextValue = toRootRelative(rawValue);
    return `${attr}=${quote}${nextValue}${quote}`;
  });
}

function buildSharedFragments(templateHtml) {
  const fragments = {};
  for (const id of sharedIds) {
    const bounds = extractElementBounds(templateHtml, id);
    if (!bounds) {
      throw new Error(`Unable to find #${id} in template.html`);
    }
    fragments[id] = rewriteSharedUrls(bounds.html);
  }
  return fragments;
}

function processBuiltHtmlFiles(sharedFragments) {
  const htmlFiles = collectSourceHtmlFiles();

  for (const sourceHtmlPath of htmlFiles) {
    let html = fs.readFileSync(sourceHtmlPath, "utf8");
    let changed = false;

    for (const id of sharedIds) {
      if (extractElementBounds(html, id)) {
        html = replaceElementById(html, id, sharedFragments[id]);
        changed = true;
      }
    }

    if (changed) {
      const relativePath = path.relative(sourceDir, sourceHtmlPath);
      const outputHtmlPath = path.join(outputDir, relativePath);
      fs.mkdirSync(path.dirname(outputHtmlPath), { recursive: true });
      fs.writeFileSync(outputHtmlPath, html, "utf8");
    }
  }
}

function buildStaticIndexJs() {
  let script = fs.readFileSync(path.join(sourceDir, "index.js"), "utf8");

  script = script.replace(
    /function setPageLoading\(isLoading\) \{[\s\S]*?\n  \}/,
    'function setPageLoading(isLoading) {\n    return;\n  }'
  );

  script = script.replace(
    /function syncSharedChromeFromTemplate\(\) \{[\s\S]*?\n  \}/,
    'function syncSharedChromeFromTemplate() {\n    return Promise.resolve();\n  }'
  );

  fs.writeFileSync(builtIndexJsPath, script, "utf8");
}

function main() {
  if (!fs.existsSync(templatePath)) {
    throw new Error("template.html was not found in public_html.");
  }

  cleanOutput();

  const templateHtml = fs.readFileSync(templatePath, "utf8");
  const sharedFragments = buildSharedFragments(templateHtml);

  processBuiltHtmlFiles(sharedFragments);
  buildStaticIndexJs();

  console.log("Static site build complete.");
  console.log(`Output: ${outputDir}`);
}

main();
