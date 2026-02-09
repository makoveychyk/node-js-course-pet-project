import { MetadataKeys } from './metadata.ts';
import { Constructor, Provider, ProviderInput, Token } from './types.ts';

interface ProviderStore extends Provider {
  instance?: any;
}

export class Container {
  private readonly providers = new Map<Token, ProviderStore>();

  constructor(private readonly parent?: Container) {}

  register(input: ProviderInput) {
    const provider = this.normalizeProvider(input);
    if (this.providers.has(provider.provide)) {
      return;
    }

    this.providers.set(provider.provide, provider);
  }

  registerProxy(token: Token, target: Container) {
    if (this.providers.has(token)) {
      return;
    }

    this.providers.set(token, {
      provide: token,
      scope: 'singleton',
      useFactory: () => target.resolve(token),
    });
  }

  resolve<T = any>(token: Token<T>): T {
    if (this.providers.has(token)) {
      return this.instantiateProvider(this.providers.get(token)!);
    }

    if (this.parent) {
      return this.parent.resolve(token);
    }

    if (typeof token === 'function') {
      const provider: ProviderStore = {
        provide: token,
        useClass: token as Constructor,
        scope: 'transient',
      };
      return this.instantiateProvider(provider);
    }

    throw new Error(`Unknown provider for token: ${String(token)}`);
  }

  private instantiateProvider(provider: ProviderStore) {
    if (provider.scope !== 'transient' && provider.instance) {
      return provider.instance;
    }

    if (provider.useValue !== undefined) {
      provider.instance = provider.useValue;
      return provider.instance;
    }

    if (provider.useFactory) {
      const deps = (provider.inject ?? []).map((token) => this.resolve(token));
      const value = provider.useFactory(...deps);
      if (provider.scope !== 'transient') {
        provider.instance = value;
      }
      return value;
    }

    if (provider.useClass) {
      const value = this.instantiateClass(provider.useClass as Constructor);
      if (provider.scope !== 'transient') {
        provider.instance = value;
      }
      return value;
    }

    throw new Error(`Invalid provider for token: ${String(provider.provide)}`);
  }

  private instantiateClass<T>(target: Constructor<T>): T {
    const paramTypes = Reflect.getMetadata('design:paramtypes', target) || [];
    const injectTokens: Map<number, Token> =
      Reflect.getMetadata(MetadataKeys.INJECT_TOKENS, target) ?? new Map();

    const deps = paramTypes.map((type: Constructor, index: number) => {
      const explicitToken = injectTokens.get(index);
      const token = explicitToken ?? type;
      return this.resolve(token);
    });

    return new target(...deps);
  }

  private normalizeProvider(input: ProviderInput): ProviderStore {
    if (typeof input === 'function') {
      const injectableOptions =
        Reflect.getMetadata(MetadataKeys.INJECTABLE, input) ?? {};
      const token = injectableOptions.token ?? input;
      return {
        provide: token,
        useClass: input,
        scope: 'singleton',
      };
    }

    const provider: ProviderStore = {
      scope: input.scope ?? 'singleton',
      ...input,
    };

    if (typeof provider.provide === 'function') {
      const injectableOptions =
        Reflect.getMetadata(MetadataKeys.INJECTABLE, provider.provide) ?? {};
      if (injectableOptions.token) {
        provider.provide = injectableOptions.token;
      }
    }

    return provider;
  }
}
