export class CosmeticsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CosmeticsError";
  }
}
