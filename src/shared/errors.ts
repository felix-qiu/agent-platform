export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 500,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "AppError";
  }
}

export class RuntimeError extends AppError {
  constructor(code: string, message: string, options?: ErrorOptions) {
    super(code, message, 502, options);
    this.name = "RuntimeError";
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}
