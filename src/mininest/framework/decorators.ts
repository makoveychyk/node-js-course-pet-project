import { MetadataKeys } from './metadata.ts';
import {
  ExceptionFilter,
  FilterToken,
  GuardToken,
  InjectableOptions,
  ModuleMetadata,
  ParamMetadata,
  PipeToken,
} from './types.ts';
import type { Guard, InterceptorToken } from './types.ts';
import type { Constructor } from './types.ts';
import type { Token } from './types.ts';

export function Injectable(options?: InjectableOptions): ClassDecorator {
  return (target: object) => {
    Reflect.defineMetadata(MetadataKeys.INJECTABLE, options ?? {}, target);
  };
}

export function Inject(token?: Token): ParameterDecorator {
  return (target, _propertyKey, parameterIndex) => {
    const existing: Map<number, Token> =
      Reflect.getMetadata(MetadataKeys.INJECT_TOKENS, target) ?? new Map();
    existing.set(parameterIndex, token ?? Reflect.getMetadata('design:paramtypes', target)[parameterIndex]);
    Reflect.defineMetadata(MetadataKeys.INJECT_TOKENS, existing, target);
  };
}

export function Module(metadata: ModuleMetadata): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(MetadataKeys.MODULE, metadata, target);
  };
}

export function Controller(prefix = ''): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(MetadataKeys.CONTROLLER, { prefix }, target);
  };
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

function createRouteDecorator(method: HttpMethod) {
  return (path = ''): MethodDecorator => {
    return (target, propertyKey) => {
      const routes =
        (Reflect.getMetadata(MetadataKeys.ROUTES, target.constructor) ?? []) as any[];
      routes.push({ method, path, propertyKey });
      Reflect.defineMetadata(MetadataKeys.ROUTES, routes, target.constructor);
    };
  };
}

export const Get = createRouteDecorator('GET');
export const Post = createRouteDecorator('POST');
export const Put = createRouteDecorator('PUT');
export const Patch = createRouteDecorator('PATCH');
export const Delete = createRouteDecorator('DELETE');

function pushClassOrMethodMetadata<T>(
  key: symbol,
  value: T[],
  target: object,
  propertyKey?: string | symbol,
) {
  if (propertyKey) {
    const existing: T[] = Reflect.getMetadata(key, target, propertyKey) ?? [];
    Reflect.defineMetadata(key, [...existing, ...value], target, propertyKey);
    return;
  }

  const existing: T[] = Reflect.getMetadata(key, target) ?? [];
  Reflect.defineMetadata(key, [...existing, ...value], target);
}

function pushParamMetadata<T>(
  key: symbol,
  value: T[],
  target: object,
  propertyKey: string | symbol,
  index: number,
) {
  const existing: Map<number, T[]> =
    Reflect.getMetadata(key, target, propertyKey) ?? new Map();
  const arr = existing.get(index) ?? [];
  existing.set(index, [...arr, ...value]);
  Reflect.defineMetadata(key, existing, target, propertyKey);
}

export function UsePipe(...pipes: PipeToken[]) {
  return (
    target: object,
    propertyKey?: string | symbol,
    descriptorOrIndex?: number | TypedPropertyDescriptor<unknown>,
  ) => {
    if (typeof descriptorOrIndex === 'number' && propertyKey) {
      pushParamMetadata(
        MetadataKeys.PARAM_PIPES,
        pipes,
        target,
        propertyKey,
        descriptorOrIndex,
      );
      return;
    }
    pushClassOrMethodMetadata(
      MetadataKeys.PIPES,
      pipes,
      target,
      propertyKey as string | symbol | undefined,
    );
  };
}

export function UseGuard(...guards: GuardToken[]) {
  return (target: object, propertyKey?: string | symbol) => {
    pushClassOrMethodMetadata(
      MetadataKeys.GUARDS,
      guards,
      target,
      propertyKey as string | symbol | undefined,
    );
  };
}

export function UseInterceptor(...interceptors: InterceptorToken[]) {
  return (target: object, propertyKey?: string | symbol) => {
    pushClassOrMethodMetadata(
      MetadataKeys.INTERCEPTORS,
      interceptors,
      target,
      propertyKey as string | symbol | undefined,
    );
  };
}

export function UseFilter(...filters: FilterToken[]) {
  return (target: object, propertyKey?: string | symbol) => {
    pushClassOrMethodMetadata(
      MetadataKeys.FILTERS,
      filters,
      target,
      propertyKey as string | symbol | undefined,
    );
  };
}

type ParamDecoratorFactory = (
  data?: string,
  ...pipes: PipeToken[]
) => ParameterDecorator;

function createParamDecorator(type: ParamMetadata['type']): ParamDecoratorFactory {
  return (data?: string, ...pipes: PipeToken[]) => {
    return (target, propertyKey, parameterIndex) => {
      const params: ParamMetadata[] =
        Reflect.getMetadata(MetadataKeys.PARAMS, target, propertyKey!) ?? [];
      params.push({
        type,
        data,
        index: parameterIndex,
        propertyKey: propertyKey!,
        pipes,
      });
      Reflect.defineMetadata(MetadataKeys.PARAMS, params, target, propertyKey!);

      if (pipes.length) {
        pushParamMetadata(
          MetadataKeys.PARAM_PIPES,
          pipes,
          target,
          propertyKey!,
          parameterIndex,
        );
      }
    };
  };
}

export const Param = createParamDecorator('param');
export const Query = createParamDecorator('query');
export const Body = createParamDecorator('body');
