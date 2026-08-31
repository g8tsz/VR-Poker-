export class TournamentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TournamentError";
  }
}
