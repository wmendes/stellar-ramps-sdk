export class AnchorError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode = 500) {
    super(message);
    this.name = 'AnchorError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class ValidationError extends AnchorError {
  constructor(message: string, code = 'VALIDATION_ERROR', statusCode = 400) {
    super(message, code, statusCode);
    this.name = 'ValidationError';
  }
}

export class AuthError extends AnchorError {
  constructor(message: string, code = 'AUTH_ERROR', statusCode = 401) {
    super(message, code, statusCode);
    this.name = 'AuthError';
  }
}

export class NetworkError extends AnchorError {
  retryable: boolean;

  constructor(message: string, code = 'NETWORK_ERROR', statusCode = 502, retryable = true) {
    super(message, code, statusCode);
    this.name = 'NetworkError';
    this.retryable = retryable;
  }
}
