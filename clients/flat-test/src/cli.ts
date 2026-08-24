import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { Table, type PlayerAction } from "@vr-poker/core";
import { CsprngDealSource } from "@vr-poker/deal";
import { ChipLedger } from "@vr-poker/ledger";

const ledger = new ChipLedger();
const table = new Table("felt-1", new CsprngDealSource(), {
  seats: 6,
  smallBlind: 50,
  bigBlind: 100,
  minBuyIn: 4_000,
  maxBuyIn: 20_000,
  rakePercent: 0.05,
  rakeCap: 300,
  noFlopNoRake: true,
  actionTimeoutMs: 60_000,
});

let viewAs: string | null = null;

function printHelp(): void {
  console.log(`
VR Poker — flat test client (server-authoritative engine, local)

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
`);
}

function render(): void {
  const snap = table.snapshot(viewAs ?? undefined);
  console.log("\n────────────────────────────────────────");
  console.log(`table ${snap.tableId}  street=${snap.street}  hand=#${snap.handId}  pot=${snap.pot}`);
  console.log(`board ${snap.board.join(" ") || "—"}   button=${snap.buttonSeat ?? "—"}  toAct=${snap.toActSeat ?? "—"}`);
  if (snap.commitment) console.log(`commit ${snap.commitment.slice(0, 24)}…`);
  for (const p of snap.players) {
    if (!p.playerId) continue;
    const tags = [
      p.seat === snap.buttonSeat ? "BTN" : "",
      p.folded ? "FOLD" : "",
      p.allIn ? "ALL-IN" : "",
      p.seat === snap.toActSeat ? "<<" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const hole = p.hole?.join(" ") ?? (p.playerId === viewAs ? "" : "xx xx");
    console.log(
      `  seat ${p.seat}  ${p.name.padEnd(12)}  stack ${String(p.stack).padStart(6)}  in ${p.streetCommit}  ${hole}  ${tags}`,
    );
  }
  if (snap.legal.length) {
    console.log(
      "legal: " +
        snap.legal
          .map((a) => (a.min != null ? `${a.type} ${a.min}${a.max != null && a.max !== a.min ? "–" + a.max : ""}` : a.type))
          .join(" · "),
    );
  }
  if (snap.winners?.length) {
    console.log("winners: " + snap.winners.map((w) => `${w.playerId} +${w.amount} ${w.hand ?? ""}`).join(" | "));
  }
  for (const e of snap.lastEvents) console.log("  · " + e);
  if (viewAs) console.log(`viewing as ${viewAs}  bankroll ${ledger.balance(viewAs)}`);
}

async function main(): Promise<void> {
  printHelp();
  const rl = readline.createInterface({ input, output });
  for (;;) {
    const line = (await rl.question("> ")).trim();
    if (!line) continue;
    const [cmd, ...args] = line.split(/\s+/);
    try {
      switch (cmd) {
        case "help":
          printHelp();
          break;
        case "quit":
        case "exit":
          rl.close();
          return;
        case "account": {
          const [id, name] = args;
          if (!id) throw new Error("account <id> [name]");
          if (ledger.history(id).length === 0) ledger.append(id, 100_000, "seed");
          console.log(`${name ?? id} bankroll ${ledger.balance(id)}`);
          break;
        }
        case "sit": {
          const [id, name, buy, seat] = args;
          if (!id || !name || !buy) throw new Error("sit <id> <name> <buyin> [seat]");
          if (ledger.history(id).length === 0) ledger.append(id, 100_000, "seed");
          const buyIn = Number(buy);
          ledger.buyIn(id, buyIn, table.tableId);
          try {
            table.sit(id, name, buyIn, seat === undefined ? undefined : Number(seat));
          } catch (e) {
            ledger.cashOut(id, buyIn, table.tableId);
            throw e;
          }
          if (!viewAs) viewAs = id;
          render();
          break;
        }
        case "as":
          viewAs = args[0] ?? null;
          render();
          break;
        case "start":
          table.startHand();
          render();
          break;
        case "fold":
        case "check":
        case "call":
        case "allin":
        case "all-in": {
          if (!viewAs) throw new Error("as <id> first");
          const type = cmd === "allin" ? "all-in" : cmd;
          table.act(viewAs, { type: type as PlayerAction["type"] });
          render();
          break;
        }
        case "bet":
        case "raise": {
          if (!viewAs) throw new Error("as <id> first");
          table.act(viewAs, { type: cmd, amount: Number(args[0]) });
          render();
          break;
        }
        case "addon": {
          if (!viewAs) throw new Error("as <id> first");
          const amount = Number(args[0]);
          ledger.addOn(viewAs, amount, table.tableId);
          table.addOn(viewAs, amount);
          render();
          break;
        }
        case "leave": {
          if (!viewAs) throw new Error("as <id> first");
          const chips = table.cashOut(viewAs);
          if (chips) ledger.cashOut(viewAs, chips, table.tableId);
          console.log(`cashed out ${chips}  bankroll ${ledger.balance(viewAs)}`);
          viewAs = null;
          break;
        }
        case "state":
          render();
          console.log(JSON.stringify(table.snapshot(viewAs ?? undefined), null, 2));
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
