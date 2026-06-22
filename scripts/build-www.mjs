import { cp, mkdir, rm } from "node:fs/promises";

const files = [
  "index.html",
  "styles.css",
  "app.js",
  "manifest.json",
  "service-worker.js",
  ".nojekyll",
];

await rm("www", { recursive: true, force: true });
await mkdir("www/icons", { recursive: true });

await Promise.all(files.map((file) => cp(file, `www/${file}`)));
await cp("icons", "www/icons", { recursive: true });
