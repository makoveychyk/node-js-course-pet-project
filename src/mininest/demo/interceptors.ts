import { Injectable } from '../framework/decorators.ts';
import { Interceptor, ExecutionContext } from '../framework/types.ts';

@Injectable()
export class TimingInterceptor implements Interceptor {
  async intercept(context: ExecutionContext, next: () => Promise<any>) {
    const startedAt = Date.now();
    const result = await next();
    const duration = Date.now() - startedAt;
    context.res.setHeader('x-response-time', `${duration}ms`);
    return {
      data: result,
      meta: {
        durationMs: duration,
        controller: context.controller.constructor.name,
        handler: context.handlerName,
      },
    };
  }
}
