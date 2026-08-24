import { TournamentError } from "./errors.ts";

export { TournamentError };

export interface ScheduledTournament {
  id: string;
  startsAt: string;
  start: () => void;
}

/**
 * Polls for tournaments whose startsAt has passed and calls start().
 * In production, replace with cron / job queue; same contract.
 */
export class TournamentScheduler {
  private readonly jobs = new Map<string, ScheduledTournament>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly pollMs: number;

  constructor(pollMs = 5_000) {
    this.pollMs = pollMs;
  }

  schedule(job: ScheduledTournament): void {
    this.jobs.set(job.id, job);
    this.ensureRunning();
  }

  unschedule(id: string): void {
    this.jobs.delete(id);
  }

  tick(now = Date.now()): string[] {
    const fired: string[] = [];
    for (const job of this.jobs.values()) {
      if (new Date(job.startsAt).getTime() <= now) {
        job.start();
        this.jobs.delete(job.id);
        fired.push(job.id);
      }
    }
    return fired;
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private ensureRunning(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), this.pollMs);
  }
}
