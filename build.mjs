// bundles src/main.ts and copies public files into docs, the folder github pages serves
import { build, context } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";
import { watch } from "node:fs";

const watching = process.argv.includes("--watch");

const options = {
  entryPoints: ["src/main.ts"],
  bundle: true,
  format: "iife",
  target: "es2020",
  minify: !watching,
  sourcemap: watching,
  outfile: "docs/main.js",
  logLevel: "info",
};

// html and css live in public and get copied as is
async function copyPublic() {
  await cp("public", "docs", { recursive: true });
}

await rm("docs", { recursive: true, force: true });
await mkdir("docs", { recursive: true });
await copyPublic();

if (watching) {
  const ctx = await context(options);
  await ctx.watch();
  watch("public", () => copyPublic());
  console.log("watching src and public, refresh firefox after saving");
} else {
  await build(options);
}
