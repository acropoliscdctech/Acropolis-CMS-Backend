class ApiError extends Error {
  statusCode: number;
  message: string;
  errors: any[];
  success: boolean;

  constructor(
    statusCode: number,
    message: string,
    errors = [],
    stack?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.errors = errors;
    this.success = false;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default ApiError;
