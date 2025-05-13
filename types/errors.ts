export class SearchError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number = 500
  ) {
    super(message);
    this.name = 'SearchError';
  }
}

export class PDFProcessingError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number = 500
  ) {
    super(message);
    this.name = 'PDFProcessingError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public code: string = 'VALIDATION_ERROR',
    public status: number = 400
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class DatabaseError extends Error {
  constructor(
    message: string,
    public code: string = 'DATABASE_ERROR',
    public status: number = 500
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export const ErrorCodes = {
  SEARCH: {
    INVALID_QUERY: 'INVALID_QUERY',
    API_ERROR: 'API_ERROR',
    RATE_LIMIT: 'RATE_LIMIT'
  },
  PDF: {
    DOWNLOAD_FAILED: 'DOWNLOAD_FAILED',
    PARSE_FAILED: 'PARSE_FAILED',
    PROCESSING_FAILED: 'PROCESSING_FAILED'
  },
  DATABASE: {
    CONNECTION_FAILED: 'CONNECTION_FAILED',
    QUERY_FAILED: 'QUERY_FAILED',
    INSERT_FAILED: 'INSERT_FAILED'
  }
} as const; 