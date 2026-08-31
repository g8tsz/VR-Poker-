import type { TableSnapshot } from "@vr-poker/core";
import { pickBotAction } from "./bot.ts";
import { renderTable } from "./render.ts";
import { createLocalSession, createRemoteSession, type FlatSession } from "./session.ts";

export interface DemoResult {
  steps: number;
  final: TableSnapshot;
  reveal: boolean;
}

export async function runDemo(session: FlatSession, opts?: { verbose?: boolean }): Promise<DemoResult> {
  const players = [
    { id: "alice", name: "Alice", buyIn: 5_000 },
    { id: "bob", name: "Bob", buyIn: 5_000 },
    { id: "carol", name: "Carol", buyIn: 5_000 },
  ];

  for (const p of players) {
    await session.sit(p.id, p.name, p.buyIn);
  }

  let snap = await session.start();
  if (opts?.verbose) console.log(renderTable(snap, null));

  const maxSteps = 200;
  let steps = 0;
  const handId = snap.handId;

  while (steps < maxSteps) {
    snap = await session.snapshot();
    if (snap.handId === handId && snap.street === "waiting" && steps > 0) break;
    if (snap.toActSeat === null) {
      steps++;
      continue;
    }
    const actor = snap.players.find((p) => p.seat === snap.toActSeat);
    if (!actor?.playerId) break;
    const view = await session.snapshot(actor.playerId);
    const action = pickBotAction(view.legal);
    snap = await session.act(actor.playerId, action);
    steps++;
    if (opts?.verbose) console.log(renderTable(snap, actor.playerId));
  }

  const final = await session.snapshot();
  return { steps, final, reveal: Boolean(final.reveal) };
}

function parseArgs(argv: string[]): { remote?: string; table?: string; verbose: boolean } {
  let remote: string | undefined;
  let table: string | undefined;
  let verbose = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--remote") remote = argv[++i];
    else if (argv[i] === "--table") table = argv[++i];
    else if (argv[i] === "--verbose" || argv[i] === "-v") verbose = true;
  }
  return { remote, table, verbose };
}

async function main(): Promise<void> {
  const { remote, table, verbose } = parseArgs(process.argv.slice(2));
  const session = remote
    ? await createRemoteSession(remote, table ?? "demo-table")
    : createLocalSession(table ?? "demo-table");
  const result = await runDemo(session, { verbose });
  console.log(
    `demo complete (${session.mode}) · steps=${result.steps} · hand=#${result.final.handId} · reveal=${result.reveal}`,
  );
  if (result.final.winners?.length) {
    console.log("winners:", result.final.winners.map((w) => `${w.playerId} +${w.amount}`).join(", "));
  }
  if (!result.reveal) {
    console.error("expected commit-reveal after hand");
    process.exitCode = 1;
  }
}

const isMain = process.argv[1]?.replace(/\\/g, "/").endsWith("/demo.ts");
if (isMain) await main();
