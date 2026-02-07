import { ExceptionFilter, ExecutionContext } from '../framework/types.ts';
import { HttpException, InternalServerError } from '../framework/exceptions.ts';
import { Injectable } from '../framework/decorators.ts';

@Injectable()
export class JsonErrorFilter implements ExceptionFilter {
  catch(error: unknown, context: ExecutionContext): boolean {
    const res = context.res;
    if (res.headersSent) {
      return true;
    }

    if (error instanceof HttpException) {
      res.statusCode = error.status;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: {
            status: error.status,
            message: error.message,
            details: error.details,
          },
        }),
      );
      return true;
    }

    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: {
          status: 500,
          message: new InternalServerError().message,
        },
      }),
    );
    return true;
  }
}
