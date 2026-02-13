import { createServer, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { Container } from './container.ts';
import { MetadataKeys } from './metadata.ts';
import {
  collectControllers,
  ControllerRef,
  ModuleBuilder,
  ModuleRef,
} from './module-builder.ts';
import {
  ExecutionContext,
  FilterToken,
  GuardToken,
  InterceptorToken,
  ParamMetadata,
  PipeContext,
  PipeToken,
  PipeTransform,
  PipeFunction,
  Constructor,
  RouteDefinition,
} from './types.ts';
import {
  HttpException,
  InternalServerError,
  ForbiddenError,
} from './exceptions.ts';

interface CompiledRoute extends RouteDefinition {
  regex: RegExp;
  keys: string[];
  handlerName: string;
  propertyKey: string | symbol;
  controllerRef: ControllerRef;
  controllerInstance: any;
  controllerPipes: PipeToken[];
  methodPipes: PipeToken[];
  paramMetadata: Map<number, ParamMetadata>;
  paramPipes: Map<number, PipeToken[]>;
  paramTypes: any[];
  controllerGuards: GuardToken[];
  methodGuards: GuardToken[];
  controllerInterceptors: InterceptorToken[];
  methodInterceptors: InterceptorToken[];
  controllerFilters: FilterToken[];
  methodFilters: FilterToken[];
}

const isPipeConstructor = (
  pipe: PipeToken,
): pipe is Constructor<PipeTransform> =>
  typeof pipe === 'function' &&
  Boolean(pipe.prototype) &&
  typeof pipe.prototype.transform === 'function';

const isPipeFunction = (pipe: PipeToken): pipe is PipeFunction =>
  typeof pipe === 'function' &&
  (!pipe.prototype || typeof pipe.prototype.transform !== 'function');

const isPipeInstance = (pipe: PipeToken): pipe is PipeTransform =>
  typeof pipe === 'object' &&
  pipe !== null &&
  typeof pipe.transform === 'function';

export class MiniNestApplication {
  private server = createServer(this.handleRequest.bind(this));
  private readonly routes: CompiledRoute[] = [];
  private readonly controllerInstances = new Map<ControllerRef, any>();
  private readonly globalPipes: PipeToken[] = [];
  private readonly globalGuards: GuardToken[] = [];
  private readonly globalInterceptors: InterceptorToken[] = [];
  private readonly globalFilters: FilterToken[] = [];

  constructor(
    private readonly rootModule: ModuleRef,
    private readonly rootContainer: Container,
  ) {
    this.initializeRoutes();
  }

  useGlobalPipes(...pipes: PipeToken[]) {
    this.globalPipes.push(...pipes);
  }

  useGlobalGuards(...guards: GuardToken[]) {
    this.globalGuards.push(...guards);
  }

  useGlobalInterceptors(...interceptors: InterceptorToken[]) {
    this.globalInterceptors.push(...interceptors);
  }

  useGlobalFilters(...filters: FilterToken[]) {
    this.globalFilters.push(...filters);
  }

  async listen(port: number) {
    return new Promise<void>((resolve) => {
      this.server.listen(port, () => resolve());
    });
  }

  async close() {
    return new Promise<void>((resolve, reject) => {
      this.server.close((err) => (err ? reject(err) : resolve()));
    });
  }

  private initializeRoutes() {
    const controllers = collectControllers(this.rootModule);
    controllers.forEach((controllerRef) => {
      const controllerInstance = controllerRef.container.resolve(
        controllerRef.metatype,
      );
      this.controllerInstances.set(controllerRef, controllerInstance);

      const controllerMeta =
        Reflect.getMetadata(MetadataKeys.CONTROLLER, controllerRef.metatype) ??
        {};
      const prefix = formatPath(controllerMeta.prefix ?? '');
      const routes = (Reflect.getMetadata(
        MetadataKeys.ROUTES,
        controllerRef.metatype,
      ) ?? []) as RouteDefinition[];
      const controllerPipes =
        Reflect.getMetadata(MetadataKeys.PIPES, controllerRef.metatype) ?? [];
      const controllerGuards =
        Reflect.getMetadata(MetadataKeys.GUARDS, controllerRef.metatype) ?? [];
      const controllerInterceptors =
        Reflect.getMetadata(
          MetadataKeys.INTERCEPTORS,
          controllerRef.metatype,
        ) ?? [];
      const controllerFilters =
        Reflect.getMetadata(MetadataKeys.FILTERS, controllerRef.metatype) ?? [];

      routes.forEach((routeMeta) => {
        const fullPath = formatPath(`${prefix}/${routeMeta.path ?? ''}`);
        const compiledPath = compilePath(fullPath);
        const proto = controllerRef.metatype.prototype;
        const paramMetadataList: ParamMetadata[] =
          Reflect.getMetadata(
            MetadataKeys.PARAMS,
            proto,
            routeMeta.propertyKey,
          ) ?? [];
        const paramMetadata = new Map<number, ParamMetadata>();
        paramMetadataList.forEach((meta) =>
          paramMetadata.set(meta.index, meta),
        );
        const paramPipes =
          Reflect.getMetadata(
            MetadataKeys.PARAM_PIPES,
            proto,
            routeMeta.propertyKey,
          ) ?? new Map();
        const paramTypes =
          Reflect.getMetadata(
            'design:paramtypes',
            proto,
            routeMeta.propertyKey,
          ) ?? [];
        const methodPipes =
          Reflect.getMetadata(
            MetadataKeys.PIPES,
            proto,
            routeMeta.propertyKey,
          ) ?? [];
        const methodGuards =
          Reflect.getMetadata(
            MetadataKeys.GUARDS,
            proto,
            routeMeta.propertyKey,
          ) ?? [];
        const methodInterceptors =
          Reflect.getMetadata(
            MetadataKeys.INTERCEPTORS,
            proto,
            routeMeta.propertyKey,
          ) ?? [];
        const methodFilters =
          Reflect.getMetadata(
            MetadataKeys.FILTERS,
            proto,
            routeMeta.propertyKey,
          ) ?? [];

        this.routes.push({
          method: routeMeta.method,
          path: fullPath || '/',
          regex: compiledPath.regex,
          keys: compiledPath.keys,
          handlerName: String(routeMeta.propertyKey),
          propertyKey: routeMeta.propertyKey,
          controller: controllerRef.metatype,
          controllerRef,
          controllerInstance,
          controllerPipes,
          methodPipes,
          paramMetadata,
          paramPipes,
          paramTypes,
          controllerGuards,
          methodGuards,
          controllerInterceptors,
          methodInterceptors,
          controllerFilters,
          methodFilters,
        });
      });
    });
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse) {
    const method = (req.method ?? 'GET').toUpperCase();
    const url = req.url ?? '/';
    const parsedUrl = new URL(url, 'http://localhost');
    const pathname = parsedUrl.pathname;
    const route = this.matchRoute(method, pathname);
    if (!route) {
      if (pathname === '/' || pathname === '') {
        this.reply(res, { statusCode: 200, body: { message: 'Hello World!' } });
        return;
      }
      this.reply(res, {
        statusCode: 404,
        body: { message: 'Route not found' },
      });
      return;
    }

    const params = this.extractParams(route, pathname);
    const query = Object.fromEntries(parsedUrl.searchParams.entries());
    const body = await parseBody(req);
    const context: ExecutionContext = {
      req,
      res,
      params,
      query,
      body,
      handlerName: route.handlerName,
      controller: route.controllerInstance,
      container: route.controllerRef.container,
      route,
    };

    try {
      const args = await this.resolveArguments(route, context);
      await this.runGuards(route, context);
      const result = await this.runInterceptors(route, context, () =>
        route.controllerInstance[route.propertyKey](...args),
      );
      if (result !== undefined) {
        this.reply(res, { statusCode: 200, body: result });
      }
    } catch (error) {
      await this.handleError(error, route, context);
    }
  }

  private matchRoute(method: string, path: string) {
    return this.routes.find(
      (route) => route.method === method && route.regex.test(path),
    );
  }

  private extractParams(route: CompiledRoute, path: string) {
    const match = route.regex.exec(path);
    const params: Record<string, string> = {};
    if (!match) {
      return params;
    }
    route.keys.forEach((key, index) => {
      params[key] = match[index + 1];
    });
    return params;
  }

  private async resolveArguments(
    route: CompiledRoute,
    context: ExecutionContext,
  ) {
    const args: any[] = [];
    const maxIndex = route.paramTypes.length;
    for (let index = 0; index < maxIndex; index += 1) {
      const meta = route.paramMetadata.get(index);
      if (!meta) {
        args[index] = undefined;
        continue;
      }

      const pipeContext: PipeContext = {
        type: meta.type,
        data: meta.data,
        metatype: route.paramTypes[index],
      };
      const value = this.extractArgumentValue(meta, context);
      const transformed = await this.applyPipes(
        [...this.globalPipes, ...route.controllerPipes, ...route.methodPipes],
        value,
        pipeContext,
        route.controllerRef.container,
      );
      const paramSpecific = await this.applyPipes(
        route.paramPipes.get(index) ?? [],
        transformed,
        pipeContext,
        route.controllerRef.container,
      );

      args[index] = paramSpecific;
    }
    return args;
  }

  private extractArgumentValue(meta: ParamMetadata, context: ExecutionContext) {
    const source =
      meta.type === 'param'
        ? context.params
        : meta.type === 'query'
          ? context.query
          : context.body;
    if (!meta.data) {
      return source;
    }
    return source?.[meta.data];
  }

  private async runGuards(route: CompiledRoute, context: ExecutionContext) {
    const guards = [
      ...this.globalGuards,
      ...route.controllerGuards,
      ...route.methodGuards,
    ];
    for (const guard of guards) {
      const instance = this.resolveGuard(guard, route.controllerRef.container);
      const result =
        typeof instance === 'function'
          ? await instance(context)
          : await instance.canActivate(context);
      if (!result) {
        throw new ForbiddenError();
      }
    }
  }

  private async runInterceptors(
    route: CompiledRoute,
    context: ExecutionContext,
    handler: () => Promise<any> | any,
  ) {
    const interceptors = [
      ...this.globalInterceptors,
      ...route.controllerInterceptors,
      ...route.methodInterceptors,
    ];

    const dispatch = (index: number): Promise<any> => {
      if (index === interceptors.length) {
        return Promise.resolve(handler());
      }

      const interceptor = this.resolveInterceptor(
        interceptors[index],
        route.controllerRef.container,
      );
      if (typeof interceptor === 'function') {
        return Promise.resolve(interceptor(context, () => dispatch(index + 1)));
      }
      return interceptor.intercept(context, () => dispatch(index + 1));
    };

    return dispatch(0);
  }

  private async applyPipes(
    pipes: PipeToken[],
    value: any,
    metadata: PipeContext,
    container: Container,
  ) {
    let current = value;
    for (const pipe of pipes) {
      if (isPipeConstructor(pipe)) {
        const instance = container.resolve(pipe);
        current = await instance.transform(current, metadata);
        continue;
      }
      if (isPipeFunction(pipe)) {
        current = await pipe(current, metadata);
        continue;
      }
      if (isPipeInstance(pipe)) {
        current = await pipe.transform(current, metadata);
      }
    }
    return current;
  }

  private resolveGuard(guard: GuardToken, container: Container) {
    if (
      typeof guard === 'function' &&
      guard.prototype &&
      guard.prototype.canActivate
    ) {
      return container.resolve(guard as any);
    }
    return guard;
  }

  private resolveInterceptor(
    interceptor: InterceptorToken,
    container: Container,
  ) {
    if (
      typeof interceptor === 'function' &&
      interceptor.prototype &&
      interceptor.prototype.intercept
    ) {
      return container.resolve(interceptor as any);
    }
    return interceptor;
  }

  private async handleError(
    error: unknown,
    route: CompiledRoute,
    context: ExecutionContext,
  ) {
    const filters = [
      ...this.globalFilters,
      ...route.controllerFilters,
      ...route.methodFilters,
    ];

    for (const filter of filters) {
      const handled = await this.invokeFilter(
        filter,
        error,
        context,
        route.controllerRef.container,
      );
      if (handled) {
        return;
      }
    }

    if (error instanceof HttpException) {
      this.reply(context.res, {
        statusCode: error.status,
        body: { message: error.message, details: error.details },
      });
      return;
    }

    console.error('Unhandled error', error);
    this.reply(context.res, {
      statusCode: 500,
      body: { message: new InternalServerError().message },
    });
  }

  private async invokeFilter(
    filter: FilterToken,
    error: unknown,
    context: ExecutionContext,
    container: Container,
  ) {
    let instance: any = filter;
    if (
      typeof filter === 'function' &&
      filter.prototype &&
      filter.prototype.catch
    ) {
      instance = container.resolve(filter as any);
    }

    if (typeof instance === 'function') {
      return instance(error, context);
    }

    if ('catch' in instance) {
      return instance.catch(error, context);
    }

    return false;
  }

  private reply(
    res: ServerResponse,
    response: { statusCode: number; body: any },
  ) {
    if (res.writableEnded) {
      return;
    }
    res.statusCode = response.statusCode;
    res.setHeader('Content-Type', 'application/json');
    const payload =
      response.body === undefined ? '{}' : JSON.stringify(response.body);
    res.end(payload);
  }
}

export class NestFactory {
  static async create(moduleClass: Constructor): Promise<MiniNestApplication> {
    const rootContainer = new Container();
    const builder = new ModuleBuilder(rootContainer);
    const rootModule = builder.build(moduleClass);
    return new MiniNestApplication(rootModule, rootContainer);
  }
}

async function parseBody(req: IncomingMessage) {
  return new Promise<any>((resolve, reject) => {
    if (req.method === 'GET' || req.method === 'DELETE') {
      return resolve(undefined);
    }

    const chunks: Buffer[] = [];
    req
      .on('data', (chunk) => chunks.push(chunk))
      .on('end', () => {
        if (!chunks.length) {
          return resolve(undefined);
        }
        try {
          const payload = Buffer.concat(chunks).toString();
          resolve(payload ? JSON.parse(payload) : undefined);
        } catch (error) {
          reject(new BadRequestDuringParsing(error as Error));
        }
      })
      .on('error', (err) => reject(err));
  }).catch((err) => {
    if (err instanceof BadRequestDuringParsing) {
      throw new HttpException(400, 'Invalid JSON body');
    }
    throw err;
  });
}

class BadRequestDuringParsing extends Error {
  constructor(original: Error) {
    super(original.message);
  }
}

function formatPath(path: string) {
  if (!path) {
    return '';
  }
  return path.split('/').filter(Boolean).join('/');
}

function compilePath(path: string) {
  const normalized = `/${formatPath(path)}`.replace(/\/+/g, '/');
  const keys: string[] = [];
  const segments = normalized.split('/').filter((segment) => segment.length);
  const pattern = segments
    .map((segment) => {
      if (segment.startsWith(':')) {
        keys.push(segment.slice(1));
        return '([^/]+)';
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  const regexPattern = pattern ? `^/${pattern}/?$` : '^/?$';
  const regex = new RegExp(regexPattern);
  return { regex, keys };
}
