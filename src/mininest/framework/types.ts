import 'reflect-metadata';
import { IncomingMessage, ServerResponse } from 'http';

export type Constructor<T = any> = new (...args: any[]) => T;
export type Token<T = any> = Constructor<T> | string | symbol;

export interface Provider<T = any> {
  provide: Token<T>;
  useClass?: Constructor<T>;
  useValue?: T;
  useFactory?: (...args: any[]) => T;
  inject?: Token[];
  scope?: 'singleton' | 'transient';
}

export type ProviderInput<T = any> = Constructor<T> | Provider<T>;

export interface InjectableOptions {
  token?: Token;
}

export interface ModuleMetadata {
  providers?: ProviderInput[];
  controllers?: Constructor[];
  imports?: Constructor[];
  exports?: Token[];
}

export interface PipeTransform {
  transform(value: any, metadata: PipeContext): any | Promise<any>;
}

export interface PipeContext {
  type: 'param' | 'query' | 'body';
  data?: string;
  metatype?: Constructor;
}

export type PipeToken = PipeTransform | Constructor<PipeTransform> | PipeFunction;
export type PipeFunction = (value: any, metadata: PipeContext) => any | Promise<any>;

export interface Guard {
  canActivate(context: ExecutionContext): boolean | Promise<boolean>;
}

export type GuardToken =
  | Guard
  | Constructor<Guard>
  | ((context: ExecutionContext) => boolean | Promise<boolean>);

export interface Interceptor {
  intercept(context: ExecutionContext, next: () => Promise<any>): Promise<any>;
}

export type InterceptorToken =
  | Interceptor
  | Constructor<Interceptor>
  | ((context: ExecutionContext, next: () => Promise<any>) => Promise<any>);

export interface ExceptionFilter {
  catch(error: unknown, context: ExecutionContext): Promise<boolean> | boolean;
}

export type FilterToken =
  | ExceptionFilter
  | Constructor<ExceptionFilter>
  | ((error: unknown, context: ExecutionContext) => Promise<boolean> | boolean);

export interface ExecutionContext {
  req: IncomingMessage;
  res: ServerResponse;
  params: Record<string, any>;
  query: Record<string, any>;
  body: any;
  handlerName: string;
  controller: any;
  container: import('./container.ts').Container;
  route: RouteDefinition;
}

export interface RouteDefinition {
  method: string;
  path: string;
  propertyKey: string | symbol;
  controller: Constructor;
}

export type ParamDecoratorType = 'param' | 'query' | 'body';

export interface ParamMetadata {
  type: ParamDecoratorType;
  index: number;
  propertyKey: string | symbol;
  data?: string;
  pipes?: PipeToken[];
}
