import { Injectable } from '../framework/decorators.ts';
import { Guard, ExecutionContext } from '../framework/types.ts';
import { ForbiddenError } from '../framework/exceptions.ts';

const EXPECTED_API_KEY = process.env.API_KEY;

@Injectable()
export class ApiKeyGuard implements Guard {
  canActivate(context: ExecutionContext): boolean {
    const header = context.req.headers['x-api-key'];
    if (header !== EXPECTED_API_KEY) {
      throw new ForbiddenError('Missing or invalid x-api-key header');
    }
    return true;
  }
}
