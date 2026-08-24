import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import type { PlayerAction } from "@vr-poker/core";
import { renderTable } from "./render.ts";
import { createLocalSession, createRemoteSession, type FlatSession } from "./session.ts";

function parseArgs(argv: string[]): { remote?: string; table?: string } {
  let remote: string | undefined;
  let table: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--remote") remote = argv[++i];
    else if (argv[i] === "--table") table = argv[++i];
  }
  return { remote, table };
}

function printHelp(mode: string): void {
  console.log(`
VR Poker — flat test client (${mode})

  account <id> <name>     seed 100,000 chips (first time)
  sit <id> <name> <buyin> [seat]
  as <id>                 view/act as this player
  start                   deal a hand (2+ seated)
  fold | check | call | allin
  bet <amount>            first wager this street
  raise <to>              raise *to* this street total
  addon <amount>
  leave
  state                   dump snapshot + ledger
  help
  quit

Flags: --remote <url>  --table <id>
`);
}

async function main(): Promise<void> {
  const { remote, table } = parseArgs(process.argv.slice(2));
  const session: FlatSession = remote
    ? await createRemoteSession(remote, table ?? "felt-remote")
    : createLocalSession(table ?? "felt-1");

  let viewAs: string | null = null;

  async function render(): Promise<void> {
    const snap = await session.snapshot(viewAs ?? undefined);
    const bankroll = viewAs ? await session.balance(viewAs) : undefined;
    console.log(renderTable(snap, viewAs, bankroll));
  }

  printHelp(session.mode);
  const rl = readline.createInterface({ input, output });
  for (;;) {
    const line = (await rl.question("> ")).trim();
    if (!line) continue;
    const [cmd, ...args] = line.split(/\s+/);
    try {
      switch (cmd) {
        case "help":
          printHelp(session.mode);
          break;
        case "quit":
        case "exit":
          rl.close();
          return;
        case "account": {
          const [id, name] = args;
          if (!id) throw new Error("account <id> [name]");
          await session.ensureAccount(id, name ?? id);
          console.log(`${name ?? id} bankroll ${await session.balance(id)}`);
          break;
        }
        case "sit": {
          const [id, name, buy, seat] = args;
          if (!id || !name || !buy) throw new Error("sit <id> <name> <buyin> [seat]");
          await session.sit(id, name, Number(buy), seat === undefined ? undefined : Number(seat));
          if (!viewAs) viewAs = id;
          await render();
          break;
        }
        case "as":
          viewAs = args[0] ?? null;
          await render();
          break;
        case "start":
          await session.start();
          await render();
          break;
        case "fold":
        case "check":
        case "call":
        case "allin":
        case "all-in": {
          if (!viewAs) throw new Error("as <id> first");
          const type = cmd === "allin" ? "all-in" : cmd;
          await session.act(viewAs, { type: type as PlayerAction["type"] });
          await render();
          break;
        }
        case "bet":
        case "raise": {
          if (!viewAs) throw new Error("as <id> first");
          await session.act(viewAs, { type: cmd, amount: Number(args[0]) });
          await render();
          break;
        }
        case "addon": {
          if (!viewAs) throw new Error("as <id> first");
          await session.addOn(viewAs, Number(args[0]));
          await render();
          break;
        }
        case "leave": {
          if (!viewAs) throw new Error("as <id> first");
          const chips = await session.leave(viewAs);
          console.log(`cashed out ${chips}  bankroll ${await session.balance(viewAs)}`);
          viewAs = null;
          break;
        }
        case "state":
          await render();
          console.log(JSON.stringify(await session.snapshot(viewAs ?? undefined), null, 2));
          break;
        default:
          console.log("unknown command — help");
      }
    } catch (err) {
      console.error((err as Error).message);
    }
  }
}

await main();
