// Expected failures (bad input, missing row). Routes and MCP tools turn these
// into client-facing messages; anything else is an internal error.
export class ServiceError extends Error {
  constructor(public status: 400 | 404, message: string) {
    super(message);
  }
}
