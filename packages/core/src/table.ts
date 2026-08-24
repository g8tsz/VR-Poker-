import { formatCard, formatCards, parseCards, type Card } from "./cards.ts";
import type { DealSource, HandDeal } from "./deal.ts";
import { evaluateHoldem, categoryName } from "./evaluator.ts";
import { buildPots, returnUncalled, splitPot, takeRake, type Contribution } from "./pots.ts";
import {
  DEFAULT_TABLE,
  type ActionType,
  type LegalAction,
  type PlayerAction,
  type Street,
  type TableConfig,
  type TableSnapshot,
} from "./types.ts";

interface Seat {
  playerId: string;
  name: string;
  stack: number;
  streetCommit: number;
  handCommit: number;
  folded: boolean;
  allIn: boolean;
  sittingOut: boolean;
  hole: Card[];
  actedThisRound: boolean;
}

const BETTING: Street[] = ["preflop", "flop", "turn", "river"];

export class PokerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PokerError";
  }
}

export class Table {
  readonly tableId: string;
  readonly config: TableConfig;
  private readonly dealSource: DealSource;
  private seats: (Seat | null)[];
  private street: Street = "waiting";
  private handId = 0;
  private buttonSeat: number | null = null;
  private toActSeat: number | null = null;
  private currentBet = 0;
  private lastFullRaiseSize = 0;
  private board: Card[] = [];
  private burns: Card[] = [];
  private deal: HandDeal | null = null;
  private events: string[] = [];
  private winners: TableSnapshot["winners"];
  private flopSeen = false;

  constructor(tableId: string, dealSource: DealSource, config: Partial<TableConfig> = {}) {
    this.tableId = tableId;
    this.dealSource = dealSource;
    this.config = { ...DEFAULT_TABLE, ...config };
    if (this.config.seats < 2 || this.config.seats > 9) {
      throw new PokerError("tables are 2–9 seats");
    }
    this.seats = Array.from({ length: this.config.seats }, () => null);
  }

  sit(playerId: string, name: string, buyIn: number, seatIndex?: number): number {
    this.assertIdle();
    if (this.findSeat(playerId) !== -1) throw new PokerError("already seated");
    if (buyIn < this.config.minBuyIn || buyIn > this.config.maxBuyIn) {
      throw new PokerError(
        `buy-in must be ${this.config.minBuyIn}–${this.config.maxBuyIn} (table stakes)`,
      );
    }
    const seat = seatIndex ?? this.seats.findIndex((s) => s === null);
    if (seat < 0 || seat >= this.config.seats || this.seats[seat]) {
      throw new PokerError("no empty seat");
    }
    this.seats[seat] = {
      playerId,
      name,
      stack: buyIn,
      streetCommit: 0,
      handCommit: 0,
      folded: false,
      allIn: false,
      sittingOut: false,
      hole: [],
      actedThisRound: false,
    };
    this.log(`${name} buys in for ${buyIn} on seat ${seat}`);
    return seat;
  }

  addOn(playerId: string, amount: number): void {
    this.assertIdle();
    const seat = this.requireSeat(playerId);
    const p = this.seats[seat]!;
    const next = p.stack + amount;
    if (next > this.config.maxBuyIn) {
      throw new PokerError(`add-on would exceed max buy-in ${this.config.maxBuyIn}`);
    }
    if (amount <= 0) throw new PokerError("add-on must be positive");
    p.stack = next;
    this.log(`${p.name} adds on ${amount} (stack ${p.stack})`);
  }

  cashOut(playerId: string): number {
    this.assertIdle();
    const seat = this.requireSeat(playerId);
    const p = this.seats[seat]!;
    const chips = p.stack;
    this.seats[seat] = null;
    this.log(`${p.name} cashes out ${chips}`);
    return chips;
  }

  seatedCount(): number {
    return this.seats.filter((s) => s && !s.sittingOut).length;
  }

  startHand(): void {
    this.assertIdle();
    const live = this.occupied().filter((s) => s.stack > 0 && !s.sittingOut);
    if (live.length < 2) throw new PokerError("need 2 players with chips to deal");

    this.handId += 1;
    this.street = "dealing";
    this.board = [];
    this.burns = [];
    this.winners = undefined;
    this.flopSeen = false;
    this.events = [];
    for (const s of this.occupied()) {
      s.streetCommit = 0;
      s.handCommit = 0;
      s.folded = s.sittingOut || s.stack <= 0;
      s.allIn = false;
      s.hole = [];
      s.actedThisRound = false;
    }

    this.advanceButton();
    this.deal = this.dealSource.openHand(`${this.tableId}:${this.handId}`);
    this.postBlinds();

    const order = this.dealOrder();
    for (let round = 0; round < 2; round++) {
      for (const seat of order) {
        const p = this.seats[seat]!;
        if (p.folded) continue;
        p.hole.push(this.deal.next());
      }
    }

    this.currentBet = this.config.bigBlind;
    this.lastFullRaiseSize = this.config.bigBlind;
    this.street = "preflop";
    this.toActSeat = this.firstToActPreflop();
    this.log(`hand #${this.handId} dealt · button seat ${this.buttonSeat} · ${this.deal.commitment.slice(0, 12)}…`);
    this.skipAllInsAndMaybeClose();
  }

  act(playerId: string, action: PlayerAction): void {
    if (!BETTING.includes(this.street)) throw new PokerError("not a betting street");
    if (this.toActSeat === null) throw new PokerError("no action to take");
    const seat = this.requireSeat(playerId);
    if (seat !== this.toActSeat) throw new PokerError("not your turn");
    const p = this.seats[seat]!;
    if (p.folded || p.allIn) throw new PokerError("player is out of the action");

    const legal = this.legalActions(playerId);
    this.applyAction(p, action, legal);
    p.actedThisRound = true;
    this.advanceAfterAction();
  }

  legalActions(playerId: string): LegalAction[] {
    if (!BETTING.includes(this.street) || this.toActSeat === null) return [];
    const seat = this.findSeat(playerId);
    if (seat !== this.toActSeat) return [];
    const p = this.seats[seat]!;
    const toCall = this.currentBet - p.streetCommit;
    const out: LegalAction[] = [{ type: "fold" }];

    if (toCall <= 0) {
      out.push({ type: "check" });
      if (p.stack > 0) {
        const minBet = Math.min(p.stack, this.config.bigBlind);
        out.push({ type: "bet", min: minBet, max: p.stack });
        out.push({ type: "all-in", min: p.stack, max: p.stack });
      }
      return out;
    }

    if (p.stack > toCall) {
      out.push({ type: "call", min: toCall, max: toCall });
    }
    if (p.stack > 0) {
      out.push({ type: "all-in", min: p.stack, max: p.stack });
    }
    const minRaiseTo = this.currentBet + this.lastFullRaiseSize;
    if (p.stack + p.streetCommit > this.currentBet && p.stack > toCall) {
      const maxRaiseTo = p.stack + p.streetCommit;
      if (maxRaiseTo >= minRaiseTo) {
        out.push({ type: "raise", min: minRaiseTo, max: maxRaiseTo });
      }
    }
    return out;
  }

  snapshot(viewerId?: string): TableSnapshot {
    const showAll =
      this.street === "showdown" || this.street === "payout" || this.street === "waiting";
    return {
      tableId: this.tableId,
      street: this.street,
      handId: this.handId,
      buttonSeat: this.buttonSeat,
      toActSeat: this.toActSeat,
      currentBet: this.currentBet,
      minRaiseTo: this.currentBet + this.lastFullRaiseSize,
      pot: this.occupied().reduce((s, p) => s + p.handCommit, 0),
      board: this.board.map(formatCard),
      burns: this.burns.map(formatCard),
      commitment: this.deal?.commitment ?? null,
      reveal: this.street === "waiting" && this.deal ? this.deal.reveal() : null,
      players: this.seats.map((p, seat) => {
        if (!p) {
          return {
            playerId: "",
            name: "",
            seat,
            stack: 0,
            streetCommit: 0,
            handCommit: 0,
            folded: true,
            allIn: false,
            sittingOut: false,
          };
        }
        const revealHole =
          showAll || p.playerId === viewerId || (this.street === "showdown" && !p.folded);
        return {
          playerId: p.playerId,
          name: p.name,
          seat,
          stack: p.stack,
          streetCommit: p.streetCommit,
          handCommit: p.handCommit,
          folded: p.folded,
          allIn: p.allIn,
          sittingOut: p.sittingOut,
          hole: revealHole && p.hole.length ? p.hole.map(formatCard) : undefined,
        };
      }),
      legal: viewerId ? this.legalActions(viewerId) : [],
      lastEvents: this.events.slice(-12),
      winners: this.winners,
    };
  }

  private applyAction(p: Seat, action: PlayerAction, legal: LegalAction[]): void {
    const allowed = new Set(legal.map((l) => l.type));
    if (!allowed.has(action.type)) {
      throw new PokerError(`illegal action ${action.type}`);
    }

    switch (action.type) {
      case "fold":
        p.folded = true;
        this.log(`${p.name} folds`);
        return;
      case "check":
        this.log(`${p.name} checks`);
        return;
      case "call": {
        const toCall = Math.min(this.currentBet - p.streetCommit, p.stack);
        this.put(p, toCall);
        this.log(`${p.name} calls ${toCall}`);
        return;
      }
      case "bet": {
        const amount = action.amount ?? 0;
        const spec = legal.find((l) => l.type === "bet")!;
        if (amount < spec.min! || amount > spec.max!) {
          throw new PokerError(`bet must be ${spec.min}–${spec.max}`);
        }
        this.put(p, amount);
        const raiseSize = amount - this.currentBet;
        this.currentBet = p.streetCommit;
        this.lastFullRaiseSize = Math.max(raiseSize, this.config.bigBlind);
        this.resetActionExcept(p.playerId);
        this.log(`${p.name} bets ${amount}`);
        return;
      }
      case "raise": {
        const raiseTo = action.amount ?? 0;
        const spec = legal.find((l) => l.type === "raise")!;
        if (raiseTo < spec.min! || raiseTo > spec.max!) {
          throw new PokerError(`raise-to must be ${spec.min}–${spec.max}`);
        }
        const put = raiseTo - p.streetCommit;
        const raiseSize = raiseTo - this.currentBet;
        this.put(p, put);
        this.currentBet = p.streetCommit;
        if (raiseSize >= this.lastFullRaiseSize) {
          this.lastFullRaiseSize = raiseSize;
          this.resetActionExcept(p.playerId);
        } else {
          this.resetUnactedOnly();
        }
        this.log(`${p.name} raises to ${raiseTo}`);
        return;
      }
      case "all-in": {
        const put = p.stack;
        const newCommit = p.streetCommit + put;
        const raiseSize = newCommit - this.currentBet;
        this.put(p, put);
        if (newCommit > this.currentBet) {
          const full = raiseSize >= this.lastFullRaiseSize && raiseSize > 0;
          this.currentBet = newCommit;
          if (full) {
            this.lastFullRaiseSize = raiseSize;
            this.resetActionExcept(p.playerId);
          } else {
            this.resetUnactedOnly();
          }
        }
        this.log(`${p.name} is all-in for ${newCommit} this street`);
        return;
      }
      default:
        throw new PokerError("unknown action");
    }
  }

  private put(p: Seat, amount: number): void {
    if (amount < 0 || amount > p.stack) throw new PokerError("invalid chip put");
    p.stack -= amount;
    p.streetCommit += amount;
    p.handCommit += amount;
    if (p.stack === 0) p.allIn = true;
  }

  private resetActionExcept(playerId: string): void {
    for (const s of this.occupied()) {
      if (s.playerId === playerId || s.folded || s.allIn) continue;
      s.actedThisRound = false;
    }
  }

  private resetUnactedOnly(): void {
    // incomplete raise: players who already acted do not get reopened
  }

  private advanceAfterAction(): void {
    const live = this.live();
    if (live.length === 1) {
      this.awardUncontested(live[0]!);
      return;
    }
    if (this.bettingClosed()) {
      this.nextStreetOrShowdown();
      return;
    }
    this.toActSeat = this.nextActor(this.toActSeat!);
    this.skipAllInsAndMaybeClose();
  }

  private skipAllInsAndMaybeClose(): void {
    if (!BETTING.includes(this.street) || this.toActSeat === null) return;
    let guard = 0;
    while (guard++ < this.config.seats) {
      const p = this.seats[this.toActSeat];
      if (p && !p.folded && !p.allIn) break;
      if (this.bettingClosed()) {
        this.nextStreetOrShowdown();
        return;
      }
      this.toActSeat = this.nextActor(this.toActSeat);
    }
    if (this.bettingClosed()) this.nextStreetOrShowdown();
  }

  private bettingClosed(): boolean {
    const live = this.live();
    if (live.length <= 1) return true;
    const canAct = live.filter((p) => !p.allIn);
    if (canAct.length === 0) return true;
    if (canAct.length === 1 && canAct[0]!.streetCommit >= this.currentBet) {
      const othersMatched = live.every(
        (p) => p.allIn || p.streetCommit === canAct[0]!.streetCommit || p.streetCommit === this.currentBet,
      );
      if (othersMatched && canAct[0]!.actedThisRound) return true;
      if (live.filter((p) => !p.allIn).length === 1 && live.some((p) => p.allIn)) {
        return canAct[0]!.actedThisRound || canAct[0]!.streetCommit >= this.currentBet;
      }
    }
    return canAct.every((p) => p.actedThisRound && (p.streetCommit === this.currentBet || p.allIn));
  }

  private nextStreetOrShowdown(): void {
    const live = this.live();
    const allInRunout = live.filter((p) => !p.allIn).length <= 1 && live.length > 1;
    if (this.street === "preflop") {
      this.dealFlop();
      this.flopSeen = true;
      if (allInRunout) {
        this.dealTurn();
        this.dealRiver();
        this.showdown();
        return;
      }
      this.beginStreet("flop");
      return;
    }
    if (this.street === "flop") {
      this.dealTurn();
      if (allInRunout) {
        this.dealRiver();
        this.showdown();
        return;
      }
      this.beginStreet("turn");
      return;
    }
    if (this.street === "turn") {
      this.dealRiver();
      if (allInRunout) {
        this.showdown();
        return;
      }
      this.beginStreet("river");
      return;
    }
    this.showdown();
  }

  private beginStreet(street: Street): void {
    this.street = street;
    for (const s of this.occupied()) {
      s.streetCommit = 0;
      s.actedThisRound = false;
    }
    this.currentBet = 0;
    this.lastFullRaiseSize = this.config.bigBlind;
    this.toActSeat = this.firstToActPostflop();
    this.log(`— ${street} ${formatCards(this.board)} —`);
    this.skipAllInsAndMaybeClose();
  }

  private dealFlop(): void {
    this.burns.push(this.deal!.burn());
    this.board.push(this.deal!.next(), this.deal!.next(), this.deal!.next());
  }

  private dealTurn(): void {
    this.burns.push(this.deal!.burn());
    this.board.push(this.deal!.next());
  }

  private dealRiver(): void {
    this.burns.push(this.deal!.burn());
    this.board.push(this.deal!.next());
  }

  private showdown(): void {
    this.street = "showdown";
    this.toActSeat = null;
    const contribs: Contribution[] = this.occupied().map((p) => ({
      playerId: p.playerId,
      committed: p.handCommit,
      folded: p.folded,
    }));
    const returned = returnUncalled(contribs);
    for (const r of returned) {
      const s = this.occupied().find((p) => p.playerId === r.playerId)!;
      s.stack += r.amount;
      s.handCommit -= r.amount;
      this.log(`uncalled bet ${r.amount} returned to ${s.name}`);
    }
    const pots = buildPots(contribs);
    const awards: NonNullable<TableSnapshot["winners"]> = [];
    let totalRake = 0;
    const applyRake = !(this.config.noFlopNoRake && !this.flopSeen);

    for (const pot of pots) {
      const contenders = pot.eligible
        .map((id) => this.occupied().find((p) => p.playerId === id)!)
        .filter(Boolean);
      if (contenders.length === 0) continue;
      let scored = contenders.map((p) => ({
        p,
        value: evaluateHoldem(p.hole, this.board),
      }));
      const best = Math.max(...scored.map((s) => s.value));
      const winners = scored.filter((s) => s.value === best).map((s) => s.p);
      const winnerIds = winners.map((w) => w.playerId);
      let amount = pot.amount;
      if (applyRake) {
        const { net, rake } = takeRake(amount, this.config.rakePercent, this.config.rakeCap);
        amount = net;
        totalRake += rake;
      }
      for (const share of splitPot(amount, winnerIds)) {
        const w = this.occupied().find((p) => p.playerId === share.playerId)!;
        w.stack += share.amount;
        const desc = `${categoryName(evaluateHoldem(w.hole, this.board))} (${formatCards(w.hole)})`;
        awards.push({ playerId: w.playerId, amount: share.amount, hand: desc });
        this.log(`${w.name} wins ${share.amount} with ${desc}`);
      }
    }
    if (totalRake > 0) this.log(`rake ${totalRake}`);
    this.winners = awards;
    this.street = "payout";
    this.finishHand();
  }

  private awardUncontested(winner: Seat): void {
    this.street = "payout";
    this.toActSeat = null;
    const contribs: Contribution[] = this.occupied().map((p) => ({
      playerId: p.playerId,
      committed: p.handCommit,
      folded: p.folded,
    }));
    const returned = returnUncalled(contribs);
    for (const r of returned) {
      const s = this.occupied().find((p) => p.playerId === r.playerId)!;
      s.stack += r.amount;
      s.handCommit -= r.amount;
    }
    const pot = contribs.reduce((s, c) => s + c.committed, 0);
    const applyRake = !(this.config.noFlopNoRake && !this.flopSeen);
    let amount = pot;
    if (applyRake) {
      const r = takeRake(amount, this.config.rakePercent, this.config.rakeCap);
      amount = r.net;
      if (r.rake) this.log(`rake ${r.rake}`);
    }
    winner.stack += amount;
    this.winners = [{ playerId: winner.playerId, amount }];
    this.log(`${winner.name} wins ${amount} uncontested`);
    this.finishHand();
  }

  private finishHand(): void {
    if (this.deal) {
      const rev = this.deal.reveal();
      this.log(`seed revealed ${rev.seed.slice(0, 16)}…`);
    }
    this.street = "waiting";
    this.toActSeat = null;
    this.currentBet = 0;
    this.lastFullRaiseSize = this.config.bigBlind;
    for (const s of this.occupied()) {
      s.streetCommit = 0;
      s.handCommit = 0;
      s.folded = false;
      s.allIn = false;
      s.hole = [];
      s.actedThisRound = false;
    }
  }

  private postBlinds(): void {
    const liveSeats = this.liveSeatIndexes();
    if (liveSeats.length === 2) {
      const sb = this.buttonSeat!;
      const bb = this.nextLiveSeat(sb);
      this.post(sb, this.config.smallBlind, "SB");
      this.post(bb, this.config.bigBlind, "BB");
      return;
    }
    const sb = this.nextLiveSeat(this.buttonSeat!);
    const bb = this.nextLiveSeat(sb);
    this.post(sb, this.config.smallBlind, "SB");
    this.post(bb, this.config.bigBlind, "BB");
  }

  private post(seat: number, amount: number, label: string): void {
    const p = this.seats[seat]!;
    const put = Math.min(amount, p.stack);
    this.put(p, put);
    p.actedThisRound = false;
    this.log(`${p.name} posts ${label} ${put}${p.allIn ? " (all-in)" : ""}`);
  }

  private firstToActPreflop(): number {
    const live = this.liveSeatIndexes();
    if (live.length === 2) return this.buttonSeat!;
    const sb = this.nextLiveSeat(this.buttonSeat!);
    const bb = this.nextLiveSeat(sb);
    return this.nextLiveSeat(bb);
  }

  private firstToActPostflop(): number {
    return this.nextLiveSeat(this.buttonSeat!);
  }

  private nextActor(from: number): number {
    return this.nextLiveSeat(from);
  }

  private nextLiveSeat(from: number): number {
    for (let i = 1; i <= this.config.seats; i++) {
      const idx = (from + i) % this.config.seats;
      const p = this.seats[idx];
      if (p && !p.folded && !p.sittingOut) return idx;
    }
    throw new PokerError("no live seat");
  }

  private advanceButton(): void {
    if (this.buttonSeat === null) {
      this.buttonSeat = this.occupiedSeatIndexes()[0]!;
      return;
    }
    for (let i = 1; i <= this.config.seats; i++) {
      const idx = (this.buttonSeat + i) % this.config.seats;
      const p = this.seats[idx];
      if (p && !p.sittingOut && p.stack > 0) {
        this.buttonSeat = idx;
        return;
      }
    }
  }

  private dealOrder(): number[] {
    const start = this.buttonSeat!;
    const order: number[] = [];
    for (let i = 1; i <= this.config.seats; i++) {
      const idx = (start + i) % this.config.seats;
      const p = this.seats[idx];
      if (p && !p.folded) order.push(idx);
    }
    return order;
  }

  private live(): Seat[] {
    return this.occupied().filter((p) => !p.folded);
  }

  private liveSeatIndexes(): number[] {
    return this.occupiedSeatIndexes().filter((i) => {
      const p = this.seats[i]!;
      return !p.folded && !p.sittingOut;
    });
  }

  private occupied(): Seat[] {
    return this.seats.filter((s): s is Seat => s !== null);
  }

  private occupiedSeatIndexes(): number[] {
    const out: number[] = [];
    this.seats.forEach((s, i) => {
      if (s) out.push(i);
    });
    return out;
  }

  private findSeat(playerId: string): number {
    return this.seats.findIndex((s) => s?.playerId === playerId);
  }

  private requireSeat(playerId: string): number {
    const s = this.findSeat(playerId);
    if (s < 0) throw new PokerError("not seated");
    return s;
  }

  private assertIdle(): void {
    if (this.street !== "waiting") throw new PokerError("hand in progress");
  }

  private log(msg: string): void {
    this.events.push(msg);
  }
}

export function fixedDeal(cards: string): DealSource {
  const parsed = parseCards(cards);
  return {
    openHand(handId: string): HandDeal {
      const deck = [...parsed];
      let i = 0;
      const take = (): Card => {
        const c = deck[i++];
        if (!c) throw new PokerError("fixed deck exhausted");
        return c;
      };
      return {
        handId,
        commitment: "fixed",
        next: take,
        burn: take,
        reveal: () => ({ seed: "fixed", nonce: "fixed" }),
        deckOrder: () => [...parsed],
      };
    },
  };
}

export type { ActionType };
