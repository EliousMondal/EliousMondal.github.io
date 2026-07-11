import { readdir, readFile, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

const [siteRoot, revision] = process.argv.slice(2);

if (!siteRoot || !revision) {
  throw new Error(
    "Usage: node scripts/cache-bust.mjs <site-directory> <revision>"
  );
}

async function findHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const filePath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...await findHtmlFiles(filePath));
    } else if (entry.isFile() && extname(entry.name) === ".html") {
      files.push(filePath);
    }
  }

  return files;
}

const assetPattern =
  /(\b(?:href|src)=)(["'])(?!https?:|\/\/|mailto:|tel:|data:|#)([^"'?#]+\.(?:css|js|png|jpe?g|webp|svg|ico|pdf))(?:\?[^"'#]*)?(#[^"']*)?\2/gi;

const htmlFiles = await findHtmlFiles(siteRoot);

for (const filePath of htmlFiles) {
  const original = await readFile(filePath, "utf8");

  const updated = original.replace(
    assetPattern,
    (match, attribute, quote, assetPath, fragment = "") => {
      return (
        attribute +
        quote +
        assetPath +
        "?v=" +
        revision +
        fragment +
        quote
      );
    }
  );

  await writeFile(filePath, updated, "utf8");
}

console.log(
  `Added revision ${revision} to assets in ${htmlFiles.length} HTML files.`
);