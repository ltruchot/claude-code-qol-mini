// Expected failure: message for the user, exit code for the shell
export class KitError extends Error {
  public readonly code: number;

  public constructor(message: string, code = 1) {
    super(message);
    this.name = "KitError";
    this.code = code;
  }
}

export function isKitError(error: unknown): error is KitError {
  return error instanceof KitError;
}

export const CANCELLED = 130;
