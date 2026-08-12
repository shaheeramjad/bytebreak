export class ByteBreakError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(message: string, code: string, statusCode = 500, details?: unknown) {
    super(message);
    this.name = 'ByteBreakError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class NotFoundError extends ByteBreakError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} '${id}' not found` : `${resource} not found`,
      'NOT_FOUND',
      404,
    );
    this.name = 'NotFoundError';
  }
}

export class AuthError extends ByteBreakError {
  constructor(message = 'Authentication required') {
    super(message, 'AUTH_REQUIRED', 401);
    this.name = 'AuthError';
  }
}

export class ValidationError extends ByteBreakError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class DaemonError extends ByteBreakError {
  constructor(message: string, details?: unknown) {
    super(message, 'DAEMON_ERROR', 503, details);
    this.name = 'DaemonError';
  }
}

export class PluginError extends ByteBreakError {
  constructor(message: string, details?: unknown) {
    super(message, 'PLUGIN_ERROR', 500, details);
    this.name = 'PluginError';
  }
}

export class OfflineError extends ByteBreakError {
  constructor(message = 'Cloud unavailable — operating offline') {
    super(message, 'OFFLINE', 503);
    this.name = 'OfflineError';
  }
}
