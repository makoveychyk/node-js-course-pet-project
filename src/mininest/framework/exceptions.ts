export class HttpException extends Error {
  constructor(
    public readonly status: number,
    public readonly message: string,
    public readonly details?: any,
  ) {
    super(message);
  }
}

export class BadRequestError extends HttpException {
  constructor(message = 'Bad Request', details?: any) {
    super(400, message, details);
  }
}

export class ForbiddenError extends HttpException {
  constructor(message = 'Forbidden') {
    super(403, message);
  }
}

export class NotFoundError extends HttpException {
  constructor(message = 'Not Found') {
    super(404, message);
  }
}

export class InternalServerError extends HttpException {
  constructor(message = 'Internal Server Error') {
    super(500, message);
  }
}
