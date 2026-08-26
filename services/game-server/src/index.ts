import { createGameServer } from "./app.ts";

const handle = createGameServer();
handle.server.on("listening", () => {
  console.log(`VR Poker game server http://127.0.0.1:${handle.port}`);
  console.log("POST /accounts  POST /tables  POST /tables/:id/sit|start|act|leave");
  if (process.env.LEDGER_URL) console.log(`ledger: ${process.env.LEDGER_URL}`);
  if (process.env.DEAL_RNG_URL) console.log(`deal-rng audit: ${process.env.DEAL_RNG_URL}`);
});
