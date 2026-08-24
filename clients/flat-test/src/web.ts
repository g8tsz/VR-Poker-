import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT ?? 3080);
const here = dirname(fileURLToPath(import.meta.url));
const publicDir = join(here, "../public");

const server = createServer(async (req, res) => {
  const path = req.url?.split("?")[0] ?? "/";
  if (path === "/" || path === "/index.html") {
    const html = await readFile(join(publicDir, "index.html"), "utf8");
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }
  res.writeHead(404, { "content-type": "text/plain" });
  res.end("not found");
});

server.listen(PORT, () => {
  console.log(`Flat test web UI http://127.0.0.1:${PORT}`);
  console.log("Point it at a running game server (npm run dev) on :8787");
});
