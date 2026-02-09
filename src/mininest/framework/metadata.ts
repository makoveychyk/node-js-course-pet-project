export const MetadataKeys = {
  MODULE: Symbol('miniNest:module'),
  CONTROLLER: Symbol('miniNest:controller'),
  ROUTES: Symbol('miniNest:routes'),
  PARAMS: Symbol('miniNest:params'),
  PIPES: Symbol('miniNest:pipes'),
  PARAM_PIPES: Symbol('miniNest:paramPipes'),
  GUARDS: Symbol('miniNest:guards'),
  INTERCEPTORS: Symbol('miniNest:interceptors'),
  FILTERS: Symbol('miniNest:filters'),
  INJECT_TOKENS: Symbol('miniNest:injectTokens'),
  INJECTABLE: Symbol('miniNest:injectable'),
};

export type DecoratorTarget = object;

export function appendMetadata<T>(
  key: symbol,
  value: T,
  target: DecoratorTarget,
  propertyKey?: string | symbol,
) {
  if (propertyKey) {
    const existing: T[] = Reflect.getMetadata(key, target, propertyKey) ?? [];
    existing.push(value);
    Reflect.defineMetadata(key, existing, target, propertyKey);
    return;
  }

  const existing: T[] = Reflect.getMetadata(key, target) ?? [];
  existing.push(value);
  Reflect.defineMetadata(key, existing, target);
}

export function setMetadata<T>(
  key: symbol,
  value: T,
  target: DecoratorTarget,
  propertyKey?: string | symbol,
) {
  if (propertyKey) {
    Reflect.defineMetadata(key, value, target, propertyKey);
    return;
  }

  Reflect.defineMetadata(key, value, target);
}

export function getMetadata<T>(
  key: symbol,
  target: DecoratorTarget,
  propertyKey?: string | symbol,
): T | undefined {
  if (propertyKey) {
    return Reflect.getMetadata(key, target, propertyKey);
  }
  return Reflect.getMetadata(key, target);
}
